import { useState, useEffect, useDeferredValue, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Tags
} from 'lucide-react';
import { StageSettingsDialog } from '@/components/pipelines/StageSettingsDialog';
import { PipelineSlaSettings } from '@/components/pipelines/PipelineSlaSettings';
import { PipelineDateFilter } from '@/components/pipelines/PipelineDateFilter';
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
import { useCreateLead } from '@/hooks/use-leads';
import { useOrganizationUsers } from '@/hooks/use-users';
import { useTags } from '@/hooks/use-tags';
import { useAssignLeadRoundRobin } from '@/hooks/use-assign-lead-roundrobin';
import { useCanEditCadences } from '@/hooks/use-can-edit-cadences';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Pipelines() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [newLeadDialogOpen, setNewLeadDialogOpen] = useState(false);
  const [newLeadStageId, setNewLeadStageId] = useState<string | null>(null);
  const [newLeadForm, setNewLeadForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [filterUser, setFilterUser] = useState<string | undefined>(undefined);
  const [filterTag, setFilterTag] = useState<string>('all');
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
  const [datePreset, setDatePreset] = useState<DatePreset>('last30days');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  
  const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines();
  const createPipeline = useCreatePipeline();
  const deletePipeline = useDeletePipeline();
  const createStage = useCreateStage();
  
  // Set initial pipeline when pipelines load
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
      setSelectedPipelineId(defaultPipeline.id);
    }
  }, [pipelines, selectedPipelineId]);
  
  // Set initial filter based on user role
  useEffect(() => {
    if (filterUser === undefined && profile?.id) {
      // For non-admin users, pre-select their own name
      if (!isAdmin) {
        setFilterUser(profile.id);
      } else {
        setFilterUser('all');
      }
    }
  }, [profile, isAdmin, filterUser]);
  
  const { data: stages = [], isLoading: stagesLoading, refetch } = useStagesWithLeads(selectedPipelineId || undefined);
  const { data: users = [] } = useOrganizationUsers();
  const { data: allTags = [] } = useTags();
  const createLead = useCreateLead();
  const assignLeadRoundRobin = useAssignLeadRoundRobin();
  const canEditPipeline = useCanEditCadences();
  
  
  const currentPipeline = pipelines.find(p => p.id === selectedPipelineId);
  const isLoading = pipelinesLoading || stagesLoading;

  // Real-time subscription for leads and tags updates
  useEffect(() => {
    if (!profile?.organization_id) return;

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
        () => {
          // Force immediate refetch to update the kanban
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_tags',
        },
        () => {
          // Force immediate refetch when tags change
          refetch();
        }
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
          // Apenas atualizar se os dados realmente mudaram
          if (JSON.stringify(updatedLead) !== JSON.stringify(selectedLead)) {
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
    const leadId = params.get('lead_id');
    
    if (leadId && stages.length > 0) {
      // Find lead in any stage
      for (const stage of stages) {
        const lead = stage.leads?.find((l: any) => l.id === leadId);
        if (lead) {
          setSelectedLead(lead);
          // Clear the URL param after opening
          navigate('/crm/pipelines', { replace: true });
          break;
        }
      }
    }
  }, [location.search, stages, navigate]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    const newStageId = destination.droppableId;
    const oldStage = stages.find(s => s.id === source.droppableId);
    const newStage = stages.find(s => s.id === newStageId);
    
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          stage_id: newStageId,
          stage_entered_at: new Date().toISOString(),
        })
        .eq('id', draggableId);
      
      if (error) throw error;
      
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from('activities').insert({
        lead_id: draggableId,
        type: 'stage_change',
        content: `Movido de "${oldStage?.name}" para "${newStage?.name}"`,
        user_id: userData.user?.id,
        metadata: {
          from_stage: oldStage?.name,
          to_stage: newStage?.name,
          from_stage_id: source.droppableId,
          to_stage_id: newStageId,
        },
      });
      
      toast.success(`Lead movido para ${newStage?.name}`);
      refetch();
    } catch (error: any) {
      toast.error('Erro ao mover lead: ' + error.message);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    await createLead.mutateAsync({
      ...newLeadForm,
      stage_id: newLeadStageId || undefined,
    });
    setNewLeadDialogOpen(false);
    setNewLeadForm({ name: '', phone: '', email: '', message: '' });
    setNewLeadStageId(null);
  };

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
        
        // Tag filter
        if (filterTag && filterTag !== 'all') {
          const leadTagIds = lead.lead_tags?.map((lt: any) => lt.tag_id) || [];
          if (!leadTagIds.includes(filterTag)) return false;
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
  }, [stages, filterUser, filterTag, deferredSearch, dateRange]);

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
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-3">
            {/* Pipeline Selector */}
            <div className="flex items-center gap-2 border border-primary/30 rounded-lg px-3 py-1.5 bg-primary/5">
              <Settings className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Pipeline</span>
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
            
            {/* Search & Filter */}
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar lead..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {isAdmin ? (
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-muted/50">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{profile?.name}</span>
              </div>
            )}

            {/* Tag Filter */}
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="w-40">
                <Tags className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: tag.color }} 
                      />
                      {tag.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Date Filter */}
            <PipelineDateFilter
              datePreset={datePreset}
              onDatePresetChange={setDatePreset}
              customDateRange={customDateRange}
              onCustomDateRangeChange={setCustomDateRange}
            />
          </div>
          <Button size="sm" onClick={() => openNewLeadDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Lead
          </Button>
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
                        {stage.leads?.length || 0}
                      </Badge>
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
                            />
                          ))}
                          {provided.placeholder}
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
        <Dialog open={newLeadDialogOpen} onOpenChange={setNewLeadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateLead} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  placeholder="Nome do lead"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <PhoneInput
                  value={newLeadForm.phone}
                  onChange={(value) => setNewLeadForm({ ...newLeadForm, phone: value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newLeadForm.email}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Input
                  value={newLeadForm.message}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, message: e.target.value })}
                  placeholder="Interesse, observações..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setNewLeadDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createLead.isPending}>
                  {createLead.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Lead
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* New Pipeline Dialog */}
        <Dialog open={newPipelineDialogOpen} onOpenChange={setNewPipelineDialogOpen}>
          <DialogContent className="max-w-sm">
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
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setNewPipelineDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createPipeline.isPending}>
                  {createPipeline.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Pipeline
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* New Stage Dialog */}
        <Dialog open={newStageDialogOpen} onOpenChange={setNewStageDialogOpen}>
          <DialogContent className="max-w-sm">
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
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setNewStageDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createStage.isPending}>
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
      </div>
    </AppLayout>
  );
}
