import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FlipHorizontal } from 'lucide-react';

export const ABTestNode = memo(({ data, selected }: NodeProps) => {
  const splitA = data.split_a || 50;
  const splitB = 100 - splitA;

  return (
    <div className={`automation-node px-4 py-3 rounded-xl min-w-[220px] max-w-[280px] ${
      selected ? 'ring-2 ring-pink-400/60' : ''
    }`} style={{ '--node-accent': '#ec4899' } as React.CSSProperties}>
      <Handle type="target" position={Position.Left} className="!bg-pink-400 !w-3 !h-3 !border-2 !border-pink-500/50" />
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-pink-500/20 shrink-0">
          <FlipHorizontal className="h-5 w-5 text-pink-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">Teste AB</span>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${splitA}%` }} />
            </div>
            <span className="text-[10px] text-white/50">{splitA}/{splitB}</span>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="a"
        className="!bg-blue-400 !w-3 !h-3 !border-2 !border-blue-500/50" style={{ left: '30%' }} />
      <Handle type="source" position={Position.Bottom} id="b"
        className="!bg-orange-400 !w-3 !h-3 !border-2 !border-orange-500/50" style={{ left: '70%' }} />
      <div className="flex justify-between mt-2 px-2 text-[10px]">
        <span className="text-blue-400 font-medium">A ({splitA}%)</span>
        <span className="text-orange-400 font-medium">B ({splitB}%)</span>
      </div>
    </div>
  );
});

ABTestNode.displayName = 'ABTestNode';
