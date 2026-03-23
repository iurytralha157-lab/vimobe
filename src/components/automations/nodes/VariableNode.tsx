import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { PenLine } from 'lucide-react';

export const VariableNode = memo(({ data, selected }: NodeProps) => {
  const variableName = data.variable_name || '';
  const variableValue = data.variable_value || '';

  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-background shadow-md min-w-[220px] max-w-[280px] ${
      selected ? 'border-primary ring-2 ring-primary/20' : 'border-yellow-600'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-yellow-600 !w-3 !h-3" />
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-yellow-600/10 shrink-0">
          <PenLine className="h-5 w-5 text-yellow-600" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold text-yellow-600 uppercase">Variável</span>
          {variableName ? (
            <p className="text-xs text-muted-foreground mt-1">
              <code className="bg-muted px-1 rounded">{variableName}</code> = {variableValue || '...'}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Clique para configurar...</p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-yellow-600 !w-3 !h-3" />
    </div>
  );
});

VariableNode.displayName = 'VariableNode';
