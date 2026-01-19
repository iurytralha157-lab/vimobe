import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Zap, MessageSquare, Clock, GitBranch, Tag, UserPlus, Play } from 'lucide-react';
import { TriggerType } from '@/hooks/use-automations';

const getTriggerIcon = (triggerType?: string) => {
  switch (triggerType) {
    case 'message_received': return MessageSquare;
    case 'scheduled': return Clock;
    case 'lead_stage_changed': return GitBranch;
    case 'tag_added': return Tag;
    case 'lead_created': return UserPlus;
    case 'manual': return Play;
    default: return Zap;
  }
};

const getTriggerLabel = (triggerType?: string) => {
  switch (triggerType) {
    case 'message_received': return 'Mensagem Recebida';
    case 'scheduled': return 'Agendado';
    case 'lead_stage_changed': return 'Mudança de Etapa';
    case 'tag_added': return 'Tag Adicionada';
    case 'lead_created': return 'Lead Criado';
    case 'inactivity': return 'Inatividade';
    case 'manual': return 'Manual';
    default: return 'Gatilho';
  }
};

export const TriggerNode = memo(({ data, selected }: NodeProps) => {
  const Icon = getTriggerIcon(data.trigger_type);
  
  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-background shadow-sm min-w-[180px] ${
      selected ? 'border-primary' : 'border-orange-500'
    }`}>
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-orange-500/10">
          <Icon className="h-4 w-4 text-orange-600" />
        </div>
        <div>
          <div className="text-xs font-medium text-orange-600">INÍCIO</div>
          <div className="text-sm font-medium">{getTriggerLabel(data.trigger_type)}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-orange-500 !w-3 !h-3" />
    </div>
  );
});

TriggerNode.displayName = 'TriggerNode';
