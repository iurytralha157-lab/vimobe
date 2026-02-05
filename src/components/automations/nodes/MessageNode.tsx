import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MessageSquare } from 'lucide-react';

export const MessageNode = memo(({ data, selected }: NodeProps) => {
  const message = data.message || 'Clique para editar...';
  const day = data.day || 1;
  const preview = message.length > 60 ? message.substring(0, 60) + '...' : message;

  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-background shadow-md min-w-[220px] max-w-[280px] ${
      selected ? 'border-primary ring-2 ring-primary/20' : 'border-green-500'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-green-500 !w-3 !h-3" />
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
          <MessageSquare className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-green-600 uppercase">Mensagem</span>
            <span className="text-xs bg-green-500/20 text-green-700 px-1.5 py-0.5 rounded">
              Dia {day}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
            {preview}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3" />
    </div>
  );
});

MessageNode.displayName = 'MessageNode';
