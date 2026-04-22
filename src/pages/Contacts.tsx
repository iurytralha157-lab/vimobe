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
  Filter,
  CircleDot,
  Check,
  Plus,
  ChevronsRight,
  Tags,
  CheckSquare,
  Square,
  Trophy,
  XCircle,
} from 'lucide-react';
import { CreateLeadDialog } from '@/components/leads/CreateLeadDialog';
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
import { exportContactsFiltered } from '@/lib/export-contacts';
import { useLead, useDeleteLead } from '@/hooks/use-leads';
import { ReentryBadge } from '@/components/leads/ReentryBadge';
import { useToast } from '@/hooks/use-toast';
import { DateFilterPopover } from '@/components/ui/date-filter-popover';
import { DatePreset, getDateRangeFromPreset } from '@/hooks/use-dashboard-filters';
import { AdvancedFilters } from '@/components/contacts/AdvancedFilters';

export default function Contacts() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  // Filter states
  const [search, setSearch] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedDealStatus, setSelectedDealStatus] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<DatePreset | null>(null);
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [pageInputValue, setPageInputValue] = useState('1');
  const [isExporting, setIsExporting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
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
  const dateRange = useMemo<{ from: Date; to: Date } | null>(() => {
    if (customDateRange) return customDateRange;
    if (!datePreset) return null;
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
    dealStatus: selectedDealStatus !== 'all' ? selectedDealStatus as 'open' | 'won' | 'lost' : undefined,
    createdFrom: dateRange ? dateRange.from.toISOString() : undefined,
    createdTo: dateRange ? dateRange.to.toISOString() : undefined,
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
  
  // Fetch selected lead for detail dialog
  const { data: selectedLead } = useLead(selectedContactId);
  const deleteLead = useDeleteLead();

  const totalCount = contacts[0]?.total_count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const sourceLabels: Record<string, string> = {
    manual: 'Manual',
    meta: 'Meta Ads',
    site: 'Site',
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
    setSelectedDealStatus('all');
    setDatePreset(null);
    setCustomDateRange(null);
    setPage(1);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const count = await exportContactsFiltered({
        filters: {
          search: deferredSearch || undefined,
          pipelineId: selectedPipeline !== 'all' ? selectedPipeline : undefined,
          stageId: selectedStage !== 'all' ? selectedStage : undefined,
          assigneeId: selectedAssignee !== 'all' && selectedAssignee !== 'unassigned' ? selectedAssignee : undefined,
          unassigned: selectedAssignee === 'unassigned',
          tagId: selectedTag !== 'all' ? selectedTag : undefined,
          source: selectedSource !== 'all' ? selectedSource : undefined,
          dealStatus: selectedDealStatus !== 'all' ? selectedDealStatus : undefined,
          createdFrom: dateRange ? dateRange.from.toISOString() : undefined,
          createdTo: dateRange ? dateRange.to.toISOString() : undefined,
        },
        filename: `contatos-${format(new Date(), 'yyyy-MM-dd')}`,
      });
      toast({
        title: 'Exportação concluída',
        description: `${count} contatos exportados com sucesso`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro na exportação',
        description: error.message || 'Não foi possível exportar os contatos',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
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
    selectedAssignee !== 'all' || selectedTag !== 'all' || selectedSource !== 'all' || 
    selectedDealStatus !== 'all' || datePreset || customDateRange;

  const activeFilterCount = [
    selectedPipeline !== 'all',
    selectedStage !== 'all',
    selectedAssignee !== 'all',
    selectedTag !== 'all',
    selectedSource !== 'all',
    selectedDealStatus !== 'all',
    datePreset || customDateRange,
  ].filter(Boolean).length;

  const activeAdvancedCount = [
    selectedAssignee !== 'all',
    selectedTag !== 'all',
    selectedSource !== 'all',
    selectedDealStatus !== 'all',
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



        {/* Filters - Mobile vs Desktop */}
        {isMobile ? (
          <div className="flex gap-2 items-center w-full">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Upload className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setImportDialogOpen(true)} className="py-2.5">
                  <Upload className="h-4 w-4 mr-2 text-primary" />
                  Importar CSV/Excel
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleExport}
                  disabled={isExporting || totalCount === 0}
                  className="py-2.5"
                >
                  <Download className="h-4 w-4 mr-2 text-primary" />
                  {isExporting ? 'Exportando...' : 'Exportar Lista'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="bg-card rounded-xl p-1.5 px-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Title & Count */}
              <div className="flex items-center gap-2 pr-2 border-r mr-1">
                <Badge variant="secondary" className="h-6 px-2 text-xs bg-muted/50 border-none font-bold">
                  {isLoading ? '...' : totalCount}
                </Badge>
              </div>

              {/* Search */}
              <div className="relative w-[180px] lg:w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9 h-9 border-none bg-muted/40 focus-visible:ring-1 focus-visible:ring-primary/20"
                />
              </div>

              <div className="h-6 w-[1px] bg-border mx-1" />

              {/* Pipeline */}
              <Select value={selectedPipeline} onValueChange={(v) => {
                handleFilterChange(setSelectedPipeline)(v);
                setSelectedStage('all');
              }}>
                <SelectTrigger className="w-[130px] lg:w-[150px] h-9 border-none bg-transparent hover:bg-muted font-medium">
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
                <SelectTrigger className="w-[130px] lg:w-[150px] h-9 border-none bg-transparent hover:bg-muted font-medium">
                  <SelectValue placeholder="Estágio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos estágios</SelectItem>
                  {stages.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="h-6 w-[1px] bg-border mx-1" />

              {/* Advanced Filters Popover */}
              <AdvancedFilters
                selectedAssignee={selectedAssignee}
                setSelectedAssignee={handleFilterChange(setSelectedAssignee)}
                users={users}
                selectedTag={selectedTag}
                setSelectedTag={handleFilterChange(setSelectedTag)}
                tags={tags}
                selectedSource={selectedSource}
                setSelectedSource={handleFilterChange(setSelectedSource)}
                selectedDealStatus={selectedDealStatus}
                setSelectedDealStatus={handleFilterChange(setSelectedDealStatus)}
                activeCount={activeAdvancedCount}
              />

              {/* Date Filter */}
              <DateFilterPopover
                datePreset={datePreset}
                onDatePresetChange={handleFilterChange(setDatePreset)}
                customDateRange={customDateRange}
                onCustomDateRangeChange={handleFilterChange(setCustomDateRange)}
                defaultPreset="last30days"
                triggerClassName="rounded-lg"
              />

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-3 text-muted-foreground hover:text-primary transition-colors">
                  <X className="h-4 w-4 mr-1.5" />
                  Limpar
                </Button>
              )}

              <div className="h-6 w-[1px] bg-border mx-1" />

              {/* Actions */}
              <div className="flex items-center gap-2 ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2 font-medium border-none hover:bg-muted">
                      <Upload className="h-4 w-4" />
                      {!isMobile && "Importar / Exportar"}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setImportDialogOpen(true)} className="py-2.5">
                      <Upload className="h-4 w-4 mr-2 text-primary" />
                      Importar CSV/Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleExport}
                      disabled={isExporting || totalCount === 0}
                      className="py-2.5"
                    >
                      <Download className="h-4 w-4 mr-2 text-primary" />
                      {isExporting ? 'Exportando...' : 'Exportar Lista'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button 
                  size="sm" 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="h-9 gap-2 shadow-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  {!isMobile && "Novo Contato"}
                </Button>
              </div>
            </div>
          </div>
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
                  onCreate={() => setIsCreateDialogOpen(true)}
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
                  onCreate={() => setIsCreateDialogOpen(true)}
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
                        onClick={() => setSelectedContactId(contact.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={selectedIds.has(contact.id)}
                            onCheckedChange={() => toggleSelectOne(contact.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {getInitials(contact.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{contact.name}</p>
                                <ReentryBadge count={contact.reentry_count} lastEntryAt={contact.last_entry_at} />
                              </div>
                              {contact.source && (
                                <p className="text-xs text-muted-foreground">
                                  {sourceLabels[contact.source] || contact.source}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
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
                                  backgroundColor: tag.color,
                                  color: '#FFFFFF',
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

        {/* Create Lead Dialog */}
        <CreateLeadDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />

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
