import { useState, useDeferredValue } from 'react';
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
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useIsMobile } from '@/hooks/use-mobile';
import { ContactCard } from '@/components/contacts/ContactCard';
import { MobileFilters } from '@/components/contacts/MobileFilters';
import { usePipelines, useStages } from '@/hooks/use-stages';
import { useOrganizationUsers } from '@/hooks/use-users';
import { useTags } from '@/hooks/use-tags';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ImportContactsDialog } from '@/components/contacts/ImportContactsDialog';
import { TableSkeleton } from '@/components/contacts/TableSkeleton';
import { EmptyState } from '@/components/contacts/EmptyState';
import { useContactsList, type ContactListFilters } from '@/hooks/use-contacts-list';
import { exportContacts } from '@/lib/export-contacts';
import { useLeads, useLead, useDeleteLead } from '@/hooks/use-leads';

export default function Contacts() {
  const isMobile = useIsMobile();
  // Filter states
  const [search, setSearch] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [createdFrom, setCreatedFrom] = useState<string>('');
  const [createdTo, setCreatedTo] = useState<string>('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [pageInputValue, setPageInputValue] = useState('1');
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Pagination & Sort states
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [sortBy, setSortBy] = useState<ContactListFilters['sortBy']>('created_at');
  const [sortDir, setSortDir] = useState<ContactListFilters['sortDir']>('desc');

  // Debounce search
  const deferredSearch = useDeferredValue(search);

  // Build filters
  const filters: ContactListFilters = {
    search: deferredSearch || undefined,
    pipelineId: selectedPipeline !== 'all' ? selectedPipeline : undefined,
    stageId: selectedStage !== 'all' ? selectedStage : undefined,
    assigneeId: selectedAssignee !== 'all' && selectedAssignee !== 'unassigned' ? selectedAssignee : undefined,
    unassigned: selectedAssignee === 'unassigned',
    tagId: selectedTag !== 'all' ? selectedTag : undefined,
    source: selectedSource !== 'all' ? selectedSource : undefined,
    createdFrom: createdFrom ? `${createdFrom}T00:00:00` : undefined,
    createdTo: createdTo ? `${createdTo}T23:59:59` : undefined,
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

  const clearFilters = () => {
    setSearch('');
    setSelectedPipeline('all');
    setSelectedStage('all');
    setSelectedAssignee('all');
    setSelectedTag('all');
    setSelectedSource('all');
    setCreatedFrom('');
    setCreatedTo('');
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
    selectedAssignee !== 'all' || selectedTag !== 'all' || selectedSource !== 'all' || createdFrom || createdTo;

  const activeFilterCount = [
    selectedPipeline !== 'all',
    selectedStage !== 'all',
    selectedAssignee !== 'all',
    selectedTag !== 'all',
    selectedSource !== 'all',
    createdFrom,
    createdTo,
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
            createdFrom={createdFrom}
            setCreatedFrom={handleFilterChange(setCreatedFrom)}
            createdTo={createdTo}
            setCreatedTo={handleFilterChange(setCreatedTo)}
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

                {/* Date Filters */}
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    placeholder="De"
                    value={createdFrom}
                    onChange={(e) => handleFilterChange(setCreatedFrom)(e.target.value)}
                    className="w-[140px]"
                  />
                  <span className="text-muted-foreground">até</span>
                  <Input
                    type="date"
                    placeholder="Até"
                    value={createdTo}
                    onChange={(e) => handleFilterChange(setCreatedTo)(e.target.value)}
                    className="w-[140px]"
                  />
                </div>

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedIds.size === contacts.length && contacts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <span className="flex items-center">
                      Contato
                      <SortIcon column="name" />
                    </span>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleSort('stage')}
                  >
                    <span className="flex items-center">
                      Estágio
                      <SortIcon column="stage" />
                    </span>
                  </TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleSort('last_interaction_at')}
                  >
                    <span className="flex items-center">
                      Última Interação
                      <SortIcon column="last_interaction_at" />
                    </span>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    <span className="flex items-center">
                      Data
                      <SortIcon column="created_at" />
                    </span>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>

              {isLoading ? (
                <TableSkeleton rows={10} />
              ) : contacts.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        hasActiveFilters={!!hasActiveFilters}
                        onImport={() => setImportDialogOpen(true)}
                        onCreate={() => {/* TODO: Open create dialog */}}
                        onClearFilters={clearFilters}
                      />
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody>
                  {contacts.map((contact) => (
                    <TableRow 
                      key={contact.id} 
                      className={cn(
                        "cursor-pointer hover:bg-accent/50",
                        selectedIds.has(contact.id) && "bg-accent/30"
                      )}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(contact.id)}
                          onCheckedChange={() => toggleSelectOne(contact.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{contact.name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {contact.phone && (
                              <a 
                                href={`tel:${contact.phone}`} 
                                className="flex items-center gap-1 hover:text-foreground"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="h-3 w-3" />
                                {contact.phone}
                              </a>
                            )}
                            {contact.email && (
                              <a 
                                href={`mailto:${contact.email}`} 
                                className="flex items-center gap-1 hover:text-foreground"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.stage_name ? (
                          <Badge 
                            variant="outline" 
                            className="gap-1.5"
                            style={{ 
                              borderColor: contact.stage_color || undefined,
                              color: contact.stage_color || undefined
                            }}
                          >
                            <div 
                              className="h-2 w-2 rounded-full" 
                              style={{ backgroundColor: contact.stage_color || undefined }} 
                            />
                            {contact.stage_name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.assignee_name ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={contact.assignee_avatar || undefined} />
                              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                                {getInitials(contact.assignee_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{contact.assignee_name.split(' ')[0]}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm flex items-center gap-1">
                            <UserCircle className="h-4 w-4" />
                            Sem responsável
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(contact.tags || []).slice(0, 2).map(tag => (
                            <Badge 
                              key={tag.id} 
                              variant="secondary"
                              className="text-xs"
                              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                          {(contact.tags?.length || 0) > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{(contact.tags?.length || 0) - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {sourceLabels[contact.source] || contact.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {contact.last_interaction_at ? (
                          <div className="space-y-0.5">
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {contact.last_interaction_preview || 'Interação registrada'}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {contact.last_interaction_channel === 'whatsapp' && (
                                <MessageCircle className="h-3 w-3" />
                              )}
                              {formatDistanceToNow(new Date(contact.last_interaction_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(contact.created_at), 'dd/MM/yy', { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
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
                                <a href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} target="_blank">
                                  <Phone className="h-4 w-4 mr-2" />
                                  WhatsApp
                                </a>
                              </DropdownMenuItem>
                            )}
                            {contact.email && (
                              <DropdownMenuItem asChild>
                                <a href={`mailto:${contact.email}`}>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Enviar email
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteContactId(contact.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              )}
            </Table>
          )}

          {/* Pagination - Compact style */}
          {totalPages > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {totalCount} itens
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { setPage(1); setPageInputValue('1'); }}
                  disabled={page === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { const newPage = Math.max(1, page - 1); setPage(newPage); setPageInputValue(String(newPage)); }}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 mx-2">
                  <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={pageInputValue}
                    onChange={(e) => setPageInputValue(e.target.value)}
                    onBlur={() => {
                      const parsed = parseInt(pageInputValue, 10);
                      if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
                        setPage(parsed);
                      } else {
                        setPageInputValue(String(page));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const parsed = parseInt(pageInputValue, 10);
                        if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
                          setPage(parsed);
                        } else {
                          setPageInputValue(String(page));
                        }
                      }
                    }}
                    className="w-12 h-8 text-center px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    de {totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { const newPage = Math.min(totalPages, page + 1); setPage(newPage); setPageInputValue(String(newPage)); }}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { setPage(totalPages); setPageInputValue(String(totalPages)); }}
                  disabled={page === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Import Dialog */}
        <ImportContactsDialog 
          open={importDialogOpen} 
          onOpenChange={setImportDialogOpen} 
        />

        {/* Lead Detail Dialog */}
        {selectedLead && (
          <LeadDetailDialog
            lead={selectedLead}
            stages={stages}
            allTags={tags}
            allUsers={users}
            onClose={() => setSelectedContactId(null)}
            refetchStages={() => {}}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteContactId} onOpenChange={(open) => !open && setDeleteContactId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todos os dados relacionados a este contato 
                (histórico, tarefas, atividades, mensagens) serão removidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteContactId) {
                    deleteLead.mutate(deleteContactId, {
                      onSuccess: () => setDeleteContactId(null),
                    });
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Bulk Delete Confirmation */}
        <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir {selectedIds.size} contato(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todos os dados relacionados a estes contatos 
                (histórico, tarefas, atividades, mensagens) serão removidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir {selectedIds.size} contato(s)
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
            <Card className="shadow-lg border-primary/20">
              <CardContent className="flex items-center gap-4 py-3 px-5">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {selectedIds.size} selecionado(s)
                  </span>
                </div>
                <div className="h-4 w-px bg-border" />
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={clearSelection}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
