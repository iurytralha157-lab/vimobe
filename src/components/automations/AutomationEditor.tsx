import { useCallback, useState, useEffect } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Save, Plus, ArrowLeft, Play, Loader2 } from 'lucide-react';
import { TriggerNode, ActionNode, ConditionNode, DelayNode } from './nodes';
import { NodeConfigPanel } from './NodeConfigPanel';
import { AddNodeDialog } from './AddNodeDialog';
import { 
  useAutomation, 
  useSaveAutomationFlow,
  AutomationNode,
  AutomationConnection 
} from '@/hooks/use-automations';
import { toast } from 'sonner';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
};

interface AutomationEditorProps {
  automationId: string;
  onBack: () => void;
}

export function AutomationEditor({ automationId, onBack }: AutomationEditorProps) {
  const { data: automation, isLoading } = useAutomation(automationId);
  const saveFlow = useSaveAutomationFlow();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load nodes and edges from automation data
  useEffect(() => {
    if (automation) {
      const flowNodes: Node[] = (automation.nodes || []).map((node: AutomationNode) => ({
        id: node.id,
        type: node.node_type,
        position: { x: node.position_x || 0, y: node.position_y || 0 },
        data: { 
          ...node.config as Record<string, unknown>,
          actionType: node.action_type,
          nodeType: node.node_type,
        },
      }));

      const flowEdges: Edge[] = (automation.connections || []).map((conn: AutomationConnection) => ({
        id: conn.id,
        source: conn.source_node_id,
        target: conn.target_node_id,
        sourceHandle: conn.source_handle,
        label: conn.condition_branch === 'true' ? 'Sim' : conn.condition_branch === 'false' ? 'Não' : undefined,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [automation, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({
        ...params,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
      }, eds));
      setHasChanges(true);
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodeUpdate = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      })
    );
    setHasChanges(true);
  }, [setNodes]);

  const handleAddNode = useCallback((type: string, actionType?: string) => {
    const newNode: Node = {
      id: `temp-${Date.now()}`,
      type,
      position: { x: 250, y: nodes.length * 150 + 100 },
      data: { 
        nodeType: type,
        actionType,
        label: actionType || type,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setShowAddDialog(false);
    setHasChanges(true);
  }, [nodes.length, setNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
    setHasChanges(true);
  }, [setNodes, setEdges]);

  const handleSave = async () => {
    if (!automation) return;

    try {
      await saveFlow.mutateAsync({
        automationId,
        nodes: nodes.map((node) => ({
          id: node.id, // Keep original ID for mapping (even temp IDs)
          automation_id: automationId,
          node_type: (node.type || 'action') as 'trigger' | 'action' | 'condition' | 'delay',
          action_type: node.data.actionType || null,
          config: node.data,
          position_x: Math.round(node.position.x),
          position_y: Math.round(node.position.y),
        })),
        connections: edges.map((edge) => ({
          id: edge.id.startsWith('reactflow') ? undefined : edge.id,
          automation_id: automationId,
          source_node_id: edge.source,
          target_node_id: edge.target,
          source_handle: edge.sourceHandle || null,
          condition_branch: edge.label === 'Sim' ? 'true' : edge.label === 'Não' ? 'false' : 'default',
        })),
      });
      
      setHasChanges(false);
      toast.success('Automação salva com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar automação');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!automation) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] gap-4">
        <p className="text-muted-foreground">Automação não encontrada</p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full flex-1">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{automation.name}</h2>
            <p className="text-sm text-muted-foreground">{automation.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Nó
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saveFlow.isPending}
          >
            {saveFlow.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex relative min-h-0">
        <div className="flex-1 relative w-full h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={(changes) => {
              onNodesChange(changes);
              if (changes.some(c => c.type === 'position' && 'dragging' in c && !c.dragging)) {
                setHasChanges(true);
              }
            }}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-muted/30"
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Panel position="bottom-left" className="bg-background/80 backdrop-blur-sm rounded-lg p-2 text-xs text-muted-foreground">
              Arraste para conectar os nós • Clique em um nó para editar
            </Panel>
          </ReactFlow>
        </div>

        {/* Config Panel */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={handleNodeUpdate}
            onDelete={handleDeleteNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      <AddNodeDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
        onAdd={handleAddNode}
      />
    </div>
  );
}
