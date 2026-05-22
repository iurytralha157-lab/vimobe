import React from 'react';
import { 
  Search, 
  RefreshCw, 
  Plus, 
  Settings, 
  Calendar, 
  Filter, 
  Check, 
  XCircle, 
  Loader2, 
  ChevronDown,
  Trash2,
  Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { DateFilterPopover } from '@/components/ui/date-filter-popover';
import { format, ptBR } from 'date-fns';
import { startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { DatePreset, datePresetOptions } from '@/hooks/use-dashboard-filters';

interface PipelineFiltersProps {
  isMobile: boolean;
  isAdmin: boolean;
  canEditPipeline: boolean;
  pipelines: any[];
  selectedPipelineId: string | null;
  setSelectedPipelineId: (id: string | null) => void;
  currentPipeline: any;
  handleDeletePipeline: (id: string) => void;
  setNewPipelineDialogOpen: (open: boolean) => void;
  editingPipelineId: string | null;
  setEditingPipelineId: (id: string | null) => void;
  editingPipelineName: string;
  setEditingPipelineName: (name: string) => void;
  updatePipeline: any;
  setStagesEditorOpen: (open: boolean) => void;
  searchInput: string;
  setSearchInput: (value: string) => void;
  leadsLoading: boolean;
  handleManualRefresh: () => void;
  isRefreshing: boolean;
  openNewLeadDialog: (stageId?: string) => void;
  datePreset: DatePreset;
  setDatePreset: (preset: DatePreset) => void;
  customDateRange: { from: Date; to: Date } | null;
  setCustomDateRange: (range: { from: Date; to: Date } | null) => void;
  filterUser: string | undefined;
  setFilterUser: (user: string) => void;
  hasLeadViewAll: boolean;
  users: any[];
  filterTag: string;
  setFilterTag: (tag: string) => void;
  allTags: any[];
  filterDealStatus: string;
  setFilterDealStatus: (status: string) => void;
  filterCampaign: string;
  setFilterCampaign: (campaign: string) => void;
  filterAdSet: string;
  setFilterAdSet: (adset: string) => void;
  filterAd: string;
  setFilterAd: (ad: string) => void;
  metaFilters: any;
  filterSource: string;
  setFilterSource: (source: string) => void;
  allSources: string[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  profile: any;
}

export const PipelineFilters: React.FC<PipelineFiltersProps> = ({
  isMobile,
  isAdmin,
  canEditPipeline,
  pipelines,
  selectedPipelineId,
  setSelectedPipelineId,
  currentPipeline,
  handleDeletePipeline,
  setNewPipelineDialogOpen,
  editingPipelineId,
  setEditingPipelineId,
  editingPipelineName,
  setEditingPipelineName,
  updatePipeline,
  setStagesEditorOpen,
  searchInput,
  setSearchInput,
  leadsLoading,
  handleManualRefresh,
  isRefreshing,
  openNewLeadDialog,
  datePreset,
  setDatePreset,
  customDateRange,
  setCustomDateRange,
  filterUser,
  setFilterUser,
  hasLeadViewAll,
  users,
  filterTag,
  setFilterTag,
  allTags,
  filterDealStatus,
  setFilterDealStatus,
  filterCampaign,
  setFilterCampaign,
  filterAdSet,
  setFilterAdSet,
  filterAd,
  setFilterAd,
  metaFilters,
  filterSource,
  setFilterSource,
  allSources,
  searchQuery,
  setSearchQuery,
  profile,
}) => {
  if (isMobile) {
    return (
      <div className="flex items-center gap-1.5 mb-3 w-full overflow-x-auto pb-1 no-scrollbar">
        {/* Pipeline Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 px-2.5 gap-1 text-[11px] font-semibold flex-shrink-0">
              {currentPipeline?.name || 'Pipeline'}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {pipelines.map(pipeline => (
              <DropdownMenuItem 
                key={pipeline.id}
                onClick={() => setSelectedPipelineId(pipeline.id)}
                className="flex items-center justify-between"
              >
                <span className={cn(pipeline.id === selectedPipelineId && "font-semibold")}>
                  {pipeline.name}
                </span>
                {isAdmin && pipeline.id !== selectedPipelineId && pipelines.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-50 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePipeline(pipeline.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </DropdownMenuItem>
            ))}
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setNewPipelineDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Pipeline
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Search Field (Mobile) */}
        <div className="relative flex-shrink-0">
          <Search className={cn(
            "absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground transition-colors",
            searchInput && "text-primary"
          )} />
          <Input
            placeholder="Buscar..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-8 w-[110px] pl-7 pr-2 text-[10px] bg-muted/40 border-border focus:bg-background transition-all"
          />
          {leadsLoading && searchInput && (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
              <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Sync Button */}
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-8 w-8 flex-shrink-0 transition-colors", 
            isRefreshing && "text-primary border-primary bg-primary/5"
          )}
          onClick={handleManualRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
        </Button>

        {/* New Lead Button (Mobile) */}
        <Button
          size="icon"
          className="h-8 w-8 flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground border-none shadow-none"
          onClick={() => openNewLeadDialog()}
        >
          <Plus className="h-4 w-4" />
        </Button>

        {canEditPipeline && (
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setStagesEditorOpen(true)}
            disabled={!selectedPipelineId}
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
        )}

        <div className="w-px h-5 bg-border flex-shrink-0 mx-0.5" />

        {/* Date Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "h-8 gap-2 text-[11px] font-semibold uppercase tracking-wider px-3 border-border/60 hover:border-primary/50 transition-colors flex-shrink-0",
                (datePreset !== 'last30days' || customDateRange) && "border-primary/50 bg-primary/5 text-primary"
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {datePreset === 'custom' && customDateRange
                  ? `${format(customDateRange.from, 'dd/MM/yy', { locale: ptBR })} - ${format(customDateRange.to, 'dd/MM/yy', { locale: ptBR })}`
                  : datePresetOptions.find(o => o.value === datePreset)?.label || 'Período'}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0 border-border/40 shadow-xl overflow-hidden z-[100]">
            <div className="flex bg-background">
              {/* Atalhos */}
              <div className="w-[180px] p-2 bg-muted/30 border-r border-border/40 space-y-1">
                <p className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Atalhos</p>
                {datePresetOptions.filter(o => o.value !== 'custom').map((option) => (
                  <Button
                    key={option.value}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-xs h-8 font-medium hover:bg-primary/10 hover:text-primary transition-colors",
                      datePreset === option.value && !customDateRange ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    )}
                    onClick={() => {
                      setDatePreset(option.value);
                      setCustomDateRange(null);
                    }}
                  >
                    {option.label}
                    {datePreset === option.value && !customDateRange && <Check className="ml-auto h-3 w-3" />}
                  </Button>
                ))}
              </div>

              {/* Calendário */}
              <div className="p-3">
                <p className="px-1 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Personalizado</p>
                <CalendarComponent
                  mode="range"
                  selected={{ from: customDateRange?.from, to: customDateRange?.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setCustomDateRange({ from: startOfDay(range.from), to: endOfDay(range.to) });
                    }
                  }}
                  numberOfMonths={1}
                  locale={ptBR}
                  className="rounded-md border border-border/40 p-2"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Filters Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-8 w-8 flex-shrink-0 relative",
                ((filterUser && filterUser !== 'all') || (filterTag && filterTag !== 'all') || (filterDealStatus && filterDealStatus !== 'all') || (filterCampaign && filterCampaign !== 'all') || (filterAdSet && filterAdSet !== 'all') || (filterAd && filterAd !== 'all') || (filterSource && filterSource !== 'all') || searchQuery) && "border-primary text-primary"
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              {((filterUser && filterUser !== 'all') || (filterTag && filterTag !== 'all') || (filterDealStatus && filterDealStatus !== 'all') || (filterCampaign && filterCampaign !== 'all') || (filterAdSet && filterAdSet !== 'all') || (filterAd && filterAd !== 'all') || (filterSource && filterSource !== 'all') || searchQuery) && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[280px] p-4 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">Responsável</Label>
                {(isAdmin || hasLeadViewAll) && (
                  <Select value={filterUser} onValueChange={setFilterUser}>
                    <SelectTrigger className={cn("h-9 w-full text-xs", filterUser && filterUser !== 'all' && "border-primary text-primary")}>
                      <SelectValue placeholder="Responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos responsáveis</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">Etiquetas</Label>
                <Select value={filterTag} onValueChange={setFilterTag}>
                  <SelectTrigger className={cn("h-9 w-full text-xs", filterTag && filterTag !== 'all' && "border-primary text-primary")}>
                    <SelectValue placeholder="Todas as tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as tags</SelectItem>
                    {allTags.map(tag => (
                      <SelectItem key={tag.id} value={tag.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                          {tag.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">Status</Label>
                <Select value={filterDealStatus} onValueChange={setFilterDealStatus}>
                  <SelectTrigger className={cn("h-9 w-full text-xs", filterDealStatus && filterDealStatus !== 'all' && "border-primary text-primary")}>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="won">Ganho</SelectItem>
                    <SelectItem value="lost">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">Meta Ads</Label>
                <div className="grid grid-cols-1 gap-1.5 p-2 border rounded-md bg-muted/10">
                  <Select value={filterCampaign} onValueChange={setFilterCampaign}>
                    <SelectTrigger className="h-8 text-[11px] bg-white">
                      <SelectValue placeholder="Campanha" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Campanhas</SelectItem>
                      {metaFilters?.campaigns.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterAdSet} onValueChange={setFilterAdSet}>
                    <SelectTrigger className="h-8 text-[11px] bg-white">
                      <SelectValue placeholder="Conjunto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Conjuntos</SelectItem>
                      {metaFilters?.adsets.map((a: string) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterAd} onValueChange={setFilterAd}>
                    <SelectTrigger className="h-8 text-[11px] bg-white">
                      <SelectValue placeholder="Anúncio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Anúncios</SelectItem>
                      {metaFilters?.ads.map((a: string) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">Origem</Label>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className={cn("h-9 w-full text-xs", filterSource && filterSource !== 'all' && "border-primary text-primary")}>
                    <SelectValue placeholder="Origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Origens</SelectItem>
                    {allSources.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {((filterUser && filterUser !== 'all') || (filterTag && filterTag !== 'all') || (filterDealStatus && filterDealStatus !== 'all') || (filterCampaign && filterCampaign !== 'all') || (filterAdSet && filterAdSet !== 'all') || (filterAd && filterAd !== 'all') || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs h-9 text-destructive"
                  onClick={() => {
                    setFilterUser(isAdmin || hasLeadViewAll ? 'all' : profile?.id);
                    setFilterTag('all');
                    setFilterDealStatus('all');
                    setFilterCampaign('all');
                    setFilterAdSet('all');
                    setFilterAd('all');
                    setFilterSource('all');
                    setSearchInput('');
                    setSearchQuery('');
                  }}
                >
                  <XCircle className="h-3.5 w-3.5 mr-2" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mb-4 gap-3">
      <div className="flex items-center gap-2">
        {/* Pipeline Selector Group */}
        <div className="flex items-center gap-2 border border-border rounded-lg px-2.5 py-1.5 bg-muted/50 shrink-0">
          <Settings className="h-4 w-4 text-foreground/70" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {editingPipelineId === currentPipeline?.id ? (
                <div className="flex items-center gap-1 p-1" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editingPipelineName}
                    onChange={(e) => setEditingPipelineName(e.target.value)}
                    className="h-7 w-32 text-xs"
                    autoFocus
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && editingPipelineName.trim() && currentPipeline) {
                        try {
                          await updatePipeline.mutateAsync({ 
                            id: currentPipeline.id, 
                            name: editingPipelineName.trim() 
                          });
                          setEditingPipelineId(null);
                        } catch (err: any) {
                          console.error(err);
                        }
                      }
                      if (e.key === 'Escape') setEditingPipelineId(null);
                    }}
                  />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6" 
                    onClick={async () => {
                      if (editingPipelineName.trim() && currentPipeline) {
                        try {
                          await updatePipeline.mutateAsync({ 
                            id: currentPipeline.id, 
                            name: editingPipelineName.trim() 
                          });
                          setEditingPipelineId(null);
                        } catch (err: any) {
                          console.error(err);
                        }
                      }
                    }}
                  >
                    <Check className="h-3 w-3 text-primary" />
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 font-bold text-foreground hover:bg-accent/50 group">
                  {currentPipeline?.name || 'Selecionar'}
                  {isAdmin && (
                    <Pencil 
                      className="h-2.5 w-2.5 ml-1 opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity" 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentPipeline) {
                          setEditingPipelineId(currentPipeline.id);
                          setEditingPipelineName(currentPipeline.name);
                        }
                      }}
                    />
                  )}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {pipelines.map(pipeline => (
                <DropdownMenuItem 
                  key={pipeline.id}
                  onClick={() => setSelectedPipelineId(pipeline.id)}
                  className="flex items-center justify-between"
                >
                  <span className={cn(pipeline.id === selectedPipelineId && "font-semibold")}>
                    {pipeline.name}
                  </span>
                  {isAdmin && pipeline.id !== selectedPipelineId && pipelines.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-50 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePipeline(pipeline.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </DropdownMenuItem>
              ))}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setNewPipelineDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Pipeline
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-4 bg-border mx-1" />

          {canEditPipeline && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setStagesEditorOpen(true)}
                    disabled={!selectedPipelineId}
                  >
                    <Settings className="h-4 w-4 text-foreground/70 hover:text-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Configurar Colunas</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Search Field */}
        <div className="relative group">
          <Search className={cn(
            "absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground transition-colors",
            searchInput && "text-primary"
          )} />
          <Input
            placeholder="Buscar lead..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-8 w-[180px] lg:w-[240px] pl-8 text-xs bg-muted/40 border-border hover:border-primary/50 focus:bg-background focus-visible:ring-primary/20 transition-all"
          />
          {leadsLoading && searchInput && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Sync Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "h-8 w-8 transition-colors",
                  isRefreshing && "text-primary border-primary bg-primary/5"
                )}
                onClick={handleManualRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sincronizar Atualizações</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Date Filter */}
        <DateFilterPopover
          datePreset={datePreset}
          onDatePresetChange={setDatePreset}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
          triggerClassName="h-8 w-auto min-w-[140px] text-xs justify-start flex-shrink-0 bg-background"
        />

        {/* Consolidated Filters Button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className={cn(
                "h-8 px-3 gap-2 text-xs font-medium bg-background transition-all",
                ((filterUser && filterUser !== 'all') || (filterTag && filterTag !== 'all') || (filterDealStatus && filterDealStatus !== 'all') || (filterCampaign !== 'all' || filterAdSet !== 'all' || filterAd !== 'all') || searchQuery) && "border-primary text-primary bg-primary/5"
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              Filtros
              {((filterUser && filterUser !== 'all') || (filterTag && filterTag !== 'all') || (filterDealStatus && filterDealStatus !== 'all') || (filterCampaign !== 'all' || filterAdSet !== 'all' || filterAd !== 'all') || (filterSource && filterSource !== 'all') || searchQuery) && (
                <Badge variant="default" className="h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary">
                  {[
                    filterUser && filterUser !== 'all',
                    filterTag && filterTag !== 'all',
                    filterDealStatus && filterDealStatus !== 'all',
                    filterCampaign !== 'all' || filterAdSet !== 'all' || filterAd !== 'all',
                    filterSource && filterSource !== 'all',
                    searchQuery
                  ].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-4 space-y-4 border-border/50">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase text-muted-foreground/70 tracking-wider">Responsável</Label>
                {(isAdmin || hasLeadViewAll) ? (
                  <Select value={filterUser} onValueChange={setFilterUser}>
                    <SelectTrigger className="h-10 text-sm bg-muted/30">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os usuários</SelectItem>
                      {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-muted/50 h-10">
                    <span className="text-sm font-medium">{profile?.name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase text-muted-foreground/70 tracking-wider">Etiquetas (Tags)</Label>
                <Select value={filterTag} onValueChange={setFilterTag}>
                  <SelectTrigger className="h-10 text-sm bg-muted/30">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as tags</SelectItem>
                    {allTags.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase text-muted-foreground/70 tracking-wider">Status do Negócio</Label>
                <Select value={filterDealStatus} onValueChange={setFilterDealStatus}>
                  <SelectTrigger className="h-10 text-sm bg-muted/30">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="open">Em Aberto</SelectItem>
                    <SelectItem value="won">Ganho (Fechado)</SelectItem>
                    <SelectItem value="lost">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-[11px] font-bold uppercase text-muted-foreground/70 tracking-wider">Meta Ads</Label>
                <div className="grid grid-cols-1 gap-2 p-3 border rounded-lg bg-muted/10">
                  <Select value={filterCampaign} onValueChange={setFilterCampaign}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Campanha" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Campanhas</SelectItem>
                      {metaFilters?.campaigns.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterAdSet} onValueChange={setFilterAdSet}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Conjunto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Conjuntos</SelectItem>
                      {metaFilters?.adsets.map((a: string) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterAd} onValueChange={setFilterAd}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Anúncio (Criativo)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Anúncios</SelectItem>
                      {metaFilters?.ads.map((a: string) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase text-muted-foreground/70 tracking-wider">Origem do Lead</Label>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="h-10 text-sm bg-muted/30">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as origens</SelectItem>
                    {allSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {((filterUser && filterUser !== 'all') || (filterTag && filterTag !== 'all') || (filterDealStatus && filterDealStatus !== 'all') || (filterCampaign !== 'all' || filterAdSet !== 'all' || filterAd !== 'all') || (filterSource && filterSource !== 'all') || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-9 text-destructive hover:text-destructive hover:bg-destructive/5"
                onClick={() => {
                  setFilterUser(isAdmin || hasLeadViewAll ? 'all' : profile?.id);
                  setFilterTag('all');
                  setFilterDealStatus('all');
                  setFilterCampaign('all');
                  setFilterAdSet('all');
                  setFilterAd('all');
                  setFilterSource('all');
                  setSearchInput('');
                  setSearchQuery('');
                }}
              >
                <XCircle className="h-3.5 w-3.5 mr-2" />
                Limpar todos os filtros
              </Button>
            )}
          </PopoverContent>
        </Popover>

        <div className="w-px h-5 bg-border mx-1" />
      </div>
    </div>
  );
};
