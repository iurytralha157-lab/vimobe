import { useCallback, useState, useEffect, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  Panel,
  MarkerType,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Save, 
  ArrowLeft, 
  Loader2, 
  MessageSquare, 
  Timer, 
  Trash2,
} from 'lucide-react';
import { MessageNode } from './nodes/MessageNode';
import { WaitNode } from './nodes/WaitNode';
import { StartNode } from './nodes/StartNode';
import { useWhatsAppSessions } from '@/hooks/use-whatsapp-sessions';
import { useTags } from '@/hooks/use-tags';
import { useStages, usePipelines } from '@/hooks/use-stages';
import { 
  useAutomation,
  useUpdateAutomation,
  useSaveAutomationFlow, 
  TriggerType 
} from '@/hooks/use-automations';
import { useUsers } from '@/hooks/use-users';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  wait: WaitNode,
};

interface FollowUpBuilderEditProps {
  automationId: string;
  onBack: () => void;
  onComplete: (automationId: string) => void;
}

const NODE_PALETTE = [
  { type: 'message', label: 'Mensagem', icon: MessageSquare, color: 'bg-green-500/10 text-green-600' },
  { type: 'wait', label: 'Aguardar', icon: Timer, color: 'bg-purple-500/10 text-purple-600' },
];

function FollowUpBuilderEditInner({ automationId, onBack, onComplete }: FollowUpBuilderEditProps) {
  const { data: automation, isLoading: isLoadingAutomation } = useAutomation(automationId);
  const { data: sessions } = useWhatsAppSessions();
  const { data: tags } = useTags();
  const { data: pipelines } = usePipelines();
  const { data: users } = useUsers();
  const [pipelineId, setPipelineId] = useState<string>('');
  const { data: stages } = useStages(pipelineId || undefined);
  const updateAutomation = useUpdateAutomation();
  const saveFlow = useSaveAutomationFlow();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Config
  const [name, setName] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  const [triggerType, setTriggerType] = useState<TriggerType>('tag_added');
  const [stageId, setStageId] = useState<string>('');
  const [tagId, setTagId] = useState<string>('');
  
  // New: User filter and stop on reply settings
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [stopOnReply, setStopOnReply] = useState<boolean>(true);
  const [onReplyStageId, setOnReplyStageId] = useState<string>('');

  const connectedSessions = sessions?.filter(s => s.status === 'connected') || [];

  // Load automation data
  useEffect(() => {
    if (automation && !isInitialized) {
      setName(automation.name || '');
      setTriggerType(automation.trigger_type as TriggerType);
      
      const config = automation.trigger_config as Record<string, unknown> || {};
      if (config.tag_id) setTagId(config.tag_id as string);
      if (config.pipeline_id) setPipelineId(config.pipeline_id as string);
      if (config.to_stage_id) setStageId(config.to_stage_id as string);
      if (config.filter_user_id) setFilterUserId(config.filter_user_id as string);
      if (typeof config.stop_on_reply === 'boolean') setStopOnReply(config.stop_on_reply);
      if (config.on_reply_move_to_stage_id) setOnReplyStageId(config.on_reply_move_to_stage_id as string);
      
      // Load nodes and edges
      const flowNodes: Node[] = [];
      const flowEdges: Edge[] = [];
      
      automation.nodes?.forEach((node) => {
        const nodeConfig = node.config as Record<string, unknown> || {};
        
        if (node.node_type === 'trigger') {
          flowNodes.push({
            id: node.id,
            type: 'start',
            position: { x: node.position_x || 250, y: node.position_y || 50 },
            data: { trigger_type: automation.trigger_type },
          });
          // Get session_id from trigger node
          if (nodeConfig.session_id) {
            setSessionId(nodeConfig.session_id as string);
          }
        } else if (node.node_type === 'action' && node.action_type === 'send_whatsapp') {
          flowNodes.push({
            id: node.id,
            type: 'message',
            position: { x: node.position_x || 250, y: node.position_y || 180 },
            data: { message: nodeConfig.message || '' },
          });
          // Get session_id from action node
          if (nodeConfig.session_id && !sessionId) {
            setSessionId(nodeConfig.session_id as string);
          }
        } else if (node.node_type === 'delay') {
          flowNodes.push({
            id: node.id,
            type: 'wait',
            position: { x: node.position_x || 250, y: node.position_y || 300 },
            data: { 
              wait_type: nodeConfig.delay_type || 'days', 
              wait_value: nodeConfig.delay_value || 1 
            },
          });
        }
      });
      
      automation.connections?.forEach((conn) => {
        flowEdges.push({
          id: conn.id,
          source: conn.source_node_id,
          target: conn.target_node_id,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { strokeWidth: 2 },
        });
      });
      
      setNodes(flowNodes);
      setEdges(flowEdges);
      setIsInitialized(true);
    }
  }, [automation, isInitialized, setNodes, setEdges]);

  // Update trigger node when trigger type changes
  useEffect(() => {
    if (isInitialized) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.type === 'start') {
            return { ...node, data: { ...node.data, trigger_type: triggerType } };
          }
          return node;
        })
      );
    }
  }, [triggerType, setNodes, isInitialized]);

  // Clear stage when pipeline changes
  useEffect(() => {
    if (isInitialized) {
      setStageId('');
    }
  }, [pipelineId, isInitialized]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({
        ...params,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
      }, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type !== 'start') {
      setSelectedNode(node);
    }
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleAddNode = useCallback((type: 'message' | 'wait') => {
    const lastNode = nodes[nodes.length - 1];
    const newY = lastNode ? lastNode.position.y + 140 : 200;
    
    const newNodeId = `${type}-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type,
      position: { x: 250, y: newY },
      data: type === 'message' 
        ? { message: 'Nova mensagem...', day: nodes.filter(n => n.type === 'message').length + 1 }
        : { wait_type: 'days', wait_value: 1 },
    };

    setNodes((nds) => [...nds, newNode]);

    // Auto-connect to last node if exists
    if (lastNode && lastNode.type !== 'start') {
      const newEdge: Edge = {
        id: `e-${lastNode.id}-${newNodeId}`,
        source: lastNode.id,
        target: newNodeId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
      };
      setEdges((eds) => [...eds, newEdge]);
    }
  }, [nodes, setNodes, setEdges]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const handleNodeDataChange = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      })
    );
    setSelectedNode((prev) => prev && prev.id === nodeId 
      ? { ...prev, data: { ...prev.data, ...data } } 
      : prev
    );
  }, [setNodes]);

  const handleSave = async () => {
    if (!sessionId) {
      toast.error('Selecione uma sessão WhatsApp');
      return;
    }

    if (!name.trim()) {
      toast.error('Digite um nome para a automação');
      return;
    }

    if (triggerType === 'tag_added' && !tagId) {
      toast.error('Selecione uma tag para o gatilho');
      return;
    }

    if (triggerType === 'lead_stage_changed' && !pipelineId) {
      toast.error('Selecione uma pipeline para o gatilho');
      return;
    }

    if (triggerType === 'lead_stage_changed' && !stageId) {
      toast.error('Selecione uma etapa para o gatilho');
      return;
    }

    const messageNodes = nodes.filter(n => n.type === 'message');
    if (messageNodes.length === 0) {
      toast.error('Adicione pelo menos uma mensagem');
      return;
    }

    setIsSaving(true);

    try {
      // Update automation
      await updateAutomation.mutateAsync({
        id: automationId,
        name,
        description: `Follow-up com ${messageNodes.length} mensagens`,
        trigger_type: triggerType,
        trigger_config: {
          ...(triggerType === 'tag_added' ? { tag_id: tagId } : {}),
          ...(triggerType === 'lead_stage_changed' ? { 
            pipeline_id: pipelineId, 
            to_stage_id: stageId 
          } : {}),
          filter_user_id: filterUserId && filterUserId !== "__all__" ? filterUserId : null,
          stop_on_reply: stopOnReply,
          on_reply_move_to_stage_id: stopOnReply && onReplyStageId && onReplyStageId !== "__none__" ? onReplyStageId : null,
        } as any,
      });

      // Build nodes for database
      const dbNodes: {
        id: string;
        node_type: 'trigger' | 'action' | 'delay';
        action_type: 'send_whatsapp' | null;
        config: Record<string, unknown>;
        position_x: number;
        position_y: number;
      }[] = [];

      nodes.forEach((node) => {
        if (node.type === 'start') {
          dbNodes.push({
            id: node.id,
            node_type: 'trigger',
            action_type: null,
            config: { 
              trigger_type: triggerType, 
              tag_id: tagId, 
              pipeline_id: pipelineId, 
              to_stage_id: stageId,
              filter_user_id: filterUserId && filterUserId !== "__all__" ? filterUserId : null,
              stop_on_reply: stopOnReply,
              on_reply_move_to_stage_id: stopOnReply && onReplyStageId && onReplyStageId !== "__none__" ? onReplyStageId : null,
            },
            position_x: Math.round(node.position.x),
            position_y: Math.round(node.position.y),
          });
        } else if (node.type === 'message') {
          dbNodes.push({
            id: node.id,
            node_type: 'action',
            action_type: 'send_whatsapp',
            config: {
              session_id: sessionId,
              message: node.data.message,
              actionType: 'send_whatsapp',
            },
            position_x: Math.round(node.position.x),
            position_y: Math.round(node.position.y),
          });
        } else if (node.type === 'wait') {
          dbNodes.push({
            id: node.id,
            node_type: 'delay',
            action_type: null,
            config: {
              delay_type: node.data.wait_type || 'days',
              delay_value: node.data.wait_value || 1,
              nodeType: 'delay',
            },
            position_x: Math.round(node.position.x),
            position_y: Math.round(node.position.y),
          });
        }
      });

      // Build connections
      const dbConnections = edges.map((edge) => ({
        source_node_id: edge.source,
        target_node_id: edge.target,
        condition_branch: 'default',
      }));

      await saveFlow.mutateAsync({
        automationId,
        nodes: dbNodes.map(n => ({
          id: n.id,
          automation_id: automationId,
          node_type: n.node_type,
          action_type: n.action_type,
          config: n.config as any,
          position_x: n.position_x,
          position_y: n.position_y,
        })),
        connections: dbConnections.map(c => ({
          automation_id: automationId,
          ...c,
        })),
      });

      toast.success('Automação salva com sucesso!');
      onComplete(automationId);
    } catch (error) {
      console.error('Error saving automation:', error);
      toast.error('Erro ao salvar automação');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingAutomation) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!automation) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Automação não encontrada</p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg font-semibold h-8 w-auto min-w-[200px] border-none focus-visible:ring-1"
              placeholder="Nome da automação"
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Config */}
        <div className="w-72 border-r bg-muted/30 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Session */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Sessão WhatsApp
                </Label>
                <Select value={sessionId} onValueChange={setSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {connectedSessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.display_name || session.instance_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Trigger */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Disparar quando
                </Label>
                <Select value={triggerType} onValueChange={(v: TriggerType) => setTriggerType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tag_added">Tag adicionada</SelectItem>
                    <SelectItem value="lead_created">Lead criado</SelectItem>
                    <SelectItem value="lead_stage_changed">Mudou de etapa</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {triggerType === 'tag_added' && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Tag específica
                  </Label>
                  <Select value={tagId} onValueChange={setTagId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a tag..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tags?.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: tag.color || '#888' }}
                            />
                            {tag.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {triggerType === 'lead_stage_changed' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Pipeline
                    </Label>
                    <Select value={pipelineId} onValueChange={setPipelineId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a pipeline..." />
                      </SelectTrigger>
                      <SelectContent>
                        {pipelines?.map((pipeline) => (
                          <SelectItem key={pipeline.id} value={pipeline.id}>
                            {pipeline.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {pipelineId && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">
                        Etapa específica
                      </Label>
                      <Select value={stageId} onValueChange={setStageId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a etapa..." />
                        </SelectTrigger>
                        <SelectContent>
                          {stages?.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: stage.color || '#888' }}
                                />
                                {stage.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {/* User Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Filtrar por usuário
                </Label>
                <Select value={filterUserId || "__all__"} onValueChange={(v) => setFilterUserId(v === "__all__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os usuários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos os usuários</SelectItem>
                    <SelectItem value="__me__">Apenas meus leads</SelectItem>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Dispara apenas para leads do usuário selecionado
                </p>
              </div>

              {/* Stop on Reply */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="stop-on-reply-edit"
                    checked={stopOnReply} 
                    onCheckedChange={(checked) => setStopOnReply(checked === true)} 
                  />
                  <Label htmlFor="stop-on-reply-edit" className="text-sm cursor-pointer">
                    Parar follow-up se lead responder
                  </Label>
                </div>
                
                {stopOnReply && pipelineId && (
                  <div className="space-y-2 ml-6">
                    <Label className="text-xs text-muted-foreground">
                      Ao responder, mover para:
                    </Label>
                    <Select value={onReplyStageId || "__none__"} onValueChange={(v) => setOnReplyStageId(v === "__none__" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Não mover (apenas parar)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Não mover (apenas parar)</SelectItem>
                        {/* Fallback: show loading item if stage is selected but not yet in list */}
                        {onReplyStageId && 
                         onReplyStageId !== "__none__" && 
                         !stages?.find(s => s.id === onReplyStageId) && (
                          <SelectItem value={onReplyStageId} disabled>
                            Carregando etapa...
                          </SelectItem>
                        )}
                        {stages?.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: stage.color || '#888' }}
                              />
                              {stage.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Node Palette */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Adicionar ao fluxo
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {NODE_PALETTE.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.type}
                        variant="outline"
                        className="h-auto py-3 flex-col gap-1"
                        onClick={() => handleAddNode(item.type as 'message' | 'wait')}
                      >
                        <div className={`p-1.5 rounded ${item.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs">{item.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Variables Help */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Variáveis disponíveis
                </Label>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Lead:</p>
                  <code className="block bg-muted px-2 py-1 rounded">{'{{lead.name}}'}</code>
                  <code className="block bg-muted px-2 py-1 rounded">{'{{lead.phone}}'}</code>
                  <code className="block bg-muted px-2 py-1 rounded">{'{{lead.email}}'}</code>
                  <code className="block bg-muted px-2 py-1 rounded">{'{{lead.source}}'}</code>
                  <code className="block bg-muted px-2 py-1 rounded">{'{{lead.message}}'}</code>
                  
                  <p className="font-medium text-foreground pt-2">Telecom:</p>
                  <code className="block bg-muted px-2 py-1 rounded">{'{{customer.address}}'}</code>
                  <code className="block bg-muted px-2 py-1 rounded">{'{{customer.city}}'}</code>
                  <code className="block bg-muted px-2 py-1 rounded">{'{{customer.neighborhood}}'}</code>
                  <code className="block bg-muted px-2 py-1 rounded">{'{{customer.cep}}'}</code>
                  <code className="block bg-muted px-2 py-1 rounded">{'{{customer.plan_value}}'}</code>
                  
                  <p className="font-medium text-foreground pt-2">Outros:</p>
                  <code className="block bg-muted px-2 py-1 rounded">{'{{organization.name}}'}</code>
                  <code className="block bg-muted px-2 py-1 rounded">{'{{date}}'}</code>
                  <code className="block bg-muted px-2 py-1 rounded">{'{{time}}'}</code>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Flow Editor */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-muted/20"
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Panel position="bottom-center" className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-muted-foreground shadow-lg border">
              Arraste para conectar • Clique em um nó para editar
            </Panel>
          </ReactFlow>
        </div>

        {/* Right Panel - Node Editor */}
        <Sheet open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
          <SheetContent className="w-[400px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {selectedNode?.type === 'message' && (
                  <>
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    Editar Mensagem
                  </>
                )}
                {selectedNode?.type === 'wait' && (
                  <>
                    <Timer className="h-5 w-5 text-purple-600" />
                    Configurar Espera
                  </>
                )}
              </SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {selectedNode?.type === 'message' && (
                <>
                  <div className="space-y-2">
                    <Label>Mensagem</Label>
                    <Textarea
                      value={selectedNode.data.message || ''}
                      onChange={(e) => handleNodeDataChange(selectedNode.id, { message: e.target.value })}
                      rows={8}
                      placeholder="Digite a mensagem..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Use variáveis como {'{{lead.name}}'} para personalizar
                    </p>
                  </div>
                </>
              )}

              {selectedNode?.type === 'wait' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tempo de espera</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={selectedNode.data.wait_value || 1}
                        onChange={(e) => handleNodeDataChange(selectedNode.id, { 
                          wait_value: parseInt(e.target.value) || 1 
                        })}
                        className="w-24"
                      />
                      <Select
                        value={selectedNode.data.wait_type || 'days'}
                        onValueChange={(v) => handleNodeDataChange(selectedNode.id, { wait_type: v })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">Minutos</SelectItem>
                          <SelectItem value="hours">Horas</SelectItem>
                          <SelectItem value="days">Dias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteNode(selectedNode!.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover nó
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export function FollowUpBuilderEdit(props: FollowUpBuilderEditProps) {
  return (
    <ReactFlowProvider>
      <FollowUpBuilderEditInner {...props} />
    </ReactFlowProvider>
  );
}
