import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Shuffle, Pencil, Trash2, Loader2, Users, Play, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Placeholder types
interface RoundRobin {
  id: string;
  name: string;
  is_active: boolean;
  members: { id: string; user_id: string; weight: number }[];
  rules: { id: string; match_type: string; match_value: string }[];
}

export function DistributionTab() {
  const [roundRobins, setRoundRobins] = useState<RoundRobin[]>([]);
  const [isLoading] = useState(false);
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);
  const [queueName, setQueueName] = useState("");

  const handleCreateQueue = async () => {
    if (!queueName.trim()) return;

    const newQueue: RoundRobin = {
      id: crypto.randomUUID(),
      name: queueName,
      is_active: true,
      members: [],
      rules: [],
    };

    setRoundRobins([...roundRobins, newQueue]);
    setQueueDialogOpen(false);
    setQueueName("");
  };

  const toggleActive = (id: string) => {
    setRoundRobins(roundRobins.map((rr) => (rr.id === id ? { ...rr, is_active: !rr.is_active } : rr)));
  };

  const handleDeleteRR = (id: string) => {
    setRoundRobins(roundRobins.filter((rr) => rr.id !== id));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeQueues = roundRobins.filter((rr) => rr.is_active).length;
  const totalMembers = roundRobins.reduce((acc, rr) => acc + rr.members.length, 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shuffle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{roundRobins.length}</p>
              <p className="text-xs text-muted-foreground">Filas criadas</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Play className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeQueues}</p>
              <p className="text-xs text-muted-foreground">Filas ativas</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalMembers}</p>
              <p className="text-xs text-muted-foreground">Participantes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Filter className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Leads distribuídos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Shuffle className="h-5 w-5" />
            Filas de Distribuição
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Configure a distribuição automática de leads</p>
        </div>
        <Button onClick={() => setQueueDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nova Fila
        </Button>
      </div>

      {/* Queues List */}
      {roundRobins.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shuffle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-medium mb-2">Nenhuma fila configurada</h3>
            <p className="text-muted-foreground mb-4 text-sm">Crie filas para distribuir leads automaticamente</p>
            <Button onClick={() => setQueueDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Fila
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roundRobins.map((queue) => (
            <Card key={queue.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shuffle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{queue.name}</h4>
                      <p className="text-xs text-muted-foreground">{queue.members.length} participantes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={queue.is_active} onCheckedChange={() => toggleActive(queue.id)} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteRR(queue.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Rules Preview */}
                {queue.rules.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {queue.rules.slice(0, 3).map((rule) => (
                      <Badge key={rule.id} variant="outline" className="text-xs">
                        {rule.match_type}: {rule.match_value}
                      </Badge>
                    ))}
                    {queue.rules.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{queue.rules.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <Badge variant={queue.is_active ? "default" : "secondary"} className="mt-3">
                  {queue.is_active ? "Ativa" : "Inativa"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Queue Dialog */}
      <Dialog open={queueDialogOpen} onOpenChange={setQueueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Fila de Distribuição</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="queueName">Nome da fila</Label>
              <Input
                id="queueName"
                value={queueName}
                onChange={(e) => setQueueName(e.target.value)}
                placeholder="Ex: Vendas - Campanha Facebook"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQueueDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateQueue} disabled={!queueName.trim()}>
              Criar Fila
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
