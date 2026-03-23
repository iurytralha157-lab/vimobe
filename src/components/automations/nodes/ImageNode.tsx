import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Image } from 'lucide-react';

export const ImageNode = memo(({ data, selected }: NodeProps) => {
  const url = data.image_url || '';
  const caption = data.caption || '';

  return (
    <div className={`automation-node px-4 py-3 rounded-xl min-w-[220px] max-w-[280px] ${
      selected ? 'ring-2 ring-blue-400/60' : ''
    }`} style={{ '--node-accent': '#3b82f6' } as React.CSSProperties}>
      <Handle type="target" position={Position.Top} className="!bg-blue-400 !w-3 !h-3 !border-2 !border-blue-500/50" />
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-500/20 shrink-0">
          <Image className="h-5 w-5 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Imagem</span>
          <p className="text-xs text-white/60 line-clamp-1 mt-1">
            {url ? caption || 'Imagem configurada' : 'Clique para configurar...'}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-400 !w-3 !h-3 !border-2 !border-blue-500/50" />
    </div>
  );
});

ImageNode.displayName = 'ImageNode';
