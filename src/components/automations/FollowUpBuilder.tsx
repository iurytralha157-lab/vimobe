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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Save, 
  ArrowLeft, 
  Loader2, 
  MessageSquare, 
  Timer, 
  Plus,
  Trash2,
  GripVertical,
  Play,
  X,
  Image,
  Headphones,
  Video,
  Type,
  Hash,
  AtSign,
  Globe,
  Phone,
  Calendar,
  MousePointerClick,
  GitBranch,
  Webhook,
  FlipHorizontal,
  ExternalLink,
  PenLine,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { MessageNode } from './nodes/MessageNode';
import { DEFAULT_ON_REPLY_MESSAGE } from './FollowUpTemplates';
import { WaitNode } from './nodes/WaitNode';
import { StartNode } from './nodes/StartNode';
import { ImageNode } from './nodes/ImageNode';
import { AudioNode } from './nodes/AudioNode';
import { VideoNode } from './nodes/VideoNode';
import { InputNode } from './nodes/InputNode';
import { ConditionNode } from './nodes/ConditionNode';
import { WebhookNode } from './nodes/WebhookNode';
import { ABTestNode } from './nodes/ABTestNode';
import { RedirectNode } from './nodes/RedirectNode';
import { VariableNode } from './nodes/VariableNode';
import { useWhatsAppSessions } from '@/hooks/use-whatsapp-sessions';
import { useTags } from '@/hooks/use-tags';
import { useStages, usePipelines } from '@/hooks/use-stages';
import { useCreateAutomation, useSaveAutomationFlow, TriggerType } from '@/hooks/use-automations';
import { useUsers } from '@/hooks/use-users';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  wait: WaitNode,
  image: ImageNode,
  audio: AudioNode,
  video: VideoNode,
  input: InputNode,
  condition: ConditionNode,
  webhook: WebhookNode,
  abtest: ABTestNode,
  redirect: RedirectNode,
  variable: VariableNode,
};

interface FollowUpBuilderProps {
  onBack: () => void;
  onComplete: (automationId?: string) => void;
  initialTemplate?: {
    name: string;
    messages: { day: number; content: string }[];
    onReplyMessage?: string;
  } | null;
}

type NodeCategory = 'bubbles' | 'inputs' | 'conditionals' | 'actions';

interface PaletteItem {
  type: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  category: NodeCategory;
  defaultData: Record<string, unknown>;
}

const NODE_PALETTE: PaletteItem[] = [
  // Bubbles (mensagens de saída)
  { type: 'message', label: 'Texto', icon: MessageSquare, color: 'text-green-600 bg-green-500/10', category: 'bubbles', defaultData: { message: 'Nova mensagem...', day: 1 } },
  { type: 'image', label: 'Imagem', icon: Image, color: 'text-blue-600 bg-blue-500/10', category: 'bubbles', defaultData: { image_url: '', caption: '' } },
  { type: 'video', label: 'Vídeo', icon: Video, color: 'text-rose-600 bg-rose-500/10', category: 'bubbles', defaultData: { video_url: '' } },
  { type: 'audio', label: 'Áudio', icon: Headphones, color: 'text-amber-600 bg-amber-500/10', category: 'bubbles', defaultData: { audio_url: '' } },
  // Inputs (captura de dados)
  { type: 'input', label: 'Texto', icon: Type, color: 'text-cyan-600 bg-cyan-500/10', category: 'inputs', defaultData: { input_type: 'text', prompt: '', variable_name: '' } },
  { type: 'input', label: 'Número', icon: Hash, color: 'text-cyan-600 bg-cyan-500/10', category: 'inputs', defaultData: { input_type: 'number', prompt: '', variable_name: '' } },
  { type: 'input', label: 'Email', icon: AtSign, color: 'text-cyan-600 bg-cyan-500/10', category: 'inputs', defaultData: { input_type: 'email', prompt: '', variable_name: '' } },
  { type: 'input', label: 'Website', icon: Globe, color: 'text-cyan-600 bg-cyan-500/10', category: 'inputs', defaultData: { input_type: 'website', prompt: '', variable_name: '' } },
  { type: 'input', label: 'Telefone', icon: Phone, color: 'text-cyan-600 bg-cyan-500/10', category: 'inputs', defaultData: { input_type: 'phone', prompt: '', variable_name: '' } },
  { type: 'input', label: 'Data', icon: Calendar, color: 'text-cyan-600 bg-cyan-500/10', category: 'inputs', defaultData: { input_type: 'date', prompt: '', variable_name: '' } },
  { type: 'input', label: 'Botão', icon: MousePointerClick, color: 'text-cyan-600 bg-cyan-500/10', category: 'inputs', defaultData: { input_type: 'button', prompt: '', buttons: ['Opção 1', 'Opção 2'], variable_name: '' } },
  // Condicionais
  { type: 'variable', label: 'Variável', icon: PenLine, color: 'text-yellow-600 bg-yellow-600/10', category: 'conditionals', defaultData: { variable_name: '', variable_value: '' } },
  { type: 'condition', label: 'Condição', icon: GitBranch, color: 'text-yellow-600 bg-yellow-500/10', category: 'conditionals', defaultData: { variable: '', operator: 'equals', value: '' } },
  { type: 'redirect', label: 'Redirecionar', icon: ExternalLink, color: 'text-teal-600 bg-teal-500/10', category: 'conditionals', defaultData: { redirect_url: '' } },
  { type: 'abtest', label: 'Teste AB', icon: FlipHorizontal, color: 'text-pink-600 bg-pink-500/10', category: 'conditionals', defaultData: { split_a: 50 } },
  // Ações
  { type: 'wait', label: 'Espera', icon: Timer, color: 'text-purple-600 bg-purple-500/10', category: 'actions', defaultData: { wait_type: 'days', wait_value: 1 } },
  { type: 'webhook', label: 'Webhook', icon: Webhook, color: 'text-indigo-600 bg-indigo-500/10', category: 'actions', defaultData: { webhook_url: '', method: 'POST' } },
];

const CATEGORY_LABELS: Record<NodeCategory, string> = {
  bubbles: 'Bubbles',
  inputs: 'Inputs',
  conditionals: 'Condicionais',
  actions: 'Ações',
};

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  bubbles: 'text-green-500',
  inputs: 'text-cyan-500',
  conditionals: 'text-yellow-500',
  actions: 'text-purple-500',
};

function FollowUpBuilderInner({ onBack, onComplete, initialTemplate }: FollowUpBuilderProps) {
  const { data: sessions } = useWhatsAppSessions();
  const { data: tags } = useTags();
  const { data: pipelines } = usePipelines();
  const { data: users } = useUsers();
  const [pipelineId, setPipelineId] = useState<string>('');
  const { data: stages } = useStages(pipelineId || undefined);
  const createAutomation = useCreateAutomation();
  const saveFlow = useSaveAutomationFlow();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Config
  const [name, setName] = useState(initialTemplate?.name || 'Meu Follow-up');
  const [sessionId, setSessionId] = useState<string>('');
  const [triggerType, setTriggerType] = useState<TriggerType>('tag_added');
  const [stageId, setStageId] = useState<string>('');
  const [tagId, setTagId] = useState<string>('');
  
  // New: User filter and stop on reply settings
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [stopOnReply, setStopOnReply] = useState<boolean>(true);
  const [onReplyStageId, setOnReplyStageId] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Record<NodeCategory, boolean>>({
    bubbles: true,
    inputs: true,
    conditionals: true,
    actions: true,
  });
  const [showConfig, setShowConfig] = useState(false);
  const [onReplyMessage, setOnReplyMessage] = useState<string>(initialTemplate?.onReplyMessage || DEFAULT_ON_REPLY_MESSAGE);

  const connectedSessions = sessions?.filter(s => s.status === 'connected') || [];

  // Initialize flow with template or default
  useEffect(() => {
    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];

    // Start node
    const startId = 'start-1';
    initialNodes.push({
      id: startId,
      type: 'start',
      position: { x: 250, y: 50 },
      data: { trigger_type: triggerType },
    });

    if (initialTemplate?.messages && initialTemplate.messages.length > 0) {
      let previousId = startId;
      let yPos = 180;

      initialTemplate.messages.forEach((msg, index) => {
        const messageId = `message-${index + 1}`;
        initialNodes.push({
          id: messageId,
          type: 'message',
          position: { x: 250, y: yPos },
          data: { message: msg.content, day: msg.day },
        });
        
        initialEdges.push({
          id: `e-${previousId}-${messageId}`,
          source: previousId,
          target: messageId,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { strokeWidth: 2 },
        });

        previousId = messageId;
        yPos += 140;

        // Add wait node between messages (except last)
        if (index < initialTemplate.messages.length - 1) {
          const waitId = `wait-${index + 1}`;
          initialNodes.push({
            id: waitId,
            type: 'wait',
            position: { x: 250, y: yPos },
            data: { wait_type: 'days', wait_value: 1 },
          });

          initialEdges.push({
            id: `e-${previousId}-${waitId}`,
            source: previousId,
            target: waitId,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { strokeWidth: 2 },
          });

          previousId = waitId;
          yPos += 120;
        }
      });
    } else {
      // Default: start + one message
      const messageId = 'message-1';
      initialNodes.push({
        id: messageId,
        type: 'message',
        position: { x: 250, y: 180 },
        data: { message: 'Olá {{lead.name}}! Como posso ajudar?', day: 1 },
      });

      initialEdges.push({
        id: `e-${startId}-${messageId}`,
        source: startId,
        target: messageId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
      });
    }

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialTemplate, setNodes, setEdges]);

  // Update trigger node when trigger type changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === 'start') {
          return { ...node, data: { ...node.data, trigger_type: triggerType } };
        }
        return node;
      })
    );
  }, [triggerType, setNodes]);

  // Clear stage when pipeline changes
  useEffect(() => {
    setStageId('');
  }, [pipelineId]);

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

  const handleAddNode = useCallback((paletteItem: PaletteItem) => {
    const lastNode = nodes[nodes.length - 1];
    const newY = lastNode ? lastNode.position.y + 140 : 200;
    
    const newNodeId = `${paletteItem.type}-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: paletteItem.type,
      position: { x: 250, y: newY },
      data: { ...paletteItem.defaultData },
    };

    // For message nodes, set incrementing day
    if (paletteItem.type === 'message') {
      newNode.data.day = nodes.filter(n => n.type === 'message').length + 1;
    }

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
      toast.error('Digite um nome para o follow-up');
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
      // Create automation
      const automation = await createAutomation.mutateAsync({
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
          on_reply_message: stopOnReply && onReplyMessage?.trim() ? onReplyMessage.trim() : null,
        },
      });

      // Build nodes for database
      const dbNodes: {
        id: string;
        node_type: 'trigger' | 'action' | 'delay' | 'condition';
        action_type: import('@/hooks/use-automations').ActionType | null;
        config: Record<string, unknown>;
        position_x: number;
        position_y: number;
      }[] = [];

      nodes.forEach((node) => {
        const pos = { position_x: Math.round(node.position.x), position_y: Math.round(node.position.y) };
        
        if (node.type === 'start') {
          dbNodes.push({
            id: node.id, node_type: 'trigger', action_type: null,
            config: { 
              trigger_type: triggerType, tag_id: tagId, pipeline_id: pipelineId, to_stage_id: stageId,
              filter_user_id: filterUserId && filterUserId !== "__all__" ? filterUserId : null,
              stop_on_reply: stopOnReply,
              on_reply_move_to_stage_id: stopOnReply && onReplyStageId && onReplyStageId !== "__none__" ? onReplyStageId : null,
              on_reply_message: stopOnReply && onReplyMessage?.trim() ? onReplyMessage.trim() : null,
            },
            ...pos,
          });
        } else if (node.type === 'message') {
          dbNodes.push({
            id: node.id, node_type: 'action', action_type: 'send_whatsapp',
            config: { session_id: sessionId, message: node.data.message, actionType: 'send_whatsapp' },
            ...pos,
          });
        } else if (node.type === 'image') {
          dbNodes.push({
            id: node.id, node_type: 'action', action_type: 'send_image',
            config: { session_id: sessionId, image_url: node.data.image_url, caption: node.data.caption, actionType: 'send_image' },
            ...pos,
          });
        } else if (node.type === 'audio') {
          dbNodes.push({
            id: node.id, node_type: 'action', action_type: 'send_audio',
            config: { session_id: sessionId, audio_url: node.data.audio_url, actionType: 'send_audio' },
            ...pos,
          });
        } else if (node.type === 'video') {
          dbNodes.push({
            id: node.id, node_type: 'action', action_type: 'send_video',
            config: { session_id: sessionId, video_url: node.data.video_url, actionType: 'send_video' },
            ...pos,
          });
        } else if (node.type === 'input') {
          dbNodes.push({
            id: node.id, node_type: 'action', action_type: 'collect_input',
            config: { ...node.data, actionType: 'collect_input' },
            ...pos,
          });
        } else if (node.type === 'wait') {
          dbNodes.push({
            id: node.id, node_type: 'delay', action_type: null,
            config: { delay_type: node.data.wait_type || 'days', delay_value: node.data.wait_value || 1, nodeType: 'delay' },
            ...pos,
          });
        } else if (node.type === 'condition') {
          dbNodes.push({
            id: node.id, node_type: 'condition', action_type: null,
            config: { variable: node.data.variable, operator: node.data.operator, value: node.data.value, nodeType: 'condition' },
            ...pos,
          });
        } else if (node.type === 'abtest') {
          dbNodes.push({
            id: node.id, node_type: 'condition', action_type: null,
            config: { split_a: node.data.split_a, nodeType: 'abtest' },
            ...pos,
          });
        } else if (node.type === 'webhook') {
          dbNodes.push({
            id: node.id, node_type: 'action', action_type: 'webhook',
            config: { webhook_url: node.data.webhook_url, method: node.data.method, actionType: 'webhook' },
            ...pos,
          });
        } else if (node.type === 'redirect') {
          dbNodes.push({
            id: node.id, node_type: 'action', action_type: 'redirect',
            config: { redirect_url: node.data.redirect_url, actionType: 'redirect' },
            ...pos,
          });
        } else if (node.type === 'variable') {
          dbNodes.push({
            id: node.id, node_type: 'action', action_type: 'set_variable',
            config: { variable_name: node.data.variable_name, variable_value: node.data.variable_value, actionType: 'set_variable' },
            ...pos,
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
        automationId: automation.id,
        nodes: dbNodes.map(n => ({
          id: n.id,
          automation_id: automation.id,
          node_type: n.node_type,
          action_type: n.action_type,
          config: n.config as unknown as import('@/integrations/supabase/types').Json,
          position_x: n.position_x,
          position_y: n.position_y,
        })),
        connections: dbConnections.map(c => ({
          automation_id: automation.id,
          ...c,
        })),
      });

      toast.success('Follow-up criado com sucesso!');
      onComplete(automation.id);
    } catch (error) {
      console.error('Error saving follow-up:', error);
      toast.error('Erro ao salvar follow-up');
    } finally {
      setIsSaving(false);
    }
  };

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
              placeholder="Nome do follow-up"
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
        {/* Left Panel - Typebot-style Node Palette */}
        <div className="w-64 border-r bg-card/50 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {/* Config Toggle */}
              <button 
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors text-muted-foreground"
                onClick={() => setShowConfig(!showConfig)}
              >
                {showConfig ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                ⚙️ Configurações
              </button>

              {showConfig && (
                <div className="px-3 py-2 space-y-4 border rounded-xl bg-muted/20 mb-3">
                  {/* Session */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Sessão WhatsApp
                    </Label>
                    <Select value={sessionId} onValueChange={setSessionId}>
                      <SelectTrigger className="h-8 text-xs">
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
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Disparar quando
                    </Label>
                    <Select value={triggerType} onValueChange={(v: TriggerType) => setTriggerType(v)}>
                      <SelectTrigger className="h-8 text-xs">
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
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Tag</Label>
                      <Select value={tagId} onValueChange={setTagId}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {tags?.map((tag) => (
                            <SelectItem key={tag.id} value={tag.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color || '#888' }} />
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
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Pipeline</Label>
                        <Select value={pipelineId} onValueChange={setPipelineId}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {pipelines?.map((pipeline) => (
                              <SelectItem key={pipeline.id} value={pipeline.id}>{pipeline.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {pipelineId && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Etapa</Label>
                          <Select value={stageId} onValueChange={setStageId}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {stages?.map((stage) => (
                                <SelectItem key={stage.id} value={stage.id}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color || '#888' }} />
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
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Filtrar por usuário</Label>
                    <Select value={filterUserId || "__all__"} onValueChange={(v) => setFilterUserId(v === "__all__" ? "" : v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos os usuários</SelectItem>
                        <SelectItem value="__me__">Apenas meus leads</SelectItem>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>{user.name || user.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stop on Reply */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="stop-on-reply" checked={stopOnReply} onCheckedChange={(c) => setStopOnReply(c === true)} />
                      <Label htmlFor="stop-on-reply" className="text-xs cursor-pointer">Parar se lead responder</Label>
                    </div>
                    {stopOnReply && pipelineId && (
                      <Select value={onReplyStageId || "__none__"} onValueChange={(v) => setOnReplyStageId(v === "__none__" ? "" : v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Mover para..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Não mover</SelectItem>
                          {stages?.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {stopOnReply && (
                      <Textarea
                        value={onReplyMessage}
                        onChange={(e) => setOnReplyMessage(e.target.value)}
                        placeholder="Mensagem automática ao responder..."
                        className="min-h-[60px] text-xs"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Node Categories - Typebot Style */}
              {(['bubbles', 'inputs', 'conditionals', 'actions'] as NodeCategory[]).map((category) => {
                const items = NODE_PALETTE.filter(item => item.category === category);
                const isExpanded = expandedCategories[category];
                
                return (
                  <div key={category}>
                    <button 
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className={CATEGORY_COLORS[category]}>{CATEGORY_LABELS[category]}</span>
                    </button>
                    
                    {isExpanded && (
                      <div className="grid grid-cols-2 gap-1.5 px-2 pb-2">
                        {items.map((item, idx) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={`${item.type}-${item.label}-${idx}`}
                              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 bg-background hover:bg-muted/50 hover:border-primary/30 transition-all text-left group cursor-pointer"
                              onClick={() => handleAddNode(item)}
                            >
                              <div className={`p-1 rounded-lg ${item.color}`}>
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-medium truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Variables Help */}
              <button 
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors text-muted-foreground"
                onClick={() => {}}
              >
                📋 Variáveis
              </button>
              <div className="px-3 pb-2 text-xs text-muted-foreground space-y-0.5">
                <code className="block bg-muted px-1.5 py-0.5 rounded text-[10px]">{'{{lead.name}}'}</code>
                <code className="block bg-muted px-1.5 py-0.5 rounded text-[10px]">{'{{lead.phone}}'}</code>
                <code className="block bg-muted px-1.5 py-0.5 rounded text-[10px]">{'{{lead.email}}'}</code>
                <code className="block bg-muted px-1.5 py-0.5 rounded text-[10px]">{'{{organization.name}}'}</code>
                <code className="block bg-muted px-1.5 py-0.5 rounded text-[10px]">{'{{date}}'}</code>
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
                {selectedNode?.type === 'message' && <><MessageSquare className="h-5 w-5 text-green-600" /> Editar Mensagem</>}
                {selectedNode?.type === 'wait' && <><Timer className="h-5 w-5 text-purple-600" /> Configurar Espera</>}
                {selectedNode?.type === 'image' && <><Image className="h-5 w-5 text-blue-600" /> Configurar Imagem</>}
                {selectedNode?.type === 'audio' && <><Headphones className="h-5 w-5 text-amber-600" /> Configurar Áudio</>}
                {selectedNode?.type === 'video' && <><Video className="h-5 w-5 text-rose-600" /> Configurar Vídeo</>}
                {selectedNode?.type === 'input' && <><Type className="h-5 w-5 text-cyan-600" /> Configurar Input</>}
                {selectedNode?.type === 'condition' && <><GitBranch className="h-5 w-5 text-yellow-600" /> Configurar Condição</>}
                {selectedNode?.type === 'webhook' && <><Webhook className="h-5 w-5 text-indigo-600" /> Configurar Webhook</>}
                {selectedNode?.type === 'abtest' && <><FlipHorizontal className="h-5 w-5 text-pink-600" /> Teste AB</>}
                {selectedNode?.type === 'redirect' && <><ExternalLink className="h-5 w-5 text-teal-600" /> Redirecionar</>}
                {selectedNode?.type === 'variable' && <><PenLine className="h-5 w-5 text-yellow-600" /> Variável</>}
              </SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {selectedNode?.type === 'message' && (
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    value={selectedNode.data.message || ''}
                    onChange={(e) => handleNodeDataChange(selectedNode.id, { message: e.target.value })}
                    rows={8}
                    placeholder="Digite a mensagem..."
                  />
                  <p className="text-xs text-muted-foreground">Use variáveis como {'{{lead.name}}'}</p>
                </div>
              )}

              {selectedNode?.type === 'wait' && (
                <div className="space-y-2">
                  <Label>Tempo de espera</Label>
                  <div className="flex gap-2">
                    <Input type="number" min={1} value={selectedNode.data.wait_value || 1}
                      onChange={(e) => handleNodeDataChange(selectedNode.id, { wait_value: parseInt(e.target.value) || 1 })}
                      className="w-24" />
                    <Select value={selectedNode.data.wait_type || 'days'}
                      onValueChange={(v) => handleNodeDataChange(selectedNode.id, { wait_type: v })}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutos</SelectItem>
                        <SelectItem value="hours">Horas</SelectItem>
                        <SelectItem value="days">Dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {selectedNode?.type === 'image' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL da Imagem</Label>
                    <Input value={selectedNode.data.image_url || ''} placeholder="https://..."
                      onChange={(e) => handleNodeDataChange(selectedNode.id, { image_url: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Legenda (opcional)</Label>
                    <Input value={selectedNode.data.caption || ''} placeholder="Legenda da imagem"
                      onChange={(e) => handleNodeDataChange(selectedNode.id, { caption: e.target.value })} />
                  </div>
                </div>
              )}

              {selectedNode?.type === 'audio' && (
                <div className="space-y-2">
                  <Label>URL do Áudio</Label>
                  <Input value={selectedNode.data.audio_url || ''} placeholder="https://..."
                    onChange={(e) => handleNodeDataChange(selectedNode.id, { audio_url: e.target.value })} />
                </div>
              )}

              {selectedNode?.type === 'video' && (
                <div className="space-y-2">
                  <Label>URL do Vídeo</Label>
                  <Input value={selectedNode.data.video_url || ''} placeholder="https://..."
                    onChange={(e) => handleNodeDataChange(selectedNode.id, { video_url: e.target.value })} />
                </div>
              )}

              {selectedNode?.type === 'input' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Input</Label>
                    <Select value={selectedNode.data.input_type || 'text'}
                      onValueChange={(v) => handleNodeDataChange(selectedNode.id, { input_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Telefone</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="date">Data</SelectItem>
                        <SelectItem value="button">Botão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Pergunta / Prompt</Label>
                    <Textarea value={selectedNode.data.prompt || ''} rows={3} placeholder="Ex: Qual seu nome?"
                      onChange={(e) => handleNodeDataChange(selectedNode.id, { prompt: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Salvar em variável</Label>
                    <Input value={selectedNode.data.variable_name || ''} placeholder="ex: nome_cliente"
                      onChange={(e) => handleNodeDataChange(selectedNode.id, { variable_name: e.target.value })} />
                  </div>
                  {selectedNode.data.input_type === 'button' && (
                    <div className="space-y-2">
                      <Label>Opções (uma por linha)</Label>
                      <Textarea value={(selectedNode.data.buttons || []).join('\n')} rows={4}
                        placeholder="Opção 1\nOpção 2\nOpção 3"
                        onChange={(e) => handleNodeDataChange(selectedNode.id, { buttons: e.target.value.split('\n').filter(Boolean) })} />
                    </div>
                  )}
                </div>
              )}

              {selectedNode?.type === 'condition' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Variável</Label>
                    <Input value={selectedNode.data.variable || ''} placeholder="ex: lead.source"
                      onChange={(e) => handleNodeDataChange(selectedNode.id, { variable: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Operador</Label>
                    <Select value={selectedNode.data.operator || 'equals'}
                      onValueChange={(v) => handleNodeDataChange(selectedNode.id, { operator: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Igual a</SelectItem>
                        <SelectItem value="not_equals">Diferente de</SelectItem>
                        <SelectItem value="contains">Contém</SelectItem>
                        <SelectItem value="not_contains">Não contém</SelectItem>
                        <SelectItem value="greater_than">Maior que</SelectItem>
                        <SelectItem value="less_than">Menor que</SelectItem>
                        <SelectItem value="is_set">Existe</SelectItem>
                        <SelectItem value="is_not_set">Não existe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input value={selectedNode.data.value || ''} placeholder="valor esperado"
                      onChange={(e) => handleNodeDataChange(selectedNode.id, { value: e.target.value })} />
                  </div>
                </div>
              )}

              {selectedNode?.type === 'webhook' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL do Webhook</Label>
                    <Input value={selectedNode.data.webhook_url || ''} placeholder="https://..."
                      onChange={(e) => handleNodeDataChange(selectedNode.id, { webhook_url: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Método</Label>
                    <Select value={selectedNode.data.method || 'POST'}
                      onValueChange={(v) => handleNodeDataChange(selectedNode.id, { method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {selectedNode?.type === 'abtest' && (
                <div className="space-y-2">
                  <Label>Distribuição A (%)</Label>
                  <Input type="number" min={1} max={99} value={selectedNode.data.split_a || 50}
                    onChange={(e) => handleNodeDataChange(selectedNode.id, { split_a: parseInt(e.target.value) || 50 })} />
                  <p className="text-xs text-muted-foreground">
                    A: {selectedNode.data.split_a || 50}% / B: {100 - (selectedNode.data.split_a || 50)}%
                  </p>
                </div>
              )}

              {selectedNode?.type === 'redirect' && (
                <div className="space-y-2">
                  <Label>URL de Redirecionamento</Label>
                  <Input value={selectedNode.data.redirect_url || ''} placeholder="https://..."
                    onChange={(e) => handleNodeDataChange(selectedNode.id, { redirect_url: e.target.value })} />
                </div>
              )}

              {selectedNode?.type === 'variable' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome da variável</Label>
                    <Input value={selectedNode.data.variable_name || ''} placeholder="ex: pontuacao"
                      onChange={(e) => handleNodeDataChange(selectedNode.id, { variable_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input value={selectedNode.data.variable_value || ''} placeholder="ex: 100"
                      onChange={(e) => handleNodeDataChange(selectedNode.id, { variable_value: e.target.value })} />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <Button variant="destructive" size="sm" onClick={() => handleDeleteNode(selectedNode!.id)}>
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

export function FollowUpBuilder(props: FollowUpBuilderProps) {
  return (
    <ReactFlowProvider>
      <FollowUpBuilderInner {...props} />
    </ReactFlowProvider>
  );
}
