import React, { useState } from 'react';
import { 
  Search, 
  RefreshCw, 
  Plus, 
  Settings, 
  Calendar, 
  Filter, 
  Check, 
  Loader2, 
  ChevronDown,
  Trash2,
  Pencil,
  X,
  SlidersHorizontal,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AdvancedFiltersPopover } from '@/components/filters/AdvancedFiltersPopover';
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
import { DateFilterPopover } from '@/components/ui/date-filter-popover';
import { cn } from '@/lib/utils';
import { DatePreset } from '@/hooks/use-dashboard-filters';

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
  const hasExtraFilters = (filterUser && filterUser !== 'all') || 
                          (filterTag && filterTag !== 'all') || 
                          (filterDealStatus && filterDealStatus !== 'all') || 
                          (filterCampaign && filterCampaign !== 'all') || 
                          (filterAdSet && filterAdSet !== 'all') || 
                          (filterAd && filterAd !== 'all') || 
                          (filterSource && filterSource !== 'all') || 
                          searchInput;

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setFilterUser(isAdmin || hasLeadViewAll ? 'all' : (profile?.id || 'all'));
    setFilterTag('all');
    setFilterDealStatus('all');
    setFilterCampaign('all');
    setFilterAdSet('all');
    setFilterAd('all');
    setFilterSource('all');
  };

  const showResponsibleFilter = isAdmin || hasLeadViewAll;

  const PipelineSelector = () => (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 px-2 gap-2 hover:bg-muted font-bold text-base">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <span className="truncate max-w-[150px] sm:max-w-[200px]">{currentPipeline?.name || 'Pipeline'}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 p-1">
          <p className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Suas Pipelines</p>
          {pipelines.map(pipeline => (
            <DropdownMenuItem 
              key={pipeline.id}
              onClick={() => setSelectedPipelineId(pipeline.id)}
              className={cn(
                "flex items-center justify-between cursor-pointer rounded-sm py-2",
                pipeline.id === selectedPipelineId && "bg-primary/10 text-primary"
              )}
            >
              <span className={cn("font-medium", pipeline.id === selectedPipelineId && "font-bold")}>
                {pipeline.name}
              </span>
              {pipeline.id === selectedPipelineId && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
          {isAdmin && (
            <>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem 
                onClick={() => setNewPipelineDialogOpen(true)}
                className="cursor-pointer py-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Pipeline
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {isAdmin && selectedPipelineId && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                onClick={() => {
                  setEditingPipelineId(selectedPipelineId);
                  setEditingPipelineName(currentPipeline?.name || '');
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar pipeline</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col gap-3 mb-4 px-1">
        <div className="flex items-center justify-between">
          <PipelineSelector />
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-9 w-9 border-border/60", 
                isRefreshing && "text-primary border-primary bg-primary/5"
              )}
              onClick={handleManualRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>

            <DateFilterPopover
              datePreset={datePreset}
              onDatePresetChange={setDatePreset}
              customDateRange={customDateRange}
              onCustomDateRangeChange={setCustomDateRange}
              triggerClassName="h-9 px-2 border-border/60"
              align="end"
            />

            <AdvancedFiltersPopover
              isMobile={true}
              showResponsible={showResponsibleFilter}
              search={searchInput}
              onSearchChange={setSearchInput}
              responsibleId={filterUser}
              onResponsibleChange={setFilterUser}
              tagId={filterTag}
              onTagChange={setFilterTag}
              status={filterDealStatus}
              onStatusChange={setFilterDealStatus}
              source={filterSource}
              onSourceChange={setFilterSource}
              campaignId={filterCampaign}
              onCampaignChange={setFilterCampaign}
              adSetId={filterAdSet}
              onAdSetChange={setFilterAdSet}
              adId={filterAd}
              onAdChange={setFilterAd}
              users={users}
              allTags={allTags}
              allSources={allSources}
              onClear={handleClearFilters}
              align="end"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex items-center justify-between p-0">
        <div className="flex items-center gap-2">
          <PipelineSelector />
          
          <div className="h-6 w-px bg-border/60" />

          {canEditPipeline && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 text-[11px] font-bold uppercase tracking-wider border-border/60 hover:border-primary/50 transition-colors"
              onClick={() => setStagesEditorOpen(true)}
              disabled={!selectedPipelineId}
            >
              <Settings className="h-3.5 w-3.5" />
              Configurar Colunas
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop Search */}
          <div className="relative group mr-2">
            <Search className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary",
              searchInput && "text-primary"
            )} />
            <Input
              placeholder="Buscar leads..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-8 w-[200px] pl-9 bg-muted/40 border-border/60 focus:bg-background transition-all text-xs"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-8 w-8 border-border/60 hover:border-primary/50 transition-colors", 
              isRefreshing && "text-primary border-primary bg-primary/5"
            )}
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Atualizar pipeline"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>

          <DateFilterPopover
            datePreset={datePreset}
            onDatePresetChange={setDatePreset}
            customDateRange={customDateRange}
            onCustomDateRangeChange={setCustomDateRange}
            triggerClassName={cn(
              "h-8 gap-2 text-[11px] font-semibold uppercase tracking-wider px-3 border-border/60 hover:border-primary/50 transition-colors",
              (datePreset !== 'last30days' || customDateRange) && "border-primary/50 bg-primary/5 text-primary"
            )}
            align="end"
          />

          <AdvancedFiltersPopover
            showResponsible={showResponsibleFilter}
            responsibleId={filterUser}
            onResponsibleChange={setFilterUser}
            tagId={filterTag}
            onTagChange={setFilterTag}
            status={filterDealStatus}
            onStatusChange={setFilterDealStatus}
            source={filterSource}
            onSourceChange={setFilterSource}
            campaignId={filterCampaign}
            onCampaignChange={setFilterCampaign}
            adSetId={filterAdSet}
            onAdSetChange={setFilterAdSet}
            adId={filterAd}
            onAdChange={setFilterAd}
            users={users}
            allTags={allTags}
            allSources={allSources}
            onClear={handleClearFilters}
            align="end"
          />

          {/* Botão rápido de limpar se houver filtros ativos */}
          {hasExtraFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-destructive transition-colors"
              onClick={handleClearFilters}
              title="Limpar todos os filtros"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            size="sm"
            className="h-8 px-4 font-bold text-[11px] uppercase tracking-wider"
            onClick={() => openNewLeadDialog()}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Lead
          </Button>
        </div>
      </div>
    </div>
  );
};