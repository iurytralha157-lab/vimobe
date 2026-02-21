import { useState, useEffect, useDeferredValue, useMemo, useCallback, useRef } from 'react';
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
  Filter,
  Search,
  Settings,
  ChevronDown,
  Trash2,
  Clock,
  Calendar,
  Tags,
  Trophy,
  XCircle,
  CircleDot,
  RefreshCw
} from 'lucide-react';
import { StageSettingsDialog } from '@/components/pipelines/StageSettingsDialog';
import { PipelineSlaSettings } from '@/components/pipelines/PipelineSlaSettings';
import { StagesEditorDialog } from '@/components/pipelines/StagesEditorDialog';
import { DateFilterPopover } from '@/components/ui/date-filter-popover';
import { LeadCard } from '@/components/leads/LeadCard';
import { LeadDetailDialog } from '@/components/leads/LeadDetailDialog';
import { DatePreset, getDateRangeFromPreset } from '@/hooks/use-dashboard-filters';
import { isWithinInterval, parseISO } from 'date-fns';
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
import { useStagesWithLeads, usePipelines, useCreatePipeline, useDeletePipeline, useCreateStage } from '@/hooks/use-stages';
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
  const [filterUser, setFilterUser] = useState<string | undefined>(undefined);
  const [filterTag, setFilterTag] = useState<string>('all');
  const [filterDealStatus, setFilterDealStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState('');
  const [settingsStage, setSettingsStage] = useState<any | null>(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [newPipelineDialogOpen, setNewPipelineDialogOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newStageDialogOpen, setNewStageDialogOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#6b7280');
  const [slaSettingsOpen, setSlaSettingsOpen] = useState(false);
  const [stagesEditorOpen, setStagesEditorOpen] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('last30days');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Ref para bloquear refetch durante drag-and-drop (evita race condition)
  const isDraggingRef = useRef(false);
  
  const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines();
  const createPipeline = useCreatePipeline();
  const deletePipeline = useDeletePipeline();
  const createStage = useCreateStage();
  const loadMoreLeads = useLoadMoreLeads();
  
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
    if (filterUser === undefined && profile?.id && !permissionLoading) {
      // For admin, super_admin, users with lead_view_all permission, OR team leaders: show all
      if (isAdmin || hasLeadViewAll || isTeamLeader) {
        setFilterUser('all');
      } else {
        // For regular users without permission, pre-select their own name
        setFilterUser(profile.id);
      }
    }
  }, [profile, isAdmin, filterUser, hasLeadViewAll, permissionLoading, isTeamLeader]);
  
  const { data: stages = [], isLoading: stagesLoading, refetch } = useStagesWithLeads(selectedPipelineId || undefined);
  const { data: users = [] } = useOrganizationUsers();
  const { data: allTags = [] } = useTags();
  // createLead agora é gerenciado pelo CreateLeadDialog
  const assignLeadRoundRobin = useAssignLeadRoundRobin();
  const canEditPipeline = useCanEditCadences();
  const { recordFirstResponse } = useRecordFirstResponseOnAction();
  const isMobile = useIsMobile();
  // Compute VGV directly from filteredStages so the badge always matches visible leads
  // (This must be defined after filteredStages — see below)
  
  const currentPipeline = pipelines.find(p => p.id === selectedPipelineId);
  const isLoading = pipelinesLoading || stagesLoading;

  // Handler para carregar mais leads de uma coluna específica
  const handleLoadMore = useCallback((stageId: string) => {
    if (!selectedPipelineId) return;
    
    const stage = stages.find(s => s.id === stageId);
    const currentCount = stage?.leads?.length || 0;
    
    loadMoreLeads.mutate({
      pipelineId: selectedPipelineId,
      stageId,
      offset: currentCount,
    });
  }, [selectedPipelineId, stages, loadMoreLeads]);

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
        refetch();
      }, 200); // 200ms debounce para aguardar triggers do banco
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
    // Marcar que estamos em processo de drag (bloqueia refetch da subscription)
    isDraggingRef.current = true;
    
    const { destination, source, draggableId } = result;
    
    if (!destination) {
      isDraggingRef.current = false;
      return;
    }
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      isDraggingRef.current = false;
      return;
    }
    
    const newStageId = destination.droppableId;
    const oldStageId = source.droppableId;
    const oldStage = stages.find(s => s.id === oldStageId);
    const newStage = stages.find(s => s.id === newStageId);
    
    // IMMEDIATE optimistic update - move card visually first
    const queryKey = ['stages-with-leads', selectedPipelineId];
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
      // Fetch automations in parallel with DB update for responsiveness
      const [updateResult, automationsResult] = await Promise.all([
        supabase
          .from('leads')
          .update({ 
            stage_id: newStageId,
            stage_entered_at: new Date().toISOString(),
          })
          .eq('id', draggableId),
        supabase
          .from('stage_automations')
          .select('automation_type, action_config')
          .eq('stage_id', newStageId)
          .eq('is_active', true),
      ]);
      
      if (updateResult.error) throw updateResult.error;
      
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
  }, [stages, selectedPipelineId, queryClient, refetch, isTelecom, profile?.organization_id]);

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

  // Debounce da busca para performance
  const deferredSearch = useDeferredValue(searchQuery);
  
  // Get date range for filtering
  const dateRange = useMemo(() => {
    if (customDateRange) return customDateRange;
    return getDateRangeFromPreset(datePreset);
  }, [datePreset, customDateRange]);
  
  // Filter leads com valor debounced
  const filteredStages = useMemo(() => {
    return stages.map(stage => ({
      ...stage,
      leads: (stage.leads || []).filter((lead: any) => {
        if (filterUser && filterUser !== 'all' && lead.assigned_user_id !== filterUser) return false;
        if (deferredSearch && !lead.name.toLowerCase().includes(deferredSearch.toLowerCase()) && 
            !lead.phone?.includes(deferredSearch)) return false;
        
        // Tag filter - use lead.tags (populated by useStagesWithLeads)
        if (filterTag && filterTag !== 'all') {
          const leadTagIds = lead.tags?.map((t: any) => t.id) || [];
          if (!leadTagIds.includes(filterTag)) return false;
        }
        
        // Deal status filter
        if (filterDealStatus && filterDealStatus !== 'all') {
          const leadStatus = lead.deal_status || 'open';
          if (leadStatus !== filterDealStatus) return false;
        }
        
        // Date filter
        if (lead.created_at) {
          const leadDate = parseISO(lead.created_at);
          if (!isWithinInterval(leadDate, { start: dateRange.from, end: dateRange.to })) {
            return false;
          }
        }
        
        return true;
      }),
    }));
  }, [stages, filterUser, filterTag, filterDealStatus, deferredSearch, dateRange]);

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
    <AppLayout title="Pipeline">
      <div className="flex flex-col h-[calc(100vh-7rem)] overflow-hidden">
        {/* Pipeline Selector + Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          {/* Top Row: Pipeline Selector + New Button (mobile) */}
          <div className="flex items-center justify-between sm:justify-start gap-2">
            {/* Pipeline Selector */}
            <div className="flex items-center gap-1 sm:gap-2 border border-primary/30 rounded-lg px-2 sm:px-3 py-1.5 bg-primary/5">
              <Settings className="h-4 w-4 text-primary hidden sm:block" />
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Pipeline</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 font-semibold text-foreground">
                    {currentPipeline?.name || 'Selecionar'}
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
              {isAdmin && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setSlaSettingsOpen(true)}
                        disabled={!selectedPipelineId}
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Configurar SLA</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {canEditPipeline && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setStagesEditorOpen(true)}
                        disabled={!selectedPipelineId}
                      >
                        <Settings className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Gerenciar Colunas</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setNewPipelineDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 text-primary" />
                </Button>
              )}
            </div>
            
            {/* New Lead Button - Always visible */}
            <Button size="sm" onClick={() => openNewLeadDialog()} className="sm:hidden">
              <Plus className="h-4 w-4 mr-1" />
              <span className="text-xs">{isTelecom ? 'Novo' : 'Lead'}</span>
            </Button>
          </div>
          
          {/* Filters Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Search - hidden on mobile, inside popover */}
            <div className="relative flex-shrink-0 hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-40 pl-8 text-xs"
              />
            </div>

            {/* Date Filter - always visible */}
            <DateFilterPopover
              datePreset={datePreset}
              onDatePresetChange={setDatePreset}
              customDateRange={customDateRange}
              onCustomDateRangeChange={setCustomDateRange}
              triggerClassName="h-8 w-auto min-w-[100px] sm:min-w-[130px] text-xs justify-start flex-shrink-0"
            />

            {/* Mobile: Filters Popover */}
            {isMobile && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 px-2.5 text-xs gap-1.5 flex-shrink-0",
                      ((filterUser && filterUser !== 'all') || (filterTag && filterTag !== 'all') || (filterDealStatus && filterDealStatus !== 'all') || searchQuery) && "border-primary text-primary"
                    )}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Filtros
                    {((filterUser && filterUser !== 'all') || (filterTag && filterTag !== 'all') || (filterDealStatus && filterDealStatus !== 'all') || searchQuery) && (
                      <Badge variant="default" className="h-4 w-4 p-0 flex items-center justify-center text-[10px] ml-0.5">
                        •
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-3">
                  <div className="space-y-3">
                    {/* Search */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Buscar</label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Buscar..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-9 w-full pl-8 text-xs"
                        />
                      </div>
                    </div>

                    {/* Responsible */}
                    {(isAdmin || hasLeadViewAll) && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Responsável</label>
                        <Select value={filterUser} onValueChange={setFilterUser}>
                          <SelectTrigger className={cn(
                            "h-9 w-full text-xs",
                            filterUser && filterUser !== 'all' && "border-primary text-primary"
                          )}>
                            <Filter className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                            <SelectValue placeholder="Resp." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {users.map(user => (
                              <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Tags */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Tags</label>
                      <Select value={filterTag} onValueChange={setFilterTag}>
                        <SelectTrigger className={cn(
                          "h-9 w-full text-xs",
                          filterTag && filterTag !== 'all' && "border-primary text-primary"
                        )}>
                          <Tags className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                          <SelectValue placeholder="Tags" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {allTags.map(tag => (
                            <SelectItem key={tag.id} value={tag.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                                {tag.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Deal Status */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Status</label>
                      <Select value={filterDealStatus} onValueChange={setFilterDealStatus}>
                        <SelectTrigger className={cn(
                          "h-9 w-full text-xs",
                          filterDealStatus && filterDealStatus !== 'all' && "border-primary text-primary"
                        )}>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="open">
                            <span className="flex items-center gap-2">
                              <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
                              Aberto
                            </span>
                          </SelectItem>
                          <SelectItem value="won">
                            <span className="flex items-center gap-2">
                              <Trophy className="h-3.5 w-3.5 text-emerald-600" />
                              Ganho
                            </span>
                          </SelectItem>
                          <SelectItem value="lost">
                            <span className="flex items-center gap-2">
                              <XCircle className="h-3.5 w-3.5 text-red-600" />
                              Perdido
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Desktop: inline filters */}
            {!isMobile && (
              <>
                {/* Responsible Filter */}
                {(isAdmin || hasLeadViewAll) ? (
                  <Select value={filterUser} onValueChange={setFilterUser}>
                    <SelectTrigger className={cn(
                      "h-8 w-auto min-w-[110px] text-xs flex-shrink-0",
                      filterUser && filterUser !== 'all' && "border-primary text-primary"
                    )}>
                      <Filter className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                      <SelectValue placeholder="Resp." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-1.5 border rounded-md px-2 py-1.5 bg-muted/50 h-8 flex-shrink-0">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs truncate max-w-[60px]">{profile?.name}</span>
                  </div>
                )}

                {/* Tag Filter */}
                <Select value={filterTag} onValueChange={setFilterTag}>
                  <SelectTrigger className={cn(
                    "h-8 w-auto min-w-[100px] text-xs flex-shrink-0",
                    filterTag && filterTag !== 'all' && "border-primary text-primary"
                  )}>
                    <Tags className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                    <SelectValue placeholder="Tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {allTags.map(tag => (
                      <SelectItem key={tag.id} value={tag.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                          {tag.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Deal Status Filter */}
                <Select value={filterDealStatus} onValueChange={setFilterDealStatus}>
                  <SelectTrigger className={cn(
                    "h-8 w-auto min-w-[100px] text-xs flex-shrink-0",
                    filterDealStatus && filterDealStatus !== 'all' && "border-primary text-primary"
                  )}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="open">
                      <span className="flex items-center gap-2">
                        <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
                        Aberto
                      </span>
                    </SelectItem>
                    <SelectItem value="won">
                      <span className="flex items-center gap-2">
                        <Trophy className="h-3.5 w-3.5 text-emerald-600" />
                        Ganho
                      </span>
                    </SelectItem>
                    <SelectItem value="lost">
                      <span className="flex items-center gap-2">
                        <XCircle className="h-3.5 w-3.5 text-red-600" />
                        Perdido
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            
            {/* Refresh Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atualizar Pipeline</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Desktop New Button */}
            <Button size="sm" onClick={() => openNewLeadDialog()} className="hidden sm:flex flex-shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              {newButtonLabel}
            </Button>
          </div>
        </div>

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
          <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
            <div className="flex gap-3 h-full min-w-max">
              {filteredStages.map((stage: any) => (
                <div 
                  key={stage.id}
                  className="w-72 flex-shrink-0 flex flex-col rounded-lg overflow-hidden h-full"
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
                      {stage.total_lead_count || stage.leads?.length || 0}
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
                          {stage.leads?.map((lead: any, index: number) => (
                            <LeadCard 
                              key={lead.id} 
                              lead={lead} 
                              index={index}
                              onClick={() => setSelectedLead(lead)}
                              onAssignNow={(leadId) => assignLeadRoundRobin.mutate(leadId)}
                              isDragDisabled={isDragDisabled}
                            />
                          ))}
                          {provided.placeholder}
                          
                          {/* Filter warning when has_more and filters active */}
                          {stage.has_more && (filterUser && filterUser !== 'all' || filterTag !== 'all' || filterDealStatus !== 'all' || deferredSearch) && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded px-2 py-1.5 mt-1 text-center">
                              ⚠️ Filtro ativo — alguns resultados podem não estar visíveis. Carregue mais para ver todos.
                            </div>
                          )}
                          
                          {/* Botão Carregar Mais */}
                          {stage.has_more && (
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
                              Carregar mais ({stage.total_lead_count - (stage.leads?.length || 0)} restantes)
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
    </AppLayout>
  );
}
