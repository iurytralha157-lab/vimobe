import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ExternalLink } from 'lucide-react';

export const RedirectNode = memo(({ data, selected }: NodeProps) => {
  const url = data.redirect_url || '';

  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-background shadow-md min-w-[220px] max-w-[280px] ${
      selected ? 'border-primary ring-2 ring-primary/20' : 'border-teal-500'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-teal-500 !w-3 !h-3" />
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-teal-500/10 shrink-0">
          <ExternalLink className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase">Redirecionar</span>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {url || 'Clique para configurar...'}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-teal-500 !w-3 !h-3" />
    </div>
  );
});

RedirectNode.displayName = 'RedirectNode';
