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
    <div className={`automation-node px-4 py-3 rounded-xl min-w-[180px] ${
      selected ? 'ring-2 ring-orange-400/60' : ''
    }`} style={{ '--node-accent': '#f97316' } as React.CSSProperties}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-orange-500/20 shrink-0">
          <Icon className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Início</div>
          <div className="text-sm font-semibold text-white/90">{getTriggerLabel(data.trigger_type)}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-orange-400 !w-3 !h-3 !border-2 !border-orange-500/50" />
    </div>
  );
});

StartNode.displayName = 'StartNode';
