import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Headphones } from 'lucide-react';

export const AudioNode = memo(({ data, selected }: NodeProps) => {
  const url = data.audio_url || '';

  return (
    <div className={`automation-node px-4 py-3 rounded-xl min-w-[220px] max-w-[280px] ${
      selected ? 'ring-2 ring-amber-400/60' : ''
    }`} style={{ '--node-accent': '#f59e0b' } as React.CSSProperties}>
      <Handle type="target" position={Position.Left} className="!bg-amber-400 !w-3 !h-3 !border-2 !border-amber-500/50" />
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20 shrink-0">
          <Headphones className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Áudio</span>
          <p className="text-xs text-white/60 mt-0.5">
            {url ? 'Áudio configurado' : 'Clique para configurar...'}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-amber-400 !w-3 !h-3 !border-2 !border-amber-500/50" />
    </div>
  );
});

AudioNode.displayName = 'AudioNode';
