import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Timer } from 'lucide-react';

export const WaitNode = memo(({ data, selected }: NodeProps) => {
  const getValue = () => {
    const value = data.wait_value || data.delay_value || 1;
    const type = data.wait_type || data.delay_type || 'days';
    const labels: Record<string, string> = { 
      minutes: 'minuto(s)', 
      hours: 'hora(s)', 
      days: 'dia(s)' 
    };
    return `${value} ${labels[type] || type}`;
  };

  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-background shadow-md min-w-[180px] ${
      selected ? 'border-primary ring-2 ring-primary/20' : 'border-purple-500'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3" />
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/10 shrink-0">
          <Timer className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <div className="text-xs font-bold text-purple-600 uppercase">Aguardar</div>
          <div className="text-sm font-semibold">{getValue()}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3" />
    </div>
  );
});

WaitNode.displayName = 'WaitNode';
