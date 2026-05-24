import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { 
  Plus, 
  MoreHorizontal, 
  Loader2,
  Clock,
  Calendar,
  Tags,
  Trophy,
  XCircle,
  CircleDot,
  RefreshCw,
  Check, 
  Pencil, 
  ChevronDown,
  Settings,
  Filter,
  Search,
  LayoutGrid
} from 'lucide-react';
import { StageSettingsDialog } from '@/components/pipelines/StageSettingsDialog';
import { PipelineSlaSettings } from '@/components/pipelines/PipelineSlaSettings';
import { StagesEditorDialog } from '@/components/pipelines/StagesEditorDialog';
import { SharedFilters } from '@/components/shared/SharedFilters';
import { useSharedFilters } from '@/hooks/use-shared-filters';


import { startOfDay, endOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LeadCard } from '@/components/leads/LeadCard';
import { LeadDetailDialog } from '@/components/leads/LeadDetailDialog';
import { DatePreset, getDateRangeFromPreset, datePresetOptions } from '@/hooks/use-dashboard-filters';
import { useFilters } from '@/contexts/FilterContext';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SlidersHorizontal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { useStages, useStagesWithLeads, usePipelines, useCreatePipeline, useUpdatePipeline, useDeletePipeline, useCreateStage, useLeadMetaFilters } from '@/hooks/use-stages';
import { useLoadMoreLeads } from '@/hooks/use-stages';
import { CreateLeadDialog } from '@/components/leads/CreateLeadDialog';
import { useOrganizationUsers } from '@/hooks/use-users';
import { useTags } from '@/hooks/use-tags';
import { useAssignLeadRoundRobin } from '@/hooks/use-assign-lead-roundrobin';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCanEditCadences } from '@/hooks/use-can-edit-cadences';

import { useHasPermission } from '@/hooks/use-organization-roles';
import { notifyLeadMoved } from '@/hooks/use-lead-notifications';
import { useRecordFirstResponseOnAction } from '@/hooks/use-first-response';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Helper to format currency compactly (pt-BR locale)
const formatCompactCurrency = (value: number): string => {
  if (value >= 1_000_000) {
    const v = value / 1_000_000;
    const formatted = v.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: v % 1 === 0 ? 0 : 1 });
    return `R$${formatted}M`;
  } else if (value >= 1_000) {
    const v = value / 1_000;
    const formatted = v.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 0 });
    return `R$${formatted}K`;
  }
  return `R$${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
};

export default function Pipelines() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, organization } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isTelecom = organization?.segment === 'telecom';
  const newButtonLabel = isTelecom ? 'Novo Cliente' : 'Novo Lead';
  
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [newLeadDialogOpen, setNewLeadDialogOpen] = useState(false);
  const [newLeadStageId, setNewLeadStageId] = useState<string | null>(null);
  // newLeadForm agora é gerenciado pelo CreateLeadDialog
  const {
    filters: sharedFilters,
    datePreset,
    setDatePreset,
    customDateRange,
    setCustomDateRange,
    setTeamId,
    userId: filterUser,
    setUserId: setFilterUser,
    tagId: filterTag,
    setTagId: setFilterTag,
    dealStatus: filterDealStatus,
    setDealStatus: setFilterDealStatus,
    campaignId: filterCampaign,
    setCampaignId: setFilterCampaign,
    adSetId: filterAdSet,
    setAdSetId: setFilterAdSet,
    adId: filterAd,
    setAdId: setFilterAd,
    source: filterSource,
    setSource: setFilterSource,
    searchQuery,
    setSearchQuery,
    clearFilters,
    hasActiveFilters: hasSharedActiveFilters,
    dynamicSources,
    campaigns,
    adSets,
    ads,
    tags: allTagsFromHook,
    isLoadingSources,
    isLoadingCampaigns,
    isLoadingAdSets,
    isLoadingAds,
  } = useSharedFilters();

  const [searchInput, setSearchInput] = useState('');

  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState('');
  const [settingsStage, setSettingsStage] = useState<any | null>(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [newPipelineDialogOpen, setNewPipelineDialogOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null);
  const [editingPipelineName, setEditingPipelineName] = useState('');
  const [newStageDialogOpen, setNewStageDialogOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#6b7280');
  const [slaSettingsOpen, setSlaSettingsOpen] = useState(false);
  const [stagesEditorOpen, setStagesEditorOpen] = useState(false);
  // useSharedFilters handles dateRange now
  const dateRange = sharedFilters.dateRange;

  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Ref para bloquear refetch durante drag-and-drop (evita race condition)
  const isDraggingRef = useRef(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [pendingDragResult, setPendingDragResult] = useState<DropResult | null>(null);

  const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines();
  const createPipeline = useCreatePipeline();
  const updatePipeline = useUpdatePipeline();
  const deletePipeline = useDeletePipeline();
  const createStage = useCreateStage();
  const loadMoreLeads = useLoadMoreLeads();
  const { data: metaFilters } = useLeadMetaFilters();
  
  // Set initial pipeline when pipelines load
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
      setSelectedPipelineId(defaultPipeline.id);
    }
  }, [pipelines, selectedPipelineId]);
  
  // Check if user has lead_view_all permission
  const { data: hasLeadViewAll = false, isLoading: permissionLoading } = useHasPermission('lead_view_all');
  
  // Check if user has pipeline_lock permission (restricts drag-and-drop)
  const { data: hasPipelineLock = false } = useHasPermission('pipeline_lock');
  
  // Determine if drag should be disabled: user has pipeline_lock AND is not admin
  const isDragDisabled = hasPipelineLock && !isAdmin;
  
  // Check if user is a team leader (can edit cadences = is admin OR team leader)
  const isTeamLeader = useCanEditCadences();
  
  // Set initial filter based on user role, permissions, AND team leadership
  // Wait for permission to load before deciding the filter
  useEffect(() => {
    if (filterUser === null && profile?.id && !permissionLoading) {
      // For admin, super_admin, users with lead_view_all permission, OR team leaders: show all
      if (isAdmin || hasLeadViewAll || isTeamLeader) {
        setFilterUser('all');
      } else {
        // For regular users without permission, pre-select their own name
        setFilterUser(profile.id);
      }
    }
  }, [profile, isAdmin, filterUser, hasLeadViewAll, permissionLoading, isTeamLeader]);
  
  // Date range is now handled by FilterContext


  const { data: baseStages = [], isLoading: baseStagesLoading } = useStages(selectedPipelineId || undefined);

  const { data: stagesWithLeads = [], isLoading: leadsLoading, refetch } = useStagesWithLeads(
    selectedPipelineId || undefined, 
    filterUser === 'all' ? undefined : (filterUser || undefined),
    {
      dateRange,
      filterTag: filterTag && filterTag !== 'all' ? filterTag : undefined,
      filterDealStatus: filterDealStatus && filterDealStatus !== 'all' ? filterDealStatus : undefined,
      searchQuery: searchQuery || undefined,
      filterCampaign: filterCampaign && filterCampaign !== 'all' ? filterCampaign : undefined,
      filterAdSet: filterAdSet && filterAdSet !== 'all' ? filterAdSet : undefined,
      filterAd: filterAd && filterAd !== 'all' ? filterAd : undefined,
      filterSource: filterSource && filterSource !== 'all' ? filterSource : undefined,
    }
  );

  // Log de auditoria de filtros ativos
  useEffect(() => {
    const activeFilters = {
      period: datePreset,
      search: searchQuery,
      tag: filterTag,
      status: filterDealStatus,
      source: filterSource,
      campaign: filterCampaign,
      adset: filterAdSet,
      ad: filterAd,
      responsible: filterUser
    };
    
    const count = Object.values(activeFilters).filter(v => v && v !== 'all' && v !== '').length;
    if (count > 0) {
      console.log('Pipeline active filters:', activeFilters);
    }
  }, [datePreset, searchQuery, filterTag, filterDealStatus, filterSource, filterCampaign, filterAdSet, filterAd, filterUser]);

  // Combine base stages with leads data when available
  const stages = useMemo(() => {
    if (stagesWithLeads.length > 0) return stagesWithLeads;
    return baseStages.map(s => ({ ...s, leads: [], total_lead_count: s.lead_count || 0, has_more: false }));
  }, [baseStages, stagesWithLeads]);

  const { data: users = [] } = useOrganizationUsers();
  const { data: allTags = [] } = useTags();
  // createLead agora é gerenciado pelo CreateLeadDialog
  const assignLeadRoundRobin = useAssignLeadRoundRobin();
  const canEditPipeline = useCanEditCadences();
  const { recordFirstResponse } = useRecordFirstResponseOnAction();
  const isMobile = useIsMobile();
  
  const allSources = useMemo(() => {
    const sources = new Set<string>();
    stages.forEach(stage => {
      stage.leads?.forEach((lead: any) => {
        if (lead.source) sources.add(lead.source);
      });
    });
    return Array.from(sources).sort();
  }, [stages]);

  const currentPipeline = pipelines.find(p => p.id === selectedPipelineId);
  const isLoading = pipelinesLoading || baseStagesLoading;
  const isInitialLeadsLoading = leadsLoading && stagesWithLeads.length === 0;

  // Handler para carregar mais leads de uma coluna específica
  const handleLoadMore = useCallback((stageId: string) => {
    if (!selectedPipelineId) return;
    
    const stage = stages.find(s => s.id === stageId);
    const currentCount = stage?.leads?.length || 0;
    
    loadMoreLeads.mutate({
      pipelineId: selectedPipelineId,
      stageId,
      offset: currentCount,
      filterUserId: filterUser === 'all' ? undefined : (filterUser || undefined),
      filters: {
        dateRange,
        filterTag: filterTag && filterTag !== 'all' ? filterTag : undefined,
        filterDealStatus: filterDealStatus && filterDealStatus !== 'all' ? filterDealStatus : undefined,
        searchQuery: searchQuery || undefined,
        filterCampaign: filterCampaign && filterCampaign !== 'all' ? filterCampaign : undefined,
        filterAdSet: filterAdSet && filterAdSet !== 'all' ? filterAdSet : undefined,
        filterAd: filterAd && filterAd !== 'all' ? filterAd : undefined,
        filterSource: filterSource && filterSource !== 'all' ? filterSource : undefined,
      },
    });
  }, [selectedPipelineId, stages, loadMoreLeads, filterUser, dateRange, filterTag, filterDealStatus, searchQuery, filterCampaign, filterAdSet, filterAd, filterSource]);

  // Real-time subscription for leads and tags updates
  useEffect(() => {
    if (!profile?.organization_id) return;

    // Debounce timeout para evitar flickering visual
    let refetchTimeout: ReturnType<typeof setTimeout>;
    
    const debouncedRefetch = () => {
      // NÃO refetch durante drag-and-drop ativo (evita race condition)
      if (isDraggingRef.current) return;
      
      clearTimeout(refetchTimeout);
      refetchTimeout = setTimeout(() => {
        if (isDraggingRef.current) return;
        refetch();
      }, 2000); // Aumentado para 2s para garantir estabilidade pós-automações
    };
    
    const channel = supabase
      .channel('pipeline-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `organization_id=eq.${profile.organization_id}`,
        },
        debouncedRefetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.organization_id, refetch]);

  // Manter selectedLead sincronizado com os dados mais recentes
  useEffect(() => {
    if (selectedLead && stages.length > 0) {
      for (const stage of stages) {
        const updatedLead = stage.leads?.find((l: any) => l.id === selectedLead.id);
        if (updatedLead) {
          // Compare key fields to avoid circular reference issues with JSON.stringify
          const hasChanged = 
            updatedLead.stage_id !== selectedLead.stage_id ||
            updatedLead.deal_status !== selectedLead.deal_status ||
            updatedLead.assigned_user_id !== selectedLead.assigned_user_id ||
            updatedLead.name !== selectedLead.name ||
            updatedLead.updated_at !== selectedLead.updated_at;
          
          if (hasChanged) {
            setSelectedLead(updatedLead);
          }
          break;
        }
      }
    }
  }, [stages]);

  // Open lead from URL query param (from notification click)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const leadId = params.get('lead_id') || params.get('lead');
   const timestamp = params.get('t'); // Usar timestamp como dependência para forçar re-execução
    
    if (leadId && stages.length > 0) {
      // Find lead in any stage
      for (const stage of stages) {
        const lead = stage.leads?.find((l: any) => l.id === leadId);
        if (lead) {
          setSelectedLead(lead);
          // Clear the URL param after opening
          navigate('/crm/pipelines', { replace: true });
          return;
        }
      }
      // Lead não encontrado nos stages carregados - buscar diretamente no banco
      const fetchLead = async () => {
        try {
          const { data: lead, error } = await supabase
            .from('leads')
            .select(`
              *,
              assigned_user:profiles!leads_assigned_user_id_fkey(id, name, avatar_url),
              stage:stages(id, name, color),
              tags:lead_tags(tag:tags(id, name, color))
            `)
            .eq('id', leadId)
            .single();
          
          if (!error && lead) {
            // Transformar tags para o formato esperado pelo LeadDetailDialog
            const formattedLead = {
              ...lead,
              tags: lead.tags?.map((lt: any) => lt.tag) || []
            };
            setSelectedLead(formattedLead);
            navigate('/crm/pipelines', { replace: true });
          }
        } catch (err) {
          console.error('Error fetching lead from URL:', err);
        }
      };
      
      fetchLead();
    }
  }, [location.search, stages, navigate]); // timestamp implícito via location.search

  const queryClient = useQueryClient();

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Regra de Fechamento (Plenos Obras)
    const targetStage = stages.find(s => s.id === destination.droppableId);
    if (targetStage?.name?.toLowerCase().includes('fechamento') || targetStage?.name?.toLowerCase().includes('contrato')) {
      setPendingDragResult(result);
      setConfirmationDialogOpen(true);
      return;
    }

    if (executeLeadMove) executeLeadMove(result);
  }, [stages]);

  const executeLeadMove = useCallback(async (result: DropResult) => {
    // Marcar que estamos em processo de drag (bloqueia refetch da subscription)
    isDraggingRef.current = true;
    
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const newStageId = destination.droppableId;
    const oldStageId = source.droppableId;
    const oldStage = stages.find(s => s.id === oldStageId);
    const newStage = stages.find(s => s.id === newStageId);
    
    // IMMEDIATE optimistic update - move card visually first
    // Cache key must match useStagesWithLeads queryKey
    const dateFromISO = dateRange?.from?.toISOString();
    const dateToISO = dateRange?.to?.toISOString();
    const effectiveFilterTag = filterTag !== 'all' ? filterTag : undefined;
    const effectiveFilterDealStatus = filterDealStatus !== 'all' ? filterDealStatus : undefined;
    const effectiveSearchQuery = searchQuery || undefined;
    const effectiveFilterCampaign = filterCampaign !== 'all' ? filterCampaign : undefined;
    const effectiveFilterAdSet = filterAdSet !== 'all' ? filterAdSet : undefined;
    const effectiveFilterAd = filterAd !== 'all' ? filterAd : undefined;

    const queryKey = [
      'stages-with-leads', 
      selectedPipelineId, 
      filterUser, 
      dateFromISO, 
      dateToISO, 
      effectiveFilterTag, 
      effectiveFilterDealStatus, 
      effectiveSearchQuery,
      effectiveFilterCampaign,
      effectiveFilterAdSet,
      effectiveFilterAd,
      filterSource
    ];
    const previousData = queryClient.getQueryData(queryKey);
    
    queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
      if (!old) return old;
      
      // Encontra o lead na coluna de origem
      const sourceStageIndex = old.findIndex(s => s.id === oldStageId);
      const destStageIndex = old.findIndex(s => s.id === newStageId);
      
      if (sourceStageIndex === -1 || destStageIndex === -1) return old;
      
      const newStages = old.map(stage => ({
        ...stage,
        leads: [...(stage.leads || [])],
      }));
      
      // Remove o lead da coluna de origem
      const leadIndex = newStages[sourceStageIndex].leads.findIndex((l: any) => l.id === draggableId);
      if (leadIndex === -1) return old;
      
      const [movedLead] = newStages[sourceStageIndex].leads.splice(leadIndex, 1);
      
      // Atualiza o stage_id do lead (deal_status será aplicado depois se houver automação)
      const updatedLead = {
        ...movedLead,
        stage_id: newStageId,
        stage_entered_at: new Date().toISOString(),
        stage: newStages[destStageIndex],
      };
      
      // Insere na posição correta na coluna de destino
      newStages[destStageIndex].leads.splice(destination.index, 0, updatedLead);
      
      return newStages;
    });
    
    try {
      // Update lead stage in database first
      const updateResult = await supabase
        .from('leads')
        .update({ 
          stage_id: newStageId,
          stage_entered_at: new Date().toISOString(),
        })
        .eq('id', draggableId);
      
      if (updateResult.error) throw updateResult.error;
      
      // Fetch stage automations separately (don't block on failure)
      let automationsResult: any = { data: [] };
      try {
        automationsResult = await supabase
          .from('stage_automations')
          .select('automation_type, action_config')
          .eq('stage_id', newStageId)
          .eq('is_active', true);
      } catch (e) {
        console.warn('Failed to fetch stage automations:', e);
      }
      
      // Apply deal_status from automation as a SECOND optimistic update
      const statusAutomation = automationsResult.data?.find(
        (a: any) => a.automation_type === 'change_deal_status_on_enter'
      );
      const actionConfig = statusAutomation?.action_config as Record<string, unknown> | null;
      const newDealStatus = actionConfig?.deal_status as string | undefined;
      
      if (newDealStatus) {
        queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
          if (!old) return old;
          return old.map(stage => ({
            ...stage,
            leads: (stage.leads || []).map((l: any) => 
              l.id === draggableId ? {
                ...l,
                deal_status: newDealStatus,
                won_at: newDealStatus === 'won' ? new Date().toISOString() : l.won_at,
                lost_at: newDealStatus === 'lost' ? new Date().toISOString() : l.lost_at,
              } : l
            ),
          }));
        });
      }
      
      // Invalidar cache de activities
      queryClient.invalidateQueries({ queryKey: ['activities', draggableId] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', draggableId] });
      
      // Registrar first response ao mover lead (stage_move)
      const movedLeadForResponse = stages.find(s => s.id === oldStageId)?.leads?.find((l: any) => l.id === draggableId);
      if (movedLeadForResponse) {
        recordFirstResponse({
          leadId: draggableId,
          organizationId: profile?.organization_id || movedLeadForResponse.organization_id || '',
          channel: 'stage_move',
          actorUserId: profile?.id || null,
          firstResponseAt: movedLeadForResponse.first_response_at,
        });
      }
      
      // Toast dinâmico baseado nas automações
      if (newDealStatus) {
        const statusLabels: Record<string, string> = {
          won: 'Ganho',
          lost: 'Perdido',
          open: 'Aberto'
        };
        const statusLabel = statusLabels[newDealStatus] || newDealStatus;
        toast.success(`Lead alterado para ${statusLabel}`, {
          description: `Movido para ${newStage?.name}`
        });
      } else {
        toast.success(`Lead movido para ${newStage?.name}`);
      }
      
      // Registrar atividade de gamificação (sempre registrar stage_change para capturar vendas e propostas)
      await supabase.from('activities').insert({
        lead_id: draggableId,
        user_id: profile?.id,
        type: 'stage_change',
        content: `Lead movido para ${newStage?.name} via Pipeline`,
        metadata: {
          old_stage_id: oldStageId,
          new_stage_id: newStageId,
          old_stage_name: oldStage?.name,
          new_stage_name: newStage?.name,
          new_status: newDealStatus || null
        }
      });

      // Disparar automações de fluxo (automations table) para mudança de etapa
      supabase.functions.invoke('automation-trigger', {
        body: {
          event_type: 'lead_stage_changed',
          data: {
            lead_id: draggableId,
            old_stage_id: oldStageId,
            new_stage_id: newStageId,
          },
        },
      }).catch(err => console.error('Erro ao disparar automação de etapa:', err));
      
      // Notificar partes interessadas para Telecom
      if (isTelecom && profile?.organization_id && selectedPipelineId) {
        // Buscar dados do lead para obter nome e assigned_user_id
        const sourceStage = stages.find(s => s.id === oldStageId);
        const movedLead = sourceStage?.leads?.find((l: any) => l.id === draggableId);
        
        if (movedLead) {
          notifyLeadMoved({
            leadId: draggableId,
            leadName: movedLead.name,
            organizationId: profile.organization_id,
            pipelineId: selectedPipelineId,
            fromStage: oldStage?.name || 'Desconhecido',
            toStage: newStage?.name || 'Desconhecido',
            assignedUserId: movedLead.assigned_user_id,
          }).catch(err => console.error('Erro ao notificar movimentação:', err));
        }
      }
      
      // Forçar refetch para garantir sincronização com banco (trigger pode ter alterado outros campos)
      await refetch();
      
    } catch (error: any) {
      // Rollback em caso de erro
      queryClient.setQueryData(queryKey, previousData);
      toast.error('Erro ao mover lead: ' + error.message);
    } finally {
      // Liberar flag após delay para evitar flash visual da subscription
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 500);
    }
  }, [stages, dateRange, filterTag, filterDealStatus, searchQuery, filterCampaign, filterAdSet, filterAd, selectedPipelineId, filterUser, queryClient, recordFirstResponse, refetch, isTelecom, profile]);

  // handleCreateLead agora é gerenciado pelo CreateLeadDialog

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Atualizado!', { duration: 1500 });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const openNewLeadDialog = (stageId?: string) => {
    setNewLeadStageId(stageId || null);
    setNewLeadDialogOpen(true);
  };

  const handleStageName = async (stageId: string) => {
    if (!editingStageName.trim()) {
      setEditingStageId(null);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('stages')
        .update({ name: editingStageName.trim() })
        .eq('id', stageId);
      
      if (error) throw error;
      toast.success('Nome atualizado!');
      refetch();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    }
    setEditingStageId(null);
  };

  // Debounce search input → searchQuery
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const deferredSearch = searchQuery;
  
  // Server-side search when there are stages with has_more and user is searching
  const hasMoreLeads = stages.some((s: any) => s.has_more);
  const [serverSearchResults, setServerSearchResults] = useState<any[]>([]);
  const [isServerSearching, setIsServerSearching] = useState(false);
  
  useEffect(() => {
    if (!deferredSearch || !hasMoreLeads || !selectedPipelineId) {
      setServerSearchResults([]);
      return;
    }
    
    let cancelled = false;
    const doSearch = async () => {
      setIsServerSearching(true);
      try {
        // Search ALL leads in this pipeline matching the query
        let query = (supabase as any)
          .from('leads')
          .select(`
            id, name, phone, email, source, created_at,
            stage_id, assigned_user_id, pipeline_id, message,
            stage_entered_at, organization_id,
            deal_status, valor_interesse, property_id, lost_reason, won_at, lost_at,
            interest_property_id, interest_plan_id,
            first_response_at, first_response_seconds, first_response_is_automation,
            assignee:users!leads_assigned_user_id_fkey(id, name, avatar_url),
            interest_property:properties!leads_interest_property_id_fkey(id, code, title, preco),
            interest_plan:service_plans!leads_interest_plan_id_fkey(id, code, name, price)
          `)
          .eq('pipeline_id', selectedPipelineId)
          .or(`name.ilike.%${deferredSearch}%,phone.ilike.%${deferredSearch}%`)
          .limit(50);
        
        const { data, error } = await query;
        if (error || cancelled) return;
        
        // Fetch tags for these leads
        const leadIds = (data || []).map((l: any) => l.id);
        let tagsByLead: Record<string, any[]> = {};
        if (leadIds.length > 0) {
          const { data: leadTags } = await supabase
            .from('lead_tags')
            .select('lead_id, tag:tags(id, name, color)')
            .in('lead_id', leadIds);
          tagsByLead = (leadTags || []).reduce((acc: any, lt: any) => {
            if (!acc[lt.lead_id]) acc[lt.lead_id] = [];
            if (lt.tag) acc[lt.lead_id].push(lt.tag);
            return acc;
          }, {});
        }
        
        if (!cancelled) {
          setServerSearchResults((data || []).map((l: any) => ({
            ...l,
            tags: tagsByLead[l.id] || [],
            tasks_count: { pending: 0, completed: 0 },
          })));
        }
      } catch (err) {
        console.error('Server search error:', err);
      } finally {
        if (!cancelled) setIsServerSearching(false);
      }
    };
    
    doSearch();
    return () => { cancelled = true; };
  }, [deferredSearch, hasMoreLeads, selectedPipelineId]);
  

  
  // Filters are now applied server-side; we merge server results AND apply a local filter for instant feedback
  const filteredStages = useMemo(() => {
    return stages.map(stage => {
      let stageLeads = [...(stage.leads || [])];
      
      // Local filtering for instant feedback while typing
      if (searchInput) {
        const lowerSearch = searchInput.toLowerCase();
        stageLeads = stageLeads.filter((lead: any) => {
          const nameMatch = lead.name?.toLowerCase().includes(lowerSearch);
          const phoneMatch = lead.phone?.includes(lowerSearch);
          const emailMatch = lead.email?.toLowerCase().includes(lowerSearch);
          return nameMatch || phoneMatch || emailMatch;
        });
      }

      // If searching and we have server results, merge leads not already loaded
      if (deferredSearch && serverSearchResults.length > 0) {
        const loadedIds = new Set(stageLeads.map((l: any) => l.id));
        const extraLeads = serverSearchResults.filter(
          (l: any) => l.stage_id === stage.id && !loadedIds.has(l.id)
        );
        stageLeads = [...stageLeads, ...extraLeads];
      }
      
      return {
        ...stage,
        leads: stageLeads,
      };
    });
  }, [stages, searchInput, deferredSearch, serverSearchResults]);

  // Compute VGV from filteredStages so badge always matches visible leads
  const stageVGVMap = useMemo(() => {
    const map = new Map<string, { openVGV: number }>();
    for (const stage of filteredStages) {
      let openVGV = 0;
      for (const lead of stage.leads || []) {
        if (lead.deal_status !== 'won' && lead.deal_status !== 'lost') {
          openVGV += lead.valor_interesse || lead.interest_property?.preco || lead.interest_plan?.price || 0;
        }
      }
      if (openVGV > 0) map.set(stage.id, { openVGV });
    }
    return map;
  }, [filteredStages]);

  const stageCountMetaMap = useMemo(() => {
    const map = new Map<string, { total: number; visible: number; remaining: number; canLoadMore: boolean }>();

    for (const stage of filteredStages) {
      const visible = stage.leads?.length || 0;
      // Use total_lead_count returned from useStagesWithLeads instead of redundant queries
      const total = stage.total_lead_count ?? visible;
      const remaining = Math.max(total - visible, 0);

      map.set(stage.id, {
        total,
        visible,
        remaining,
        canLoadMore: remaining > 0,
      });
    }

    return map;
  }, [filteredStages]);

  if (isLoading) {
    return (
      <AppLayout title="Pipeline">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPipelineName.trim()) return;
    
    try {
      const pipeline = await createPipeline.mutateAsync({ name: newPipelineName.trim() });
      setSelectedPipelineId(pipeline.id);
      setNewPipelineDialogOpen(false);
      setNewPipelineName('');
      toast.success('Pipeline criada com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao criar pipeline: ' + error.message);
    }
  };
  
  const handleDeletePipeline = async (pipelineId: string) => {
    if (pipelines.length <= 1) {
      toast.error('Você precisa ter pelo menos uma pipeline');
      return;
    }
    
    try {
      await deletePipeline.mutateAsync(pipelineId);
      const remaining = pipelines.filter(p => p.id !== pipelineId);
      setSelectedPipelineId(remaining[0]?.id || null);
      toast.success('Pipeline excluída!');
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    }
  };

  return (
    <AppLayout title="Pipeline" disableMainScroll>
      <div className={cn(
        "flex flex-col h-full overflow-hidden",
        isMobile && "pb-4"
      )}>
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
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

              <div className="hidden lg:block h-6 w-px bg-border/60 mx-1" />

              {canEditPipeline && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 text-[11px] font-bold uppercase tracking-wider border-border/60 hover:border-primary/50 transition-colors"
                  onClick={() => setStagesEditorOpen(true)}
                  disabled={!selectedPipelineId}
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Configurar Colunas</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 self-end lg:self-auto">
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

              <SharedFilters
                datePreset={datePreset}
                onDatePresetChange={setDatePreset}
                customDateRange={customDateRange}
                onCustomDateRangeChange={setCustomDateRange}
                teamId={sharedFilters.teamId}
                onTeamChange={(id) => setTeamId(id)}
                userId={filterUser}
                onUserChange={setFilterUser}
                source={filterSource}
                onSourceChange={setFilterSource}
                campaignId={filterCampaign}
                onCampaignChange={setFilterCampaign}
                adSetId={filterAdSet}
                onAdSetChange={setFilterAdSet}
                adId={filterAd}
                onAdChange={setFilterAd}
                tagId={filterTag}
                onTagChange={setFilterTag}
                dealStatus={filterDealStatus}
                onDealStatusChange={setFilterDealStatus}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onClear={clearFilters}
                hasActiveFilters={hasSharedActiveFilters}
                dynamicSources={dynamicSources}
                campaigns={campaigns}
                adSets={adSets}
                ads={ads}
                tags={allTagsFromHook}
                isLoadingSources={isLoadingSources}
                isLoadingCampaigns={isLoadingCampaigns}
                isLoadingAdSets={isLoadingAdSets}
                isLoadingAds={isLoadingAds}
              />

              <Button
                size="sm"
                className="h-8 px-4 font-bold text-[11px] uppercase tracking-wider"
                onClick={() => openNewLeadDialog()}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                {newButtonLabel}
              </Button>
            </div>
          </div>
        </div>


        {/* Floating Action Button (FAB) - Only for Mobile */}
        {isMobile && (
          <div className="fixed bottom-8 right-8 z-50">
            <Button 
              size="lg" 
              className="rounded-full shadow-2xl h-14 px-6 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground border-none transition-all hover:scale-105 active:scale-95"
              onClick={() => openNewLeadDialog()}
            >
              <Plus className="h-5 w-5" />
              <span className="font-bold tracking-tight uppercase text-xs">{newButtonLabel}</span>
            </Button>
          </div>
        )}

        {/* Empty State */}
        {stages.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="font-medium mb-2">Nenhum estágio configurado</h3>
              <p className="text-muted-foreground">
                Configure os estágios do pipeline nas configurações
              </p>
            </CardContent>
          </Card>
        )}

        {/* Kanban Board with Drag and Drop */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className={cn("flex-1 overflow-x-auto overflow-y-auto min-h-0 scrollbar-thin", isMobile ? "pb-3" : "pb-2")}>
            <div className="flex gap-3 h-full min-w-max px-1">
              {filteredStages.map((stage: any) => (
                <div 
                  key={stage.id}
                  className="w-[280px] sm:w-72 flex-shrink-0 flex flex-col rounded-lg overflow-hidden h-full"
                  style={{ backgroundColor: `${stage.color}08` }}
                >
                  {/* Column Header */}
                  <div 
                    className="p-3 flex items-center justify-between border-b"
                    style={{ borderColor: `${stage.color}30` }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      {editingStageId === stage.id && canEditPipeline ? (
                        <Input
                          value={editingStageName}
                          onChange={(e) => setEditingStageName(e.target.value)}
                          onBlur={() => handleStageName(stage.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleStageName(stage.id)}
                          className="h-6 text-sm font-medium"
                          autoFocus
                        />
                      ) : (
                        <h3 
                          className={cn(
                            "font-semibold text-sm truncate transition-colors",
                            canEditPipeline && "cursor-pointer hover:text-primary"
                          )}
                          onClick={() => {
                            if (canEditPipeline) {
                              setEditingStageId(stage.id);
                              setEditingStageName(stage.name);
                            }
                          }}
                        >
                          {stage.name}
                        </h3>
                      )}
                      <Badge 
                        variant="secondary" 
                        className="text-xs shrink-0"
                        style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
                      >
                      {stageCountMetaMap.get(stage.id)?.total ?? stage.total_lead_count ?? stage.leads?.length ?? 0}
                      </Badge>
                      {/* VGV Badge */}
                      {stageVGVMap.get(stage.id)?.openVGV ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant="outline" 
                                className="text-[10px] shrink-0 bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800"
                              >
                                {formatCompactCurrency(stageVGVMap.get(stage.id)?.openVGV || 0)}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">VGV em aberto neste estágio</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 shrink-0"
                        onClick={() => setSettingsStage(stage)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 shrink-0"
                        onClick={() => openNewLeadDialog(stage.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Droppable Area with internal scroll */}
                  <div className="flex-1 overflow-hidden">
                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            "h-full overflow-y-auto px-2 pb-2 space-y-2 pt-2 scrollbar-thin",
                            snapshot.isDraggingOver && "bg-accent/30"
                          )}
                        >
                          {isInitialLeadsLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} className="bg-background/50 animate-pulse rounded-lg h-24 w-full" />
                            ))
                          ) : (
                            stage.leads?.map((lead: any, index: number) => (
                              <LeadCard 
                                key={lead.id} 
                                lead={lead} 
                                index={index}
                                onClick={() => setSelectedLead(lead)}
                                onAssignNow={(leadId) => assignLeadRoundRobin.mutate(leadId)}
                                isDragDisabled={isDragDisabled}
                              />
                            ))
                          )}
                          {provided.placeholder}
                          
                          
                          {/* Botão Carregar Mais */}
                          {stageCountMetaMap.get(stage.id)?.canLoadMore && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs text-muted-foreground hover:text-foreground mt-2"
                              onClick={() => handleLoadMore(stage.id)}
                              disabled={loadMoreLeads.isPending}
                            >
                              {loadMoreLeads.isPending && loadMoreLeads.variables?.stageId === stage.id ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <ChevronDown className="h-3 w-3 mr-1" />
                              )}
                              Carregar mais ({stageCountMetaMap.get(stage.id)?.remaining ?? 0} restantes)
                            </Button>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              ))}
              
              {/* Add New Stage Button - only show if canEditPipeline */}
              {canEditPipeline && (
                <div className="w-72 flex-shrink-0 flex flex-col items-center justify-start pt-4">
                  <Button
                    onClick={() => setNewStageDialogOpen(true)}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6"
                    size="lg"
                  >
                    <Plus className="h-5 w-5" />
                    Nova Coluna
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DragDropContext>

        {/* Lead Detail Dialog */}
        <LeadDetailDialog 
          lead={selectedLead}
          stages={stages}
          onClose={() => setSelectedLead(null)} 
          allTags={allTags}
          allUsers={users}
          refetchStages={refetch}
        />

        {/* Stage Settings Dialog */}
        <StageSettingsDialog
          open={!!settingsStage}
          onOpenChange={(open) => !open && setSettingsStage(null)}
          stage={settingsStage}
          onStageUpdate={() => {
            refetch();
            setSettingsStage(null);
          }}
        />

        {/* New Lead Dialog */}
        <CreateLeadDialog 
          open={newLeadDialogOpen} 
          onOpenChange={setNewLeadDialogOpen}
          defaultStageId={newLeadStageId}
          defaultPipelineId={selectedPipelineId}
        />

        {/* New Pipeline Dialog */}
        <Dialog open={newPipelineDialogOpen} onOpenChange={setNewPipelineDialogOpen}>
            <DialogContent className="max-w-sm w-[90%] sm:w-full rounded-lg">
            <DialogHeader>
              <DialogTitle>Nova Pipeline</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePipeline} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome da Pipeline *</Label>
                <Input
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  placeholder="Ex: Locação, Vendas..."
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" className="w-[40%]" onClick={() => setNewPipelineDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="w-[60%]" disabled={createPipeline.isPending}>
                  {createPipeline.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Pipeline
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* New Stage Dialog */}
        <Dialog open={newStageDialogOpen} onOpenChange={setNewStageDialogOpen}>
          <DialogContent className="w-[90%] sm:max-w-sm sm:w-full rounded-lg">
            <DialogHeader>
              <DialogTitle>Nova Coluna</DialogTitle>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newStageName.trim() || !selectedPipelineId) return;
              
              try {
                await createStage.mutateAsync({
                  pipelineId: selectedPipelineId,
                  name: newStageName.trim(),
                  color: newStageColor,
                });
                setNewStageDialogOpen(false);
                setNewStageName('');
                setNewStageColor('#6b7280');
                toast.success('Coluna criada com sucesso!');
              } catch (error: any) {
                toast.error('Erro ao criar coluna: ' + error.message);
              }
            }} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome da Coluna *</Label>
                <Input
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="Ex: Qualificado, Em Negociação..."
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newStageColor}
                    onChange={(e) => setNewStageColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <Input
                    value={newStageColor}
                    onChange={(e) => setNewStageColor(e.target.value)}
                    placeholder="#6b7280"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" className="w-[40%] rounded-xl" onClick={() => setNewStageDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="w-[60%] rounded-xl" disabled={createStage.isPending}>
                  {createStage.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Coluna
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* SLA Settings Dialog */}
        {selectedPipelineId && (
          <PipelineSlaSettings
            open={slaSettingsOpen}
            onOpenChange={setSlaSettingsOpen}
            pipelineId={selectedPipelineId}
            pipelineName={currentPipeline?.name || ''}
          />
        )}

        {/* Stages Editor Dialog */}
        {selectedPipelineId && (
          <StagesEditorDialog
            open={stagesEditorOpen}
            onOpenChange={setStagesEditorOpen}
            pipelineId={selectedPipelineId}
            pipelineName={currentPipeline?.name || ''}
            stages={stages.map(s => ({
              id: s.id,
              name: s.name,
              color: s.color,
              position: s.position,
              lead_count: s.leads?.length || 0,
            }))}
            onStagesUpdated={() => refetch()}
          />
        )}
      </div>
      <Dialog open={confirmationDialogOpen} onOpenChange={setConfirmationDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmação de Contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Você está movendo este lead para a etapa de Contrato/Fechamento.
            </p>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="recurso_proprio" 
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="recurso_proprio" className="text-sm font-medium leading-none">
                Confirmo que o cliente possui recurso próprio validado.
              </Label>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setConfirmationDialogOpen(false);
              setPendingDragResult(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={() => {
              if (pendingDragResult) {
                executeLeadMove(pendingDragResult);
              }
              setConfirmationDialogOpen(false);
              setPendingDragResult(null);
            }}>
              Confirmar e Mover
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
