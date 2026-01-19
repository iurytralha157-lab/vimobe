import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  MoreHorizontal, 
  Shuffle,
  Building2,
  Tags,
  Facebook,
  Globe,
  Pencil,
  Trash2,
  Loader2,
  Users,
  X,
  GitBranch,
  Play,
  Filter,
  AlertCircle
} from 'lucide-react';
import { useRoundRobins, useUpdateRoundRobin, useDeleteRoundRobin, RoundRobin as RoundRobinType } from '@/hooks/use-round-robins';
import { useTeams } from '@/hooks/use-teams';
import { useOrganizationUsers } from '@/hooks/use-users';
import { useCreateRoundRobin } from '@/hooks/use-create-round-robin';
import { EditQueueDialog } from '@/components/round-robin/EditQueueDialog';
import { RulesManager } from '@/components/round-robin/RulesManager';
import { TestRuleDialog } from '@/components/round-robin/TestRuleDialog';
import { PipelineRoundRobinManager } from '@/components/round-robin/PipelineRoundRobinManager';

const matchTypeLabels: Record<string, string> = {
  campaign: 'Campanha',
  tag: 'Tag',
  property: 'Imóvel',
  source: 'Fonte',
  form: 'Formulário',
};

const matchTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  campaign: Facebook,
  tag: Tags,
  property: Building2,
  source: Globe,
  form: Facebook,
};

export function DistributionTab() {
  const { data: roundRobins = [], isLoading } = useRoundRobins();
  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const { data: users = [] } = useOrganizationUsers();
  const updateRoundRobin = useUpdateRoundRobin();
  const deleteRoundRobin = useDeleteRoundRobin();
  const createRoundRobin = useCreateRoundRobin();
  
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);
  const [editingQueue, setEditingQueue] = useState<RoundRobinType | null>(null);
  const [queueName, setQueueName] = useState('');
  const [queueStrategy, setQueueStrategy] = useState<'simple' | 'weighted'>('simple');
  const [queueRules, setQueueRules] = useState<{ type: string; value: string }[]>([]);
  const [queueMembers, setQueueMembers] = useState<{ userId?: string; teamId?: string; weight: number }[]>([]);
  const [newRuleType, setNewRuleType] = useState('source');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [rulesQueue, setRulesQueue] = useState<RoundRobinType | null>(null);

  const toggleActive = async (id: string, currentValue: boolean) => {
    await updateRoundRobin.mutateAsync({ id, is_active: !currentValue });
  };

  const handleDeleteRR = async (id: string) => {
    await deleteRoundRobin.mutateAsync(id);
  };

  const handleCreateQueue = async () => {
    if (!queueName.trim()) return;
    
    await createRoundRobin.mutateAsync({
      name: queueName,
      strategy: queueStrategy,
      rules: queueRules.map(r => ({ match_type: r.type, match_value: r.value })),
      members: queueMembers.map(m => ({ 
        user_id: m.userId, 
        team_id: m.teamId, 
        weight: m.weight 
      })),
    });
    
    setQueueDialogOpen(false);
    setQueueName('');
    setQueueRules([]);
    setQueueMembers([]);
  };

  const addRule = () => {
    if (!newRuleValue.trim()) return;
    setQueueRules([...queueRules, { type: newRuleType, value: newRuleValue }]);
    setNewRuleValue('');
  };

  const removeRule = (index: number) => {
    setQueueRules(queueRules.filter((_, i) => i !== index));
  };

  const addMember = (userId?: string, teamId?: string) => {
    if (!userId && !teamId) return;
    setQueueMembers([...queueMembers, { userId, teamId, weight: 1 }]);
  };

  const removeMember = (index: number) => {
    setQueueMembers(queueMembers.filter((_, i) => i !== index));
  };

  if (isLoading || teamsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Stats
  const activeQueues = roundRobins.filter(rr => rr.is_active).length;
  const totalLeadsDistributed = roundRobins.reduce((acc, rr) => acc + (rr.leads_distributed || 0), 0);
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
              <p className="text-2xl font-bold">{totalLeadsDistributed}</p>
              <p className="text-xs text-muted-foreground">Leads distribuídos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Queues Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Shuffle className="h-5 w-5" />
              Filas de Distribuição
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Configure filas para distribuir leads automaticamente
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setTestDialogOpen(true)} className="w-full sm:w-auto">
              <Play className="h-4 w-4 mr-2" />
              Testar Regras
            </Button>
            <Button onClick={() => setQueueDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nova Fila
            </Button>
          </div>
        </div>

        {roundRobins.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shuffle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-medium mb-2">Nenhuma fila configurada</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Crie filas para distribuir leads automaticamente entre sua equipe
              </p>
              <Button onClick={() => setQueueDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Fila
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {roundRobins.map((rr) => (
              <Card key={rr.id} className={rr.is_active ? '' : 'opacity-60'}>
                <CardHeader className="flex flex-col sm:flex-row items-start justify-between pb-3 gap-3">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Shuffle className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base truncate">{rr.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant={rr.strategy === 'weighted' ? 'default' : 'secondary'} className="text-xs">
                          {rr.strategy === 'weighted' ? 'Ponderada' : 'Simples'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {rr.leads_distributed || 0} leads
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <Switch 
                      checked={rr.is_active || false} 
                      onCheckedChange={() => toggleActive(rr.id, rr.is_active || false)}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingQueue(rr)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar Membros
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRulesQueue(rr)}>
                          <Filter className="h-4 w-4 mr-2" />
                          Configurar Regras
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteRR(rr.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Rules */}
                  <div>
                    <p className="text-sm font-medium mb-2">Critérios de entrada</p>
                    <div className="flex flex-wrap gap-1.5">
                      {rr.rules.length > 0 ? (
                        rr.rules.map((rule) => {
                          const Icon = matchTypeIcons[rule.match_type] || Globe;
                          return (
                            <Badge key={rule.id} variant="outline" className="gap-1 text-xs">
                              <Icon className="h-3 w-3" />
                              <span className="hidden sm:inline">{matchTypeLabels[rule.match_type] || rule.match_type}:</span> {rule.match_value}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-sm text-muted-foreground">Qualquer lead</span>
                      )}
                    </div>
                  </div>

                  {/* Members */}
                  <div>
                    <p className="text-sm font-medium mb-2">Participantes</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {rr.members.length > 0 ? (
                        <>
                          <div className="flex -space-x-2">
                            {rr.members.slice(0, 4).map((member) => (
                              <Avatar key={member.id} className="h-7 w-7 border-2 border-background">
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                  {member.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {rr.members.length > 4 && (
                              <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">+{rr.members.length - 4}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {rr.members.length} {rr.members.length === 1 ? 'membro' : 'membros'}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">Nenhum participante</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <Separator className="my-6" />

      {/* Pipeline Round-Robin Fallback Section */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <GitBranch className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Distribuição Padrão por Pipeline</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Configure qual fila será usada como fallback quando nenhuma regra específica corresponder
            </p>
          </div>
        </div>
        <PipelineRoundRobinManager />
      </div>

      {/* Test Rules Dialog */}
      <TestRuleDialog 
        open={testDialogOpen} 
        onOpenChange={setTestDialogOpen} 
      />

      {/* Rules Manager Dialog */}
      {rulesQueue && (
        <Dialog open={!!rulesQueue} onOpenChange={(open) => !open && setRulesQueue(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Regras de "{rulesQueue.name}"</DialogTitle>
          </DialogHeader>
          <RulesManager roundRobinId={rulesQueue.id} roundRobinName={rulesQueue.name} />
        </DialogContent>
        </Dialog>
      )}

      {/* Create Queue Dialog */}
      <Dialog open={queueDialogOpen} onOpenChange={setQueueDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Fila de Distribuição</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 md:space-y-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Fila</Label>
                <Input 
                  placeholder="Ex: Leads Facebook"
                  value={queueName}
                  onChange={(e) => setQueueName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Estratégia</Label>
                <Select value={queueStrategy} onValueChange={(v) => setQueueStrategy(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simples (Round Robin)</SelectItem>
                    <SelectItem value="weighted">Ponderada (Por Peso)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rules */}
            <div className="space-y-3">
              <Label>Regras de Entrada (opcional)</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={newRuleType} onValueChange={setNewRuleType}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="source">Fonte</SelectItem>
                    <SelectItem value="campaign">Campanha</SelectItem>
                    <SelectItem value="tag">Tag</SelectItem>
                    <SelectItem value="property">Imóvel</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2 flex-1">
                  <Input 
                    placeholder="Valor"
                    value={newRuleValue}
                    onChange={(e) => setNewRuleValue(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addRule}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {queueRules.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {queueRules.map((rule, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {matchTypeLabels[rule.type]}: {rule.value}
                      <button onClick={() => removeRule(i)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Members */}
            <div className="space-y-3">
              <Label>Participantes</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select onValueChange={(v) => addMember(v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Adicionar usuário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => !queueMembers.some(m => m.userId === u.id)).map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={(v) => addMember(undefined, v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Adicionar equipe..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.filter(t => !queueMembers.some(m => m.teamId === t.id)).map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {team.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {queueMembers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {queueMembers.map((member, i) => {
                    const user = users.find(u => u.id === member.userId);
                    const team = teams.find(t => t.id === member.teamId);
                    return (
                      <Badge key={i} variant="outline" className="gap-2 py-1.5">
                        {team ? (
                          <>
                            <Users className="h-3 w-3" />
                            {team.name}
                          </>
                        ) : (
                          user?.name
                        )}
                        {queueStrategy === 'weighted' && (
                          <Input
                            type="number"
                            className="w-12 h-5 text-xs p-1"
                            value={member.weight}
                            onChange={(e) => {
                              const newMembers = [...queueMembers];
                              newMembers[i].weight = parseInt(e.target.value) || 1;
                              setQueueMembers(newMembers);
                            }}
                          />
                        )}
                        <button onClick={() => removeMember(i)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setQueueDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateQueue} disabled={createRoundRobin.isPending || !queueName.trim()}>
                {createRoundRobin.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Fila
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Queue Dialog */}
      <EditQueueDialog 
        queue={editingQueue} 
        open={!!editingQueue}
        onOpenChange={(open) => !open && setEditingQueue(null)}
      />
    </div>
  );
}
