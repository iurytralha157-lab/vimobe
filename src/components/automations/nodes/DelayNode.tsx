import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Clock } from 'lucide-react';

export const DelayNode = memo(({ data, selected }: NodeProps) => {
  const getDelayLabel = () => {
    const value = data.delay_value || 5;
    const type = data.delay_type || 'minutes';
    const labels: Record<string, string> = { minutes: 'minutos', hours: 'horas', days: 'dias' };
    return `${value} ${labels[type] || type}`;
  };

  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-background shadow-sm min-w-[180px] ${
      selected ? 'border-primary' : 'border-purple-500'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-purple-500/10">
          <Clock className="h-4 w-4 text-purple-600" />
        </div>
        <div>
          <div className="text-xs font-medium text-purple-600">AGUARDAR</div>
          <div className="text-sm font-medium">{getDelayLabel()}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3" />
    </div>
  );
});

DelayNode.displayName = 'DelayNode';
