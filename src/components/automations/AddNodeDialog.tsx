import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Mail, 
  GitBranch, 
  Clock, 
  Tag, 
  XCircle,
  ArrowRight,
  UserPlus,
  Globe,
  CheckSquare,
} from 'lucide-react';

interface AddNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (type: string, actionType?: string) => void;
}

const actionNodes = [
  {
    type: 'action',
    actionType: 'send_whatsapp',
    icon: MessageSquare,
    label: 'Enviar WhatsApp',
    description: 'Envia uma mensagem via WhatsApp',
  },
  {
    type: 'action',
    actionType: 'send_email',
    icon: Mail,
    label: 'Enviar Email',
    description: 'Envia um email para o lead',
  },
  {
    type: 'action',
    actionType: 'move_lead',
    icon: ArrowRight,
    label: 'Mover Lead',
    description: 'Move o lead para outra etapa',
  },
  {
    type: 'action',
    actionType: 'add_tag',
    icon: Tag,
    label: 'Adicionar Tag',
    description: 'Adiciona uma tag ao lead',
  },
  {
    type: 'action',
    actionType: 'remove_tag',
    icon: XCircle,
    label: 'Remover Tag',
    description: 'Remove uma tag do lead',
  },
  {
    type: 'action',
    actionType: 'create_task',
    icon: CheckSquare,
    label: 'Criar Tarefa',
    description: 'Cria uma tarefa para o lead',
  },
  {
    type: 'action',
    actionType: 'assign_user',
    icon: UserPlus,
    label: 'Atribuir Responsável',
    description: 'Atribui o lead a um usuário',
  },
  {
    type: 'action',
    actionType: 'webhook',
    icon: Globe,
    label: 'Webhook',
    description: 'Chama um webhook externo',
  },
];

const flowNodes = [
  {
    type: 'condition',
    icon: GitBranch,
    label: 'Condição',
    description: 'Divide o fluxo baseado em uma condição',
  },
  {
    type: 'delay',
    icon: Clock,
    label: 'Aguardar',
    description: 'Aguarda um tempo antes de continuar',
  },
];

export function AddNodeDialog({ open, onOpenChange, onAdd }: AddNodeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Nó</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Actions */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Ações</h3>
            <div className="grid grid-cols-2 gap-2">
              {actionNodes.map((node) => (
                <Button
                  key={node.actionType}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start text-left gap-1"
                  onClick={() => onAdd(node.type, node.actionType)}
                >
                  <div className="flex items-center gap-2">
                    <node.icon className="h-4 w-4 text-primary" />
                    <span className="font-medium">{node.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {node.description}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Flow Control */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Controle de Fluxo</h3>
            <div className="grid grid-cols-2 gap-2">
              {flowNodes.map((node) => (
                <Button
                  key={node.type}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start text-left gap-1"
                  onClick={() => onAdd(node.type)}
                >
                  <div className="flex items-center gap-2">
                    <node.icon className="h-4 w-4 text-primary" />
                    <span className="font-medium">{node.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {node.description}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
