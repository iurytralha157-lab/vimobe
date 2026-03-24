import { Node } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Trash2, Play, MessageSquare, Timer, Image, Headphones, Video,
  GitBranch, Webhook, Tag, ArrowRightLeft, UserCheck, X, Save, GripHorizontal,
  Home, CircleDot,
} from 'lucide-react';
import { TriggerType } from '@/hooks/use-automations';
import { useRef, useState, useCallback, useEffect } from 'react';
import { AutomationMediaGallery } from './AutomationMediaGallery';
import { AudioRecorderInline } from './AudioRecorderInline';

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
  condition: { icon: GitBranch, label: 'Condição', color: 'text-yellow-600 dark:text-yellow-400' },
  webhook: { icon: Webhook, label: 'Webhook', color: 'text-indigo-600 dark:text-indigo-400' },
  tag: { icon: Tag, label: 'Tag', color: 'text-teal-600 dark:text-teal-400' },
  move_stage: { icon: ArrowRightLeft, label: 'Mudar Etapa', color: 'text-violet-600 dark:text-violet-400' },
  assign_user: { icon: UserCheck, label: 'Responsável', color: 'text-sky-600 dark:text-sky-400' },
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
      className="absolute w-[300px] bg-card border border-border rounded-2xl flex flex-col max-h-[70vh] z-[100] shadow-lg"
      style={{ left: panelPos.x, top: panelPos.y, isolation: 'isolate' }}
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
                  <SelectContent className="z-[200]">
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
                    <SelectContent className="z-[200]">{tags.map((t) => (
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
                      <SelectContent className="z-[200]">{pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {pipelineId && stages && setStageId && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Etapa</Label>
                      <Select value={stageId} onValueChange={setStageId}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent className="z-[200]">{stages.map((s) => (
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
                      <SelectContent className="z-[200]"><SelectItem value="hours">Horas</SelectItem><SelectItem value="days">Dias</SelectItem></SelectContent>
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
                    <SelectContent className="z-[200]">{connectedSessions.map((s) => (
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
                    <SelectContent className="z-[200]">
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
                    <SelectContent className="z-[200]"><SelectItem value="minutes">Minutos</SelectItem><SelectItem value="hours">Horas</SelectItem><SelectItem value="days">Dias</SelectItem></SelectContent>
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
                          <SelectContent className="z-[200]">
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
              <div className="space-y-1.5">
                <Label className="text-xs">Galeria de Imagens</Label>
                <AutomationMediaGallery
                  mediaType="image"
                  accept="image/*"
                  selectedUrl={selectedNode.data.image_url || ''}
                  onSelect={(url) => onNodeDataChange(selectedNode.id, { image_url: url })}
                />
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Ou cole uma URL</Label>
                <Input value={selectedNode.data.image_url || ''} placeholder="https://..." className="h-9" onChange={(e) => onNodeDataChange(selectedNode.id, { image_url: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Legenda</Label>
                <Input value={selectedNode.data.caption || ''} placeholder="Legenda" className="h-9" onChange={(e) => onNodeDataChange(selectedNode.id, { caption: e.target.value })} /></div>
            </div>
          )}

          {selectedNode.type === 'audio' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Gravar Áudio</Label>
                <AudioRecorderInline
                  onUploaded={(url) => onNodeDataChange(selectedNode.id, { audio_url: url, audio_type: 'voice' })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Galeria de Áudios</Label>
                <AutomationMediaGallery
                  mediaType="audio"
                  accept="audio/*"
                  selectedUrl={selectedNode.data.audio_url || ''}
                  onSelect={(url) => onNodeDataChange(selectedNode.id, { audio_url: url })}
                />
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Ou cole uma URL</Label>
                <Input value={selectedNode.data.audio_url || ''} placeholder="https://..." className="h-9" onChange={(e) => onNodeDataChange(selectedNode.id, { audio_url: e.target.value })} /></div>
            </div>
          )}

          {selectedNode.type === 'video' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Galeria de Vídeos</Label>
                <AutomationMediaGallery
                  mediaType="video"
                  accept="video/*"
                  selectedUrl={selectedNode.data.video_url || ''}
                  onSelect={(url) => onNodeDataChange(selectedNode.id, { video_url: url })}
                />
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Ou cole uma URL</Label>
                <Input value={selectedNode.data.video_url || ''} placeholder="https://..." className="h-9" onChange={(e) => onNodeDataChange(selectedNode.id, { video_url: e.target.value })} /></div>
            </div>
          )}

          {selectedNode.type === 'tag' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Ação</Label>
                <Select value={selectedNode.data.tag_action || 'add'} onValueChange={(v) => onNodeDataChange(selectedNode.id, { tag_action: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="add">Adicionar tag</SelectItem>
                    <SelectItem value="remove">Remover tag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {tags && tags.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Tag</Label>
                  <Select value={selectedNode.data.tag_id || ''} onValueChange={(v) => {
                    const selectedTag = tags.find(t => t.id === v);
                    onNodeDataChange(selectedNode.id, { tag_id: v, tag_name: selectedTag?.name || '' });
                  }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="z-[200]">
                      {tags.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color || '#888' }} />
                            {t.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {selectedNode.type === 'move_stage' && (
            <div className="space-y-3">
              {pipelines && pipelines.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Pipeline</Label>
                  <Select value={selectedNode.data.move_pipeline_id || ''} onValueChange={(v) => onNodeDataChange(selectedNode.id, { move_pipeline_id: v, move_stage_id: '' })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="z-[200]">
                      {pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {selectedNode.data.move_pipeline_id && stages && stages.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Etapa</Label>
                  <Select value={selectedNode.data.move_stage_id || ''} onValueChange={(v) => {
                    const selectedStage = stages.find(s => s.id === v);
                    onNodeDataChange(selectedNode.id, { move_stage_id: v, stage_name: selectedStage?.name || '' });
                  }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="z-[200]">
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color || '#888' }} />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {selectedNode.type === 'assign_user' && (
            <div className="space-y-3">
              {users && users.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Novo responsável</Label>
                  <Select value={selectedNode.data.assign_user_id || ''} onValueChange={(v) => {
                    const selectedUser = users.find(u => u.id === v);
                    onNodeDataChange(selectedNode.id, { assign_user_id: v, user_name: selectedUser?.name || selectedUser?.email || '' });
                  }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="z-[200]">
                      {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
