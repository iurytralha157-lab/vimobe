import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const variable = data.variable || '';
  const operator = data.operator || 'equals';
  const value = data.value || '';

  const operatorLabels: Record<string, string> = {
    equals: '=', not_equals: '≠', contains: 'contém', not_contains: 'não contém',
    greater_than: '>', less_than: '<', is_set: 'existe', is_not_set: 'não existe',
  };

  return (
    <div className={`automation-node px-4 py-3 rounded-xl min-w-[220px] max-w-[280px] ${
      selected ? 'ring-2 ring-yellow-400/60' : ''
    }`} style={{ '--node-accent': '#eab308' } as React.CSSProperties}>
      <Handle type="target" position={Position.Left} className="!bg-yellow-400 !w-3 !h-3 !border-2 !border-yellow-500/50" />
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-yellow-500/20 shrink-0">
          <GitBranch className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">Condição</span>
          {variable ? (
            <p className="text-xs text-white/60 mt-1">
              {variable} {operatorLabels[operator] || operator} {value}
            </p>
          ) : (
            <p className="text-xs text-white/60 mt-1">Clique para configurar...</p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="true"
        className="!bg-green-400 !w-3 !h-3 !border-2 !border-green-500/50" style={{ left: '30%' }} />
      <Handle type="source" position={Position.Bottom} id="false"
        className="!bg-red-400 !w-3 !h-3 !border-2 !border-red-500/50" style={{ left: '70%' }} />
      <div className="flex justify-between mt-2 px-2 text-[10px]">
        <span className="text-green-400 font-medium">Sim</span>
        <span className="text-red-400 font-medium">Não</span>
      </div>
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';
