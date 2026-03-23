import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Webhook } from 'lucide-react';

export const WebhookNode = memo(({ data, selected }: NodeProps) => {
  const url = data.webhook_url || '';
  const method = data.method || 'POST';

  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-background shadow-md min-w-[220px] max-w-[280px] ${
      selected ? 'border-primary ring-2 ring-primary/20' : 'border-indigo-500'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-3 !h-3" />
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-indigo-500/10 shrink-0">
          <Webhook className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-600 uppercase">Webhook</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-700 px-1.5 py-0.5 rounded font-mono">
              {method}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {url || 'Clique para configurar...'}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-3 !h-3" />
    </div>
  );
});

WebhookNode.displayName = 'WebhookNode';
