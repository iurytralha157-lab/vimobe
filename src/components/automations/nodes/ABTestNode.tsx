import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FlipHorizontal } from 'lucide-react';

export const ABTestNode = memo(({ data, selected }: NodeProps) => {
  const splitA = data.split_a || 50;
  const splitB = 100 - splitA;

  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-background shadow-md min-w-[220px] max-w-[280px] ${
      selected ? 'border-primary ring-2 ring-primary/20' : 'border-pink-500'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-pink-500 !w-3 !h-3" />
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-pink-500/10 shrink-0">
          <FlipHorizontal className="h-5 w-5 text-pink-600" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold text-pink-600 uppercase">Teste AB</span>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${splitA}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{splitA}/{splitB}</span>
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        className="!bg-blue-500 !w-3 !h-3"
        style={{ left: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        className="!bg-orange-500 !w-3 !h-3"
        style={{ left: '70%' }}
      />
      <div className="flex justify-between mt-2 px-2 text-[10px]">
        <span className="text-blue-600 font-medium">A ({splitA}%)</span>
        <span className="text-orange-600 font-medium">B ({splitB}%)</span>
      </div>
    </div>
  );
});

ABTestNode.displayName = 'ABTestNode';
