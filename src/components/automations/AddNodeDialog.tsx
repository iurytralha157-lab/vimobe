import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MessageSquare, 
  Mail, 
  ArrowRight, 
  Tag, 
  UserPlus, 
  Webhook,
  Clock,
  GitBranch,
  CheckSquare,
} from "lucide-react";

interface AddNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddNode: (type: string, nodeType: "action" | "condition" | "delay") => void;
}

const actionNodes = [
  { type: "send_whatsapp", label: "Enviar WhatsApp", icon: MessageSquare, color: "text-green-600" },
  { type: "send_email", label: "Enviar Email", icon: Mail, color: "text-blue-600" },
  { type: "move_lead", label: "Mover Lead", icon: ArrowRight, color: "text-purple-600" },
  { type: "add_tag", label: "Adicionar Tag", icon: Tag, color: "text-orange-600" },
  { type: "assign_user", label: "Atribuir Usuário", icon: UserPlus, color: "text-cyan-600" },
  { type: "create_task", label: "Criar Tarefa", icon: CheckSquare, color: "text-pink-600" },
  { type: "webhook", label: "Webhook", icon: Webhook, color: "text-gray-600" },
];

const controlNodes = [
  { type: "condition", label: "Condição", icon: GitBranch, color: "text-amber-600", nodeType: "condition" as const },
  { type: "delay", label: "Aguardar", icon: Clock, color: "text-purple-600", nodeType: "delay" as const },
];

export function AddNodeDialog({ open, onOpenChange, onAddNode }: AddNodeDialogProps) {
  const handleAddAction = (type: string) => {
    onAddNode(type, "action");
    onOpenChange(false);
  };

  const handleAddControl = (type: string, nodeType: "condition" | "delay") => {
    onAddNode(type, nodeType);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Nó</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Ações</h4>
            <div className="grid grid-cols-2 gap-2">
              {actionNodes.map((node) => (
                <Button
                  key={node.type}
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={() => handleAddAction(node.type)}
                >
                  <node.icon className={`h-4 w-4 mr-2 ${node.color}`} />
                  <span className="text-sm">{node.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Controle de Fluxo</h4>
            <div className="grid grid-cols-2 gap-2">
              {controlNodes.map((node) => (
                <Button
                  key={node.type}
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={() => handleAddControl(node.type, node.nodeType)}
                >
                  <node.icon className={`h-4 w-4 mr-2 ${node.color}`} />
                  <span className="text-sm">{node.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
