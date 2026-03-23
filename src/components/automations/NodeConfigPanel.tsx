import { Node } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Trash2, Play, MessageSquare, Timer, Image, Headphones, Video, Type,
  GitBranch, Webhook, FlipHorizontal, ExternalLink, PenLine, X, Save, GripHorizontal,
} from 'lucide-react';
import { TriggerType } from '@/hooks/use-automations';
import { useRef, useState, useCallback, useEffect } from 'react';

interface NodeConfigPanelProps {
  selectedNode: Node;
  onClose: () => void;
  onNodeDataChange: (nodeId: string, data: Record<string, unknown>) => void;
  onDeleteNode: (nodeId: string) => void;
  onSaveNode?: () => void;
  triggerType?: TriggerType;
  setTriggerType?: (t: TriggerType) => void;
  tags?: Array<{ id: string; name: string; color?: string | null }>;
  tagId?: string;
  setTagId?: (id: string) => void;
  pipelines?: Array<{ id: string; name: string }>;
  pipelineId?: string;
  setPipelineId?: (id: string) => void;
  stages?: Array<{ id: string; name: string; color?: string | null }>;
  stageId?: string;
  setStageId?: (id: string) => void;
  position?: { x: number; y: number };
  // Start node extras
  sessions?: Array<{ id: string; instance_name: string; display_name?: string | null; status: string }>;
  sessionId?: string;
  setSessionId?: (id: string) => void;
  users?: Array<{ id: string; name: string | null; email: string }>;
  filterUserId?: string;
  setFilterUserId?: (id: string) => void;
}

const NODE_TITLES: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  start: { icon: Play, label: 'Início', color: 'text-orange-500' },
  message: { icon: MessageSquare, label: 'Mensagem', color: 'text-green-600 dark:text-green-400' },
  wait: { icon: Timer, label: 'Espera', color: 'text-purple-600 dark:text-purple-400' },
  image: { icon: Image, label: 'Imagem', color: 'text-blue-600 dark:text-blue-400' },
  audio: { icon: Headphones, label: 'Áudio', color: 'text-amber-600 dark:text-amber-400' },
  video: { icon: Video, label: 'Vídeo', color: 'text-rose-600 dark:text-rose-400' },
  input: { icon: Type, label: 'Input', color: 'text-cyan-600 dark:text-cyan-400' },
  condition: { icon: GitBranch, label: 'Condição', color: 'text-yellow-600 dark:text-yellow-400' },
  webhook: { icon: Webhook, label: 'Webhook', color: 'text-indigo-600 dark:text-indigo-400' },
  abtest: { icon: FlipHorizontal, label: 'Teste AB', color: 'text-pink-600 dark:text-pink-400' },
  redirect: { icon: ExternalLink, label: 'Redirecionar', color: 'text-teal-600 dark:text-teal-400' },
  variable: { icon: PenLine, label: 'Variável', color: 'text-yellow-600 dark:text-yellow-400' },
};

export function NodeConfigPanel({
  selectedNode, onClose, onNodeDataChange, onDeleteNode, onSaveNode,
  tags, tagId, setTagId, setTriggerType,
  pipelines, pipelineId, setPipelineId, stages, stageId, setStageId,
  position,
  sessions, sessionId, setSessionId,
  users, filterUserId, setFilterUserId,
}: NodeConfigPanelProps) {
  const nodeInfo = NODE_TITLES[selectedNode.type || ''] || { icon: Play, label: 'Nó', color: 'text-foreground' };
  const Icon = nodeInfo.icon;

  // Dragging logic
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, panelX: 0, panelY: 0 });

  // Set initial position from prop when node changes
  useEffect(() => {
    if (position) {
      setPanelPos({ x: position.x, y: position.y });
    }
  }, [selectedNode.id, position]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, panelX: panelPos.x, panelY: panelPos.y };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      setPanelPos({
        x: dragStartRef.current.panelX + (ev.clientX - dragStartRef.current.mouseX),
        y: dragStartRef.current.panelY + (ev.clientY - dragStartRef.current.mouseY),
      });
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [panelPos]);

  const connectedSessions = sessions?.filter(s => s.status === 'connected') || [];

  return (
    <div
      ref={panelRef}
      className="absolute w-[300px] bg-card border border-border rounded-2xl overflow-hidden flex flex-col max-h-[70vh] z-[100] shadow-lg"
      style={{ left: panelPos.x, top: panelPos.y }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/50 shrink-0 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          <Icon className={`h-4 w-4 ${nodeInfo.color}`} />
          <span className="text-sm font-semibold text-foreground">{nodeInfo.label}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {selectedNode.type === 'start' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Disparar quando</Label>
                <Select value={selectedNode.data.trigger_type || 'manual'}
                  onValueChange={(v: TriggerType) => { onNodeDataChange(selectedNode.id, { trigger_type: v }); setTriggerType?.(v); }}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tag_added">Tag adicionada</SelectItem>
                    <SelectItem value="lead_created">Lead criado</SelectItem>
                    <SelectItem value="lead_stage_changed">Mudou de etapa</SelectItem>
                    <SelectItem value="manual">Disparo manual</SelectItem>
                    <SelectItem value="message_received">Mensagem recebida</SelectItem>
                    <SelectItem value="inactivity">Inatividade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedNode.data.trigger_type === 'tag_added' && tags && setTagId && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Tag</Label>
                  <Select value={tagId} onValueChange={setTagId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{tags.map((t) => (
                      <SelectItem key={t.id} value={t.id}><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color || '#888' }} />{t.name}</div></SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
              )}
              {selectedNode.data.trigger_type === 'lead_stage_changed' && pipelines && setPipelineId && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pipeline</Label>
                    <Select value={pipelineId} onValueChange={setPipelineId}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {pipelineId && stages && setStageId && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Etapa</Label>
                      <Select value={stageId} onValueChange={setStageId}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{stages.map((s) => (
                          <SelectItem key={s.id} value={s.id}><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color || '#888' }} />{s.name}</div></SelectItem>
                        ))}</SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
              {selectedNode.data.trigger_type === 'inactivity' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Tempo de inatividade</Label>
                  <div className="flex gap-2">
                    <Input type="number" min={1} className="w-20 h-9" value={selectedNode.data.inactivity_value || 1}
                      onChange={(e) => onNodeDataChange(selectedNode.id, { inactivity_value: parseInt(e.target.value) || 1 })} />
                    <Select value={selectedNode.data.inactivity_unit || 'days'}
                      onValueChange={(v) => onNodeDataChange(selectedNode.id, { inactivity_unit: v })}>
                      <SelectTrigger className="flex-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="hours">Horas</SelectItem><SelectItem value="days">Dias</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Session WhatsApp - moved from sidebar */}
              {connectedSessions.length > 0 && setSessionId && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <Label className="text-xs">Sessão WhatsApp</Label>
                  <Select value={sessionId || ''} onValueChange={setSessionId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{connectedSessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.display_name || s.instance_name}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
              )}

              {/* User filter - moved from sidebar */}
              {users && setFilterUserId && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Filtrar por usuário</Label>
                  <Select value={filterUserId || '__all__'} onValueChange={(v) => setFilterUserId(v === '__all__' ? '' : v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos os usuários</SelectItem>
                      <SelectItem value="__me__">Apenas meus leads</SelectItem>
                      {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {selectedNode.type === 'message' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Mensagem</Label>
              <Textarea value={selectedNode.data.message || ''} rows={5} placeholder="Digite a mensagem..."
                onChange={(e) => onNodeDataChange(selectedNode.id, { message: e.target.value })} />
              <p className="text-[11px] text-muted-foreground">{'{{lead.name}}'}, {'{{lead.phone}}'}</p>
            </div>
          )}

          {selectedNode.type === 'wait' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tempo de espera</Label>
                <div className="flex gap-2">
                  <Input type="number" min={1} value={selectedNode.data.wait_value || 1} className="w-20 h-9"
                    onChange={(e) => onNodeDataChange(selectedNode.id, { wait_value: parseInt(e.target.value) || 1 })} />
                  <Select value={selectedNode.data.wait_type || 'days'} onValueChange={(v) => onNodeDataChange(selectedNode.id, { wait_type: v })}>
                    <SelectTrigger className="flex-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="minutes">Minutos</SelectItem><SelectItem value="hours">Horas</SelectItem><SelectItem value="days">Dias</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>

              {/* Stop on reply - moved here from sidebar */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id={`stop-reply-${selectedNode.id}`} 
                    checked={selectedNode.data.stop_on_reply === true} 
                    onCheckedChange={(c) => onNodeDataChange(selectedNode.id, { stop_on_reply: c === true })} 
                  />
                  <Label htmlFor={`stop-reply-${selectedNode.id}`} className="text-xs cursor-pointer">
                    Se o lead responder
                  </Label>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Cria duas saídas: "Respondeu" e "Timeout". Configure ações diferentes para cada caminho.
                </p>
                {selectedNode.data.stop_on_reply && (
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Mensagem ao responder</Label>
                      <Textarea 
                        value={selectedNode.data.on_reply_message || ''} 
                        onChange={(e) => onNodeDataChange(selectedNode.id, { on_reply_message: e.target.value })} 
                        placeholder="Mensagem automática ao responder..."
                        rows={2}
                        className="text-xs"
                      />
                    </div>
                    {stages && stages.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Mover para etapa</Label>
                        <Select 
                          value={selectedNode.data.on_reply_stage_id || '__none__'} 
                          onValueChange={(v) => onNodeDataChange(selectedNode.id, { on_reply_stage_id: v === '__none__' ? '' : v })}
                        >
                          <SelectTrigger className="h-9"><SelectValue placeholder="Não mover" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Não mover</SelectItem>
                            {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedNode.type === 'image' && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">URL da Imagem</Label>
                <Input value={selectedNode.data.image_url || ''} placeholder="https://..." className="h-9" onChange={(e) => onNodeDataChange(selectedNode.id, { image_url: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Legenda</Label>
                <Input value={selectedNode.data.caption || ''} placeholder="Legenda" className="h-9" onChange={(e) => onNodeDataChange(selectedNode.id, { caption: e.target.value })} /></div>
            </div>
          )}

          {selectedNode.type === 'audio' && (
            <div className="space-y-1.5"><Label className="text-xs">URL do Áudio</Label>
              <Input value={selectedNode.data.audio_url || ''} placeholder="https://..." className="h-9" onChange={(e) => onNodeDataChange(selectedNode.id, { audio_url: e.target.value })} /></div>
          )}

          {selectedNode.type === 'video' && (
            <div className="space-y-1.5"><Label className="text-xs">URL do Vídeo</Label>
              <Input value={selectedNode.data.video_url || ''} placeholder="https://..." className="h-9" onChange={(e) => onNodeDataChange(selectedNode.id, { video_url: e.target.value })} /></div>
          )}

          {selectedNode.type === 'input' && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">Tipo</Label>
                <Select value={selectedNode.data.input_type || 'text'} onValueChange={(v) => onNodeDataChange(selectedNode.id, { input_type: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="text">Texto</SelectItem><SelectItem value="number">Número</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="phone">Telefone</SelectItem><SelectItem value="website">Website</SelectItem><SelectItem value="date">Data</SelectItem><SelectItem value="button">Botão</SelectItem></SelectContent>
                </Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Pergunta</Label>
                <Textarea value={selectedNode.data.prompt || ''} rows={2} placeholder="Ex: Qual seu nome?" onChange={(e) => onNodeDataChange(selectedNode.id, { prompt: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Salve a resposta em uma variável:</Label>
                <Input value={selectedNode.data.variable_name || ''} placeholder="Selecione uma variável" className="h-9" onChange={(e) => onNodeDataChange(selectedNode.id, { variable_name: e.target.value })} /></div>
              {selectedNode.data.input_type === 'button' && (
                <div className="space-y-1.5"><Label className="text-xs">Opções (uma por linha)</Label>
                  <Textarea value={(selectedNode.data.buttons || []).join('\n')} rows={3} placeholder={'Opção 1\nOpção 2'} onChange={(e) => onNodeDataChange(selectedNode.id, { buttons: e.target.value.split('\n').filter(Boolean) })} /></div>
              )}
            </div>
          )}

          {selectedNode.type === 'condition' && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">Variável</Label>
                <Input value={selectedNode.data.variable || ''} placeholder="ex: lead.source" className="h-9" onChange={(e) => onNodeDataChange(selectedNode.id, { variable: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Operador</Label>
                <Select value={selectedNode.data.operator || 'equals'} onValueChange={(v) => onNodeDataChange(selectedNode.id, { operator: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="equals">Igual a</SelectItem><SelectItem value="not_equals">Diferente</SelectItem><SelectItem value="contains">Contém</SelectItem><SelectItem value="not_contains">Não contém</SelectItem><SelectItem value="greater_than">Maior que</SelectItem><SelectItem value="less_than">Menor que</SelectItem><SelectItem value="is_set">Existe</SelectItem><SelectItem value="is_not_set">Não existe</SelectItem></SelectContent>
                </Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Valor</Label>
                <Input value={selectedNode.data.value || ''} placeholder="valor esperado" className="h-9" onChange={(e) => onNodeDataChange(selectedNode.id, { value: e.target.value })} /></div>
            </div>
          )}

          {selectedNode.type === 'webhook' && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">URL</Label>
                <Input value={selectedNode.data.webhook_url || ''} placeholder="https://..." className="h-9" onChange={(e) => onNodeDataChange(selectedNode.id, { webhook_url: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Método</Label>
                <Select value={selectedNode.data.method || 'POST'} onValueChange={(v) => onNodeDataChange(selectedNode.id, { method: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="GET">GET</SelectItem><SelectItem value="POST">POST</SelectItem><SelectItem value="PUT">PUT</SelectItem><SelectItem value="PATCH">PATCH</SelectItem></SelectContent>
                </Select></div>
            </div>
          )}

          {selectedNode.type === 'abtest' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Distribuição A (%)</Label>
              <Input type="number" min={1} max={99} value={selectedNode.data.split_a || 50} className="h-9"
                onChange={(e) => onNodeDataChange(selectedNode.id, { split_a: parseInt(e.target.value) || 50 })} />
              <p className="text-[11px] text-muted-foreground">A: {selectedNode.data.split_a || 50}% / B: {100 - (selectedNode.data.split_a || 50)}%</p>
            </div>
          )}

          {selectedNode.type === 'redirect' && (
            <div className="space-y-1.5"><Label className="text-xs">URL</Label>
              <Input value={selectedNode.data.redirect_url || ''} placeholder="https://..." className="h-9" onChange={(e) => onNodeDataChange(selectedNode.id, { redirect_url: e.target.value })} /></div>
          )}

          {selectedNode.type === 'variable' && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">Nome da variável</Label>
                <Input value={selectedNode.data.variable_name || ''} placeholder="ex: pontuacao" className="h-9" onChange={(e) => onNodeDataChange(selectedNode.id, { variable_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Valor</Label>
                <Input value={selectedNode.data.variable_value || ''} placeholder="ex: 100" className="h-9" onChange={(e) => onNodeDataChange(selectedNode.id, { variable_value: e.target.value })} /></div>
            </div>
          )}

          <div className="pt-3 border-t border-border space-y-2">
            {onSaveNode && (
              <Button size="sm" className="w-full h-8 text-xs" onClick={onSaveNode}>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Guardar
              </Button>
            )}
            <Button variant="destructive" size="sm" className="w-full h-8 text-xs" onClick={() => onDeleteNode(selectedNode.id)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Remover nó
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
