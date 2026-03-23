import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Timer } from 'lucide-react';

export const WaitNode = memo(({ data, selected }: NodeProps) => {
  const getValue = () => {
    const value = data.wait_value || data.delay_value || 1;
    const type = data.wait_type || data.delay_type || 'days';
    const labels: Record<string, string> = { minutes: 'minuto(s)', hours: 'hora(s)', days: 'dia(s)' };
    return `${value} ${labels[type] || type}`;
  };

  return (
    <div className={`automation-node px-4 py-3 rounded-xl min-w-[180px] ${
      selected ? 'ring-2 ring-purple-400/60' : ''
    }`} style={{ '--node-accent': '#a855f7' } as React.CSSProperties}>
      <Handle type="target" position={Position.Top} className="!bg-purple-400 !w-3 !h-3 !border-2 !border-purple-500/50" />
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/20 shrink-0">
          <Timer className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Aguardar</div>
          <div className="text-sm font-semibold text-white/90">{getValue()}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-400 !w-3 !h-3 !border-2 !border-purple-500/50" />
    </div>
  );
});

WaitNode.displayName = 'WaitNode';
