import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const variable = data.variable || '';
  const operator = data.operator || 'equals';
  const value = data.value || '';

  const operatorLabels: Record<string, string> = {
    equals: '=',
    not_equals: '≠',
    contains: 'contém',
    not_contains: 'não contém',
    greater_than: '>',
    less_than: '<',
    is_set: 'existe',
    is_not_set: 'não existe',
  };

  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-background shadow-md min-w-[220px] max-w-[280px] ${
      selected ? 'border-primary ring-2 ring-primary/20' : 'border-yellow-500'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-yellow-500 !w-3 !h-3" />
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-yellow-500/10 shrink-0">
          <GitBranch className="h-5 w-5 text-yellow-600" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold text-yellow-600 uppercase">Condição</span>
          {variable ? (
            <p className="text-xs text-muted-foreground mt-1">
              {variable} {operatorLabels[operator] || operator} {value}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Clique para configurar...</p>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!bg-green-500 !w-3 !h-3"
        style={{ left: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!bg-red-500 !w-3 !h-3"
        style={{ left: '70%' }}
      />
      <div className="flex justify-between mt-2 px-2 text-[10px]">
        <span className="text-green-600 font-medium">Sim</span>
        <span className="text-red-500 font-medium">Não</span>
      </div>
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';
