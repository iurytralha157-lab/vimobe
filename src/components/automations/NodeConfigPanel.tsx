import { Node } from 'reactflow';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Trash2 } from 'lucide-react';
import { useWhatsAppSessions } from '@/hooks/use-whatsapp-sessions';
import { useStages } from '@/hooks/use-stages';
import { useTags } from '@/hooks/use-tags';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

// Debounced input component to prevent lag
function DebouncedInput({ 
  value: initialValue, 
  onChange, 
  debounce = 300,
  ...props 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  debounce?: number;
} & Omit<React.ComponentProps<typeof Input>, 'onChange'>) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (value !== initialValue) {
        onChange(value);
      }
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value, debounce, onChange, initialValue]);

  return <Input {...props} value={value} onChange={(e) => setValue(e.target.value)} />;
}

// Debounced textarea component
function DebouncedTextarea({ 
  value: initialValue, 
  onChange, 
  debounce = 300,
  ...props 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  debounce?: number;
} & Omit<React.ComponentProps<typeof Textarea>, 'onChange'>) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (value !== initialValue) {
        onChange(value);
      }
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value, debounce, onChange, initialValue]);

  return <Textarea {...props} value={value} onChange={(e) => setValue(e.target.value)} />;
}

export function NodeConfigPanel({ node, onUpdate, onDelete, onClose }: NodeConfigPanelProps) {
  const { data: sessions } = useWhatsAppSessions();
  const { data: stages } = useStages();
  const { data: tags } = useTags();

  const handleChange = useCallback((key: string, value: unknown) => {
    onUpdate(node.id, { [key]: value });
  }, [node.id, onUpdate]);

  const renderTriggerConfig = () => {
    const triggerType = node.data.trigger_type;

    switch (triggerType) {
      case 'message_received':
        return (
          <>
            <div className="space-y-2">
              <Label>Sessão WhatsApp</Label>
              <Select
                value={node.data.session_id || 'all'}
                onValueChange={(v) => handleChange('session_id', v === 'all' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer sessão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer sessão</SelectItem>
                  {sessions?.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.display_name || session.instance_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Palavra-chave (opcional)</Label>
              <DebouncedInput
                value={node.data.keyword || ''}
                onChange={(v) => handleChange('keyword', v)}
                placeholder="Ex: preço, oi, olá"
              />
              <p className="text-xs text-muted-foreground">
                Dispara apenas se a mensagem contiver esta palavra
              </p>
            </div>
          </>
        );

      case 'scheduled':
        return (
          <>
            <div className="space-y-2">
              <Label>Horário (cron)</Label>
              <DebouncedInput
                value={node.data.cron || ''}
                onChange={(v) => handleChange('cron', v)}
                placeholder="0 9 * * *"
              />
              <p className="text-xs text-muted-foreground">
                Formato cron. Ex: "0 9 * * *" = todos os dias às 9h
              </p>
            </div>
          </>
        );

      case 'lead_stage_changed':
        return (
          <>
            <div className="space-y-2">
              <Label>Para etapa</Label>
              <Select
                value={node.data.to_stage_id || undefined}
                onValueChange={(v) => handleChange('to_stage_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  {stages?.length ? stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  )) : <SelectItem value="none" disabled>Nenhuma etapa</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'tag_added':
        return (
          <div className="space-y-2">
            <Label>Tag</Label>
            <Select
              value={node.data.tag_id || undefined}
              onValueChange={(v) => handleChange('tag_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a tag" />
              </SelectTrigger>
              <SelectContent>
                {tags?.length ? tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                )) : <SelectItem value="none" disabled>Nenhuma tag</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        );

      case 'inactivity':
        return (
          <div className="space-y-2">
            <Label>Dias de inatividade</Label>
            <Input
              type="number"
              min={1}
              value={node.data.days || 3}
              onChange={(e) => handleChange('days', parseInt(e.target.value))}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderActionConfig = () => {
    const actionType = node.data.actionType;

    switch (actionType) {
      case 'send_whatsapp':
        return (
          <>
            <div className="space-y-2">
              <Label>Sessão WhatsApp</Label>
              <Select
                value={node.data.session_id || undefined}
                onValueChange={(v) => handleChange('session_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a sessão" />
                </SelectTrigger>
                <SelectContent>
                  {sessions?.length ? sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.display_name || session.instance_name}
                    </SelectItem>
                  )) : <SelectItem value="none" disabled>Nenhuma sessão</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <DebouncedTextarea
                value={node.data.message || ''}
                onChange={(v) => handleChange('message', v)}
                placeholder="Olá {{lead.name}}! Como posso ajudar?"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Variáveis: {'{{lead.name}}'}, {'{{lead.phone}}'}, {'{{lead.email}}'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>URL da mídia (opcional)</Label>
              <DebouncedInput
                value={node.data.media_url || ''}
                onChange={(v) => handleChange('media_url', v)}
                placeholder="https://..."
              />
            </div>
          </>
        );

      case 'move_lead':
        return (
          <div className="space-y-2">
            <Label>Mover para etapa</Label>
            <Select
              value={node.data.stage_id || undefined}
              onValueChange={(v) => handleChange('stage_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a etapa" />
              </SelectTrigger>
              <SelectContent>
                {stages?.length ? stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                )) : <SelectItem value="none" disabled>Nenhuma etapa</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        );

      case 'add_tag':
      case 'remove_tag':
        return (
          <div className="space-y-2">
            <Label>{actionType === 'add_tag' ? 'Adicionar tag' : 'Remover tag'}</Label>
            <Select
              value={node.data.tag_id || undefined}
              onValueChange={(v) => handleChange('tag_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a tag" />
              </SelectTrigger>
              <SelectContent>
                {tags?.length ? tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                )) : <SelectItem value="none" disabled>Nenhuma tag</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        );

      case 'create_task':
        return (
          <>
            <div className="space-y-2">
              <Label>Título da tarefa</Label>
              <DebouncedInput
                value={node.data.title || ''}
                onChange={(v) => handleChange('title', v)}
                placeholder="Follow-up com lead"
              />
            </div>
            <div className="space-y-2">
              <Label>Vencimento em (dias)</Label>
              <Input
                type="number"
                min={0}
                value={node.data.due_days || 1}
                onChange={(e) => handleChange('due_days', parseInt(e.target.value))}
              />
            </div>
          </>
        );

      case 'webhook':
        return (
          <>
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <DebouncedInput
                value={node.data.url || ''}
                onChange={(v) => handleChange('url', v)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Método</Label>
              <Select
                value={node.data.method || 'POST'}
                onValueChange={(v) => handleChange('method', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const renderDelayConfig = () => (
    <>
      <div className="space-y-2">
        <Label>Tipo de espera</Label>
        <Select
          value={node.data.delay_type || 'minutes'}
          onValueChange={(v) => handleChange('delay_type', v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">Minutos</SelectItem>
            <SelectItem value="hours">Horas</SelectItem>
            <SelectItem value="days">Dias</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Quantidade</Label>
        <Input
          type="number"
          min={1}
          value={node.data.delay_value || 5}
          onChange={(e) => handleChange('delay_value', parseInt(e.target.value))}
        />
      </div>
    </>
  );

  const renderConditionConfig = () => (
    <>
      <div className="space-y-2">
        <Label>Tipo de condição</Label>
        <Select
          value={node.data.condition_type || 'has_tag'}
          onValueChange={(v) => handleChange('condition_type', v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="has_tag">Tem tag?</SelectItem>
            <SelectItem value="in_stage">Está na etapa?</SelectItem>
            <SelectItem value="message_contains">Mensagem contém?</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {node.data.condition_type === 'has_tag' && (
        <div className="space-y-2">
          <Label>Tag</Label>
          <Select
            value={node.data.tag_id || undefined}
            onValueChange={(v) => handleChange('tag_id', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a tag" />
            </SelectTrigger>
            <SelectContent>
              {tags?.length ? tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              )) : <SelectItem value="none" disabled>Nenhuma tag</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      )}

      {node.data.condition_type === 'in_stage' && (
        <div className="space-y-2">
          <Label>Etapa</Label>
          <Select
            value={node.data.stage_id || undefined}
            onValueChange={(v) => handleChange('stage_id', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a etapa" />
            </SelectTrigger>
            <SelectContent>
              {stages?.length ? stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              )) : <SelectItem value="none" disabled>Nenhuma etapa</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      )}

      {node.data.condition_type === 'message_contains' && (
        <div className="space-y-2">
          <Label>Texto</Label>
          <DebouncedInput
            value={node.data.text || ''}
            onChange={(v) => handleChange('text', v)}
            placeholder="Ex: preço, valor"
          />
        </div>
      )}
    </>
  );

  const getNodeTitle = () => {
    switch (node.type) {
      case 'trigger':
        return 'Configurar Gatilho';
      case 'action':
        return 'Configurar Ação';
      case 'condition':
        return 'Configurar Condição';
      case 'delay':
        return 'Configurar Espera';
      default:
        return 'Configurar Nó';
    }
  };

  // Stop propagation to prevent ReactFlow from capturing keyboard events
  const stopPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="w-80 border-l bg-background overflow-y-auto h-full absolute right-0 top-0 bottom-0 z-10 shadow-lg"
      onKeyDown={stopPropagation}
      onKeyUp={stopPropagation}
      onKeyPress={stopPropagation}
      onMouseDown={stopPropagation}
      onClick={stopPropagation}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">{getNodeTitle()}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {node.type === 'trigger' && renderTriggerConfig()}
        {node.type === 'action' && renderActionConfig()}
        {node.type === 'delay' && renderDelayConfig()}
        {node.type === 'condition' && renderConditionConfig()}

        {/* Delete button */}
        {node.type !== 'trigger' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Nó
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir nó?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O nó e suas conexões serão removidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(node.id)}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
