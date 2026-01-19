import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Phone, MessageCircle, Mail, FileText, GripVertical, Trash2, Loader2, Lock } from "lucide-react";
import { useCadenceTemplates, useCreateCadenceTask, useDeleteCadenceTask } from "@/hooks/use-cadences";
import { useCanEditCadences } from "@/hooks/use-can-edit-cadences";

const taskTypeIcons = {
  call: Phone,
  message: MessageCircle,
  email: Mail,
  note: FileText,
};

const taskTypeLabels = {
  call: "Ligação",
  message: "Mensagem",
  email: "Email",
  note: "Observação",
};

export function CadencesTab() {
  const { data: templates = [], isLoading } = useCadenceTemplates();
  const createTask = useCreateCadenceTask();
  const deleteTask = useDeleteCadenceTask();
  const canEdit = useCanEditCadences();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    dayOffset: 0,
    title: "",
    description: "",
  });

  const handleAddTask = async () => {
    if (!selectedTemplateId || !newTask.title) return;

    await createTask.mutateAsync({
      cadence_template_id: selectedTemplateId,
      day_offset: newTask.dayOffset,
      type: "note",
      title: newTask.title,
    });

    setTaskDialogOpen(false);
    setNewTask({ dayOffset: 0, title: "", description: "" });
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask.mutateAsync(taskId);
  };

  const openAddTaskDialog = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setTaskDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Configure as tarefas automáticas para cada estágio do pipeline
        </p>
        {!canEdit && (
          <Badge variant="secondary" className="gap-1">
            <Lock className="h-3 w-3" />
            Somente visualização
          </Badge>
        )}
      </div>

      {/* Empty State */}
      {templates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="font-medium mb-2">Nenhum template de cadência</h3>
            <p className="text-muted-foreground text-sm px-4">
              Os templates de cadência são criados automaticamente baseados nos estágios do pipeline
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-medium">{template.name}</CardTitle>
              {canEdit && (
                <Button variant="ghost" size="sm" className="h-8" onClick={() => openAddTaskDialog(template.id)}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {template.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa configurada</p>
              ) : (
                <div className="space-y-2">
                  {template.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 group"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                      <Badge variant="outline" className="shrink-0 font-mono text-xs">
                        D{task.day_offset >= 0 ? "+" : ""}
                        {task.day_offset}
                      </Badge>
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                        )}
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Dia (offset)</Label>
              <Input
                type="number"
                value={newTask.dayOffset}
                onChange={(e) => setNewTask({ ...newTask, dayOffset: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">Dias após entrada no estágio. Ex: 0 = mesmo dia, 1 = próximo dia</p>
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Ex: Fazer ligação de apresentação"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Instruções adicionais..."
              />
            </div>
            <Button onClick={handleAddTask} className="w-full" disabled={!newTask.title || createTask.isPending}>
              {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Adicionar Tarefa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
