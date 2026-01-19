import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-background shadow-sm min-w-[180px] ${
      selected ? 'border-primary' : 'border-amber-500'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-amber-500/10">
          <GitBranch className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <div className="text-xs font-medium text-amber-600">CONDIÇÃO</div>
          <div className="text-sm font-medium">{data.label || 'Se/Então'}</div>
        </div>
      </div>
      <div className="flex justify-between mt-2 text-xs">
        <span className="text-orange-600">Sim</span>
        <span className="text-red-600">Não</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%' }} className="!bg-orange-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%' }} className="!bg-red-500 !w-3 !h-3" />
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';
