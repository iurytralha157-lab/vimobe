import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MessageSquare, Mail, ArrowRight, Tag, XCircle, CheckSquare, UserPlus, Globe, Zap } from 'lucide-react';

const getActionIcon = (actionType?: string) => {
  switch (actionType) {
    case 'send_whatsapp': return MessageSquare;
    case 'send_email': return Mail;
    case 'move_lead': return ArrowRight;
    case 'add_tag': return Tag;
    case 'remove_tag': return XCircle;
    case 'create_task': return CheckSquare;
    case 'assign_user': return UserPlus;
    case 'webhook': return Globe;
    default: return Zap;
  }
};

const getActionLabel = (actionType?: string) => {
  switch (actionType) {
    case 'send_whatsapp': return 'Enviar WhatsApp';
    case 'send_email': return 'Enviar Email';
    case 'move_lead': return 'Mover Lead';
    case 'add_tag': return 'Adicionar Tag';
    case 'remove_tag': return 'Remover Tag';
    case 'create_task': return 'Criar Tarefa';
    case 'assign_user': return 'Atribuir Usuário';
    case 'webhook': return 'Webhook';
    default: return 'Ação';
  }
};

export const ActionNode = memo(({ data, selected }: NodeProps) => {
  const Icon = getActionIcon(data.actionType);
  
  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-background shadow-sm min-w-[180px] ${
      selected ? 'border-primary' : 'border-blue-500'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-blue-500/10">
          <Icon className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <div className="text-xs font-medium text-blue-600">AÇÃO</div>
          <div className="text-sm font-medium">{getActionLabel(data.actionType)}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3" />
    </div>
  );
});

ActionNode.displayName = 'ActionNode';
