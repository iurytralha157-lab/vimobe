import { useState, useDeferredValue, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { LeadDetailDialog } from '@/components/leads/LeadDetailDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  MoreHorizontal, 
  Phone, 
  Mail, 
  ExternalLink,
  Users,
  UserCircle,
  Calendar,
  X,
  Download,
  Upload,
  ChevronDown,
  MessageCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Tags,
  CheckSquare,
  Square,
  Trophy,
  XCircle,
  CircleDot,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useIsMobile } from '@/hooks/use-mobile';
import { ContactCard } from '@/components/contacts/ContactCard';
import { MobileFilters } from '@/components/contacts/MobileFilters';
import { usePipelines, useStages } from '@/hooks/use-stages';
import { useOrganizationUsers } from '@/hooks/use-users';
import { useTags } from '@/hooks/use-tags';
import { format, formatDistanceToNow, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ImportContactsDialog } from '@/components/contacts/ImportContactsDialog';
import { TableSkeleton } from '@/components/contacts/TableSkeleton';
import { EmptyState } from '@/components/contacts/EmptyState';
import { useContactsList, type ContactListFilters } from '@/hooks/use-contacts-list';
import { exportContacts } from '@/lib/export-contacts';
import { useLeads, useLead, useDeleteLead } from '@/hooks/use-leads';
import { DateFilterPopover } from '@/components/ui/date-filter-popover';
import { DatePreset, getDateRangeFromPreset } from '@/hooks/use-dashboard-filters';

export default function Contacts() {
  const isMobile = useIsMobile();
  // Filter states
  const [search, setSearch] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('last30days');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [pageInputValue, setPageInputValue] = useState('1');
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Pagination & Sort states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [sortBy, setSortBy] = useState<ContactListFilters['sortBy']>('created_at');
  const [sortDir, setSortDir] = useState<ContactListFilters['sortDir']>('desc');
  
  const PAGE_SIZE_OPTIONS = [5, 10, 30, 50, 100];

  // Debounce search
  const deferredSearch = useDeferredValue(search);

  // Calculate date range from preset or custom range
  const dateRange = useMemo(() => {
    if (customDateRange) return customDateRange;
    return getDateRangeFromPreset(datePreset);
  }, [datePreset, customDateRange]);

  // Build filters
  const filters: ContactListFilters = {
    search: deferredSearch || undefined,
    pipelineId: selectedPipeline !== 'all' ? selectedPipeline : undefined,
    stageId: selectedStage !== 'all' ? selectedStage : undefined,
    assigneeId: selectedAssignee !== 'all' && selectedAssignee !== 'unassigned' ? selectedAssignee : undefined,
    unassigned: selectedAssignee === 'unassigned',
    tagId: selectedTag !== 'all' ? selectedTag : undefined,
    source: selectedSource !== 'all' ? selectedSource : undefined,
    createdFrom: dateRange ? format(dateRange.from, "yyyy-MM-dd'T'HH:mm:ss") : undefined,
    createdTo: dateRange ? format(dateRange.to, "yyyy-MM-dd'T'HH:mm:ss") : undefined,
    sortBy,
    sortDir,
    page,
    limit: pageSize,
  };

  // Fetch data
  const { data: contacts = [], isLoading, isFetching } = useContactsList(filters);
  const { data: pipelines = [] } = usePipelines();
  const { data: stages = [] } = useStages(selectedPipeline !== 'all' ? selectedPipeline : undefined);
  const { data: users = [] } = useOrganizationUsers();
  const { data: tags = [] } = useTags();
  
  // For export, we need all leads (old hook) - only fetch when exporting
  const { data: allLeads = [] } = useLeads();
  
  // Fetch selected lead for detail dialog
  const { data: selectedLead } = useLead(selectedContactId);
  const deleteLead = useDeleteLead();

  const totalCount = contacts[0]?.total_count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const sourceLabels: Record<string, string> = {
    manual: 'Manual',
    meta: 'Meta Ads',
    site: 'Site',
    wordpress: 'WordPress',
  };

  const dealStatusConfig = {
    open: { label: 'Aberto', icon: CircleDot, className: 'bg-muted text-muted-foreground' },
    won: { label: 'Ganho', icon: Trophy, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
    lost: { label: 'Perdido', icon: XCircle, className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedPipeline('all');
    setSelectedStage('all');
    setSelectedAssignee('all');
    setSelectedTag('all');
    setSelectedSource('all');
    setDatePreset(null);
    setCustomDateRange(null);
    setPage(1);
  };

  // Clear selection when data changes
  const clearSelection = () => setSelectedIds(new Set());
  
  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length && contacts.length > 0) {
      clearSelection();
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    }
  };
  
  const toggleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };
  
  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteLead.mutateAsync(id);
    }
    clearSelection();
    setBulkDeleteDialogOpen(false);
  };

  const hasActiveFilters = search || selectedPipeline !== 'all' || selectedStage !== 'all' || 
    selectedAssignee !== 'all' || selectedTag !== 'all' || selectedSource !== 'all' || datePreset || customDateRange;

  const activeFilterCount = [
    selectedPipeline !== 'all',
    selectedStage !== 'all',
    selectedAssignee !== 'all',
    selectedTag !== 'all',
    selectedSource !== 'all',
    datePreset || customDateRange,
  ].filter(Boolean).length;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSort = (column: ContactListFilters['sortBy']) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
    setPage(1);
  };

  const SortIcon = ({ column }: { column: ContactListFilters['sortBy'] }) => {
    if (sortBy !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDir === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Reset page when filters change
  const handleFilterChange = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <AppLayout title="Contatos">
      <div className="space-y-6 animate-in relative">
        {/* Loading indicator for background fetches */}
        {isFetching && !isLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 z-50">
            <div className="h-full bg-primary animate-pulse" />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-muted-foreground text-sm">
            {isLoading ? 'Carregando...' : `${totalCount} contatos`}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size={isMobile ? 'sm' : 'default'} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {isMobile ? <Upload className="h-4 w-4" /> : (
                  <>
                    Importar / Exportar
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2 text-primary" />
                Importar Contatos
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => exportContacts({ leads: allLeads })}
                disabled={allLeads.length === 0}
              >
                <Download className="h-4 w-4 mr-2 text-primary" />
                Exportar Contatos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filters - Mobile vs Desktop */}
        {isMobile ? (
          <MobileFilters
            search={search}
            setSearch={(v) => { setSearch(v); setPage(1); }}
            selectedPipeline={selectedPipeline}
            setSelectedPipeline={(v) => { handleFilterChange(setSelectedPipeline)(v); setSelectedStage('all'); }}
            selectedStage={selectedStage}
            setSelectedStage={handleFilterChange(setSelectedStage)}
            selectedAssignee={selectedAssignee}
            setSelectedAssignee={handleFilterChange(setSelectedAssignee)}
            selectedTag={selectedTag}
            setSelectedTag={handleFilterChange(setSelectedTag)}
            selectedSource={selectedSource}
            setSelectedSource={handleFilterChange(setSelectedSource)}
            datePreset={datePreset}
            onDatePresetChange={handleFilterChange(setDatePreset)}
            customDateRange={customDateRange}
            onCustomDateRangeChange={handleFilterChange(setCustomDateRange)}
            pipelines={pipelines}
            stages={stages}
            users={users}
            tags={tags}
            hasActiveFilters={!!hasActiveFilters}
            clearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
          />
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email ou telefone..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-9"
                  />
                </div>

                {/* Pipeline */}
                <Select value={selectedPipeline} onValueChange={(v) => {
                  handleFilterChange(setSelectedPipeline)(v);
                  setSelectedStage('all');
                }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas pipelines</SelectItem>
                    {pipelines.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Stage */}
                <Select value={selectedStage} onValueChange={handleFilterChange(setSelectedStage)} disabled={selectedPipeline === 'all'}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Estágio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos estágios</SelectItem>
                    {stages.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Assignee */}
                <Select value={selectedAssignee} onValueChange={handleFilterChange(setSelectedAssignee)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="unassigned">Sem responsável</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Tag */}
                <Select value={selectedTag} onValueChange={handleFilterChange(setSelectedTag)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas tags</SelectItem>
                    {tags.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Source */}
                <Select value={selectedSource} onValueChange={handleFilterChange(setSelectedSource)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas fontes</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="meta">Meta Ads</SelectItem>
                    <SelectItem value="site">Site</SelectItem>
                    <SelectItem value="wordpress">WordPress</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date Filter - Using the nice DateFilterPopover */}
                <DateFilterPopover
                  datePreset={datePreset}
                  onDatePresetChange={handleFilterChange(setDatePreset)}
                  customDateRange={customDateRange}
                  onCustomDateRangeChange={handleFilterChange(setCustomDateRange)}
                  defaultPreset="last30days"
                />

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Limpar filtros
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content - Mobile Cards vs Desktop Table */}
        <Card>
          {isMobile ? (
            // Mobile Card List
            <div>
              {isLoading ? (
                <div className="divide-y">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-4 space-y-3 animate-pulse">
                      <div className="flex justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="h-4 w-32 bg-muted rounded" />
                          <div className="h-3 w-24 bg-muted rounded" />
                        </div>
                        <div className="h-8 w-8 bg-muted rounded" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-6 w-20 bg-muted rounded-full" />
                        <div className="h-6 w-16 bg-muted rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : contacts.length === 0 ? (
                <EmptyState
                  hasActiveFilters={!!hasActiveFilters}
                  onImport={() => setImportDialogOpen(true)}
                  onCreate={() => {/* TODO: Open create dialog */}}
                  onClearFilters={clearFilters}
                />
              ) : (
                <div className="divide-y">
                  {contacts.map((contact) => (
                    <ContactCard 
                      key={contact.id} 
                      contact={contact} 
                      sourceLabels={sourceLabels}
                      onViewDetails={() => setSelectedContactId(contact.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Desktop Table
            <div className="overflow-x-auto">
              {isLoading ? (
                <TableSkeleton />
              ) : contacts.length === 0 ? (
                <EmptyState
                  hasActiveFilters={!!hasActiveFilters}
                  onImport={() => setImportDialogOpen(true)}
                  onCreate={() => {/* TODO: Open create dialog */}}
                  onClearFilters={clearFilters}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox 
                          checked={selectedIds.size === contacts.length && contacts.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          Nome <SortIcon column="name" />
                        </div>
                      </TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pipeline / Estágio</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('created_at')}
                      >
                        <div className="flex items-center">
                          Criado em <SortIcon column="created_at" />
                        </div>
                      </TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => {
                      const isLost = contact.deal_status === 'lost';
                      const isWon = contact.deal_status === 'won';
                      const status = contact.deal_status || 'open';
                      const StatusIcon = dealStatusConfig[status]?.icon || CircleDot;
                      
                      return (
                      <TableRow 
                        key={contact.id} 
                        className={cn(
                          "cursor-pointer hover:bg-muted/30",
                          isLost && "bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-950/30",
                          isWon && "bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/30"
                        )}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={selectedIds.has(contact.id)}
                            onCheckedChange={() => toggleSelectOne(contact.id)}
                          />
                        </TableCell>
                        <TableCell onClick={() => setSelectedContactId(contact.id)}>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getInitials(contact.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{contact.name}</p>
                              {contact.source && (
                                <p className="text-xs text-muted-foreground">
                                  {sourceLabels[contact.source] || contact.source}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell onClick={() => setSelectedContactId(contact.id)}>
                          <div className="space-y-1">
                            {contact.phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {contact.phone}
                              </div>
                            )}
                            {contact.email && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell onClick={() => setSelectedContactId(contact.id)}>
                          <div className="space-y-1">
                            <Badge 
                              variant="secondary" 
                              className={cn("text-xs gap-1 px-2", dealStatusConfig[status]?.className)}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {dealStatusConfig[status]?.label}
                            </Badge>
                            {isLost && contact.lost_reason && (
                              <p className="text-xs text-red-600 dark:text-red-400 max-w-[150px] truncate" title={contact.lost_reason}>
                                {contact.lost_reason}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell onClick={() => setSelectedContactId(contact.id)}>
                          <div className="space-y-1">
                            {contact.stage_name && (
                              <Badge variant="outline" className="text-xs">
                                {contact.stage_name}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell onClick={() => setSelectedContactId(contact.id)}>
                          {contact.assignee_name ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={contact.assignee_avatar || undefined} />
                                <AvatarFallback className="text-[10px] bg-secondary">
                                  {getInitials(contact.assignee_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{contact.assignee_name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem responsável</span>
                          )}
                        </TableCell>
                        <TableCell onClick={() => setSelectedContactId(contact.id)}>
                          <div className="flex flex-wrap gap-1">
                            {contact.tags?.slice(0, 2).map((tag: any) => (
                              <Badge 
                                key={tag.id} 
                                variant="secondary"
                                className="text-[10px] px-1.5"
                                style={{ 
                                  backgroundColor: `${tag.color}20`,
                                  color: tag.color,
                                  borderColor: tag.color
                                }}
                              >
                                {tag.name}
                              </Badge>
                            ))}
                            {contact.tags && contact.tags.length > 2 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5">
                                +{contact.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell onClick={() => setSelectedContactId(contact.id)}>
                          <div className="text-sm">
                            <p>{format(new Date(contact.created_at), 'dd/MM/yyyy', { locale: ptBR })}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(contact.created_at), { addSuffix: true, locale: ptBR })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedContactId(contact.id)}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Ver detalhes
                              </DropdownMenuItem>
                              {contact.phone && (
                                <DropdownMenuItem asChild>
                                  <a href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    WhatsApp
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteContactId(contact.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </Card>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-background border rounded-lg shadow-lg p-3 flex items-center gap-4 z-50">
            <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Cancelar
            </Button>
          </div>
        )}

        {/* Pagination */}
        {(totalPages > 1 || totalCount > 0) && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages || 1}
              </p>
              <Select 
                value={String(pageSize)} 
                onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
              >
                <SelectTrigger className="h-8 w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <SelectItem key={size} value={String(size)}>
                      {size} por pág
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {/* Page Input */}
              <div className="flex items-center gap-1 mx-2">
                <Input
                  type="text"
                  value={pageInputValue}
                  onChange={(e) => setPageInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const num = parseInt(pageInputValue);
                      if (!isNaN(num) && num >= 1 && num <= totalPages) {
                        setPage(num);
                      } else {
                        setPageInputValue(String(page));
                      }
                    }
                  }}
                  onBlur={() => {
                    const num = parseInt(pageInputValue);
                    if (!isNaN(num) && num >= 1 && num <= totalPages) {
                      setPage(num);
                    } else {
                      setPageInputValue(String(page));
                    }
                  }}
                  className="w-12 h-8 text-center p-1"
                />
                <span className="text-sm text-muted-foreground">/ {totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Lead Detail Dialog */}
        {selectedLead && (
          <LeadDetailDialog
            lead={selectedLead}
            stages={stages}
            onClose={() => setSelectedContactId(null)}
            allTags={tags}
            allUsers={users}
            refetchStages={() => {}}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteContactId} onOpenChange={(open) => !open && setDeleteContactId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir contato</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={async () => {
                  if (deleteContactId) {
                    await deleteLead.mutateAsync(deleteContactId);
                    setDeleteContactId(null);
                  }
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Confirmation Dialog */}
        <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir {selectedIds.size} contatos</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir {selectedIds.size} contatos selecionados? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleBulkDelete}
              >
                Excluir {selectedIds.size} contatos
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Import Dialog */}
        <ImportContactsDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
        />
      </div>
    </AppLayout>
  );
}
