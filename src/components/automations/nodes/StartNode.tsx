import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Play, Tag, UserPlus, ArrowRightLeft, Hand } from 'lucide-react';

const getTriggerIcon = (triggerType?: string) => {
  switch (triggerType) {
    case 'tag_added': return Tag;
    case 'lead_created': return UserPlus;
    case 'lead_stage_changed': return ArrowRightLeft;
    case 'manual': return Hand;
    default: return Play;
  }
};

const getTriggerLabel = (triggerType?: string) => {
  switch (triggerType) {
    case 'tag_added': return 'Tag adicionada';
    case 'lead_created': return 'Lead criado';
    case 'lead_stage_changed': return 'Mudou de etapa';
    case 'manual': return 'Disparo manual';
    default: return 'Início';
  }
};

export const StartNode = memo(({ data, selected }: NodeProps) => {
  const Icon = getTriggerIcon(data.trigger_type);

  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-background shadow-md min-w-[180px] ${
      selected ? 'border-primary ring-2 ring-primary/20' : 'border-orange-500'
    }`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-orange-500/10 shrink-0">
          <Icon className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <div className="text-xs font-bold text-orange-600 uppercase">Início</div>
          <div className="text-sm font-semibold">{getTriggerLabel(data.trigger_type)}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-orange-500 !w-3 !h-3" />
    </div>
  );
});

StartNode.displayName = 'StartNode';
