import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Type, Hash, AtSign, Globe, Phone, Calendar, MousePointerClick } from 'lucide-react';

const INPUT_TYPES: Record<string, { label: string; icon: typeof Type; color: string }> = {
  text: { label: 'Texto', icon: Type, color: 'text-cyan-600' },
  number: { label: 'Número', icon: Hash, color: 'text-cyan-600' },
  email: { label: 'Email', icon: AtSign, color: 'text-cyan-600' },
  website: { label: 'Website', icon: Globe, color: 'text-cyan-600' },
  phone: { label: 'Telefone', icon: Phone, color: 'text-cyan-600' },
  date: { label: 'Data', icon: Calendar, color: 'text-cyan-600' },
  button: { label: 'Botão', icon: MousePointerClick, color: 'text-cyan-600' },
};

export const InputNode = memo(({ data, selected }: NodeProps) => {
  const inputType = data.input_type || 'text';
  const config = INPUT_TYPES[inputType] || INPUT_TYPES.text;
  const Icon = config.icon;
  const variable = data.variable_name || '';
  const prompt = data.prompt || '';

  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-background shadow-md min-w-[220px] max-w-[280px] ${
      selected ? 'border-primary ring-2 ring-primary/20' : 'border-cyan-500'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-cyan-500 !w-3 !h-3" />
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-cyan-500/10 shrink-0">
          <Icon className="h-5 w-5 text-cyan-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-cyan-600 uppercase">Input</span>
            <span className="text-xs bg-cyan-500/20 text-cyan-700 px-1.5 py-0.5 rounded">
              {config.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {prompt || 'Clique para configurar...'}
          </p>
          {variable && (
            <code className="text-[10px] text-cyan-600 bg-cyan-500/10 px-1 rounded mt-1 inline-block">
              {`{{${variable}}}`}
            </code>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500 !w-3 !h-3" />
    </div>
  );
});

InputNode.displayName = 'InputNode';
