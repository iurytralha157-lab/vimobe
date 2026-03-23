import { Node } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
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
}: NodeConfigPanelProps) {
  const nodeInfo = NODE_TITLES[selectedNode.type || ''] || { icon: Play, label: 'Nó', color: 'text-foreground' };
  const Icon = nodeInfo.icon;

  // Dragging logic
  const panelRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }, [offset]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setOffset({
        x: dragStart.current.ox + (e.clientX - dragStart.current.x),
        y: dragStart.current.oy + (e.clientY - dragStart.current.y),
      });
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Reset offset when node changes
  useEffect(() => {
    setOffset({ x: 0, y: 0 });
  }, [selectedNode.id]);

  const style: React.CSSProperties = position ? {
    left: position.x + offset.x,
    top: position.y + offset.y,
  } : {
    right: 16 + -offset.x,
    top: 64 + offset.y,
  };

  return (
    <div
      ref={panelRef}
      className="w-[300px] bg-card border border-border rounded-2xl overflow-hidden flex flex-col max-h-[70vh] z-50"
      style={style}
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
