import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Headphones } from 'lucide-react';

export const AudioNode = memo(({ data, selected }: NodeProps) => {
  const url = data.audio_url || '';

  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-background shadow-md min-w-[220px] max-w-[280px] ${
      selected ? 'border-primary ring-2 ring-primary/20' : 'border-amber-500'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3" />
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
          <Headphones className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <span className="text-xs font-bold text-amber-600 uppercase">Áudio</span>
          <p className="text-xs text-muted-foreground mt-0.5">
            {url ? 'Áudio configurado' : 'Clique para configurar...'}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3" />
    </div>
  );
});

AudioNode.displayName = 'AudioNode';
