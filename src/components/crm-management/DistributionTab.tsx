import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Tags,
  Facebook,
  Globe,
  Pencil,
  Trash2,
  Loader2,
  Users,
  X,
  Play,
  Filter,
  Zap
} from 'lucide-react';
import { useRoundRobins, useUpdateRoundRobin, useDeleteRoundRobin, RoundRobin as RoundRobinType } from '@/hooks/use-round-robins';
import { useTeams } from '@/hooks/use-teams';
import { useOrganizationUsers } from '@/hooks/use-users';
import { useCreateRoundRobin } from '@/hooks/use-create-round-robin';
import { EditQueueDialog } from '@/components/round-robin/EditQueueDialog';
import { RulesManager } from '@/components/round-robin/RulesManager';
import { TestRuleDialog } from '@/components/round-robin/TestRuleDialog';

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Distribuição de Leads</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {roundRobins.length} {roundRobins.length === 1 ? 'fila' : 'filas'} · {activeQueues} {activeQueues === 1 ? 'ativa' : 'ativas'} · {totalLeadsDistributed} leads distribuídos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTestDialogOpen(true)} className="gap-2">
            <Play className="h-4 w-4" />
            Testar
          </Button>
          <Button onClick={() => setQueueDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Fila
          </Button>
        </div>
      </div>

      {/* Queues Grid */}
      {roundRobins.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shuffle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Configure sua distribuição</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Crie filas para distribuir leads automaticamente entre sua equipe
            </p>
            <Button onClick={() => setQueueDialogOpen(true)} size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Fila
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {roundRobins.map((rr) => (
            <Card 
              key={rr.id} 
              className={`overflow-hidden transition-all duration-300 ${
                rr.is_active 
                  ? 'hover:shadow-lg border-primary/20' 
                  : 'opacity-60 bg-muted/20'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      rr.is_active ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      <Shuffle className={`h-5 w-5 ${rr.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{rr.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={rr.strategy === 'weighted' ? 'default' : 'secondary'} 
                          className="text-xs"
                        >
                          {rr.strategy === 'weighted' ? 'Ponderada' : 'Round Robin'}
                        </Badge>
                        {rr.is_active && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <Zap className="h-3 w-3" />
                            <span>Ativa</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Rules */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Critérios</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rr.rules.length > 0 ? (
                      rr.rules.map((rule) => {
                        const Icon = matchTypeIcons[rule.match_type] || Globe;
                        return (
                          <Badge key={rule.id} variant="outline" className="gap-1 text-xs">
                            <Icon className="h-3 w-3" />
                            {rule.match_value}
                          </Badge>
                        );
                      })
                    ) : (
                      <span className="text-xs text-muted-foreground">Qualquer lead</span>
                    )}
                  </div>
                </div>

                {/* Members */}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {rr.members.length > 0 ? (
                        <>
                          <div className="flex -space-x-2">
                            {rr.members.slice(0, 5).map((member) => (
                              <Avatar key={member.id} className="h-7 w-7 border-2 border-background">
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                  {member.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {rr.members.length > 5 && (
                              <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">+{rr.members.length - 5}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {rr.members.length} {rr.members.length === 1 ? 'membro' : 'membros'}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem participantes</span>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {rr.leads_distributed || 0} leads
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Test Rules Dialog */}
      <TestRuleDialog 
        open={testDialogOpen} 
        onOpenChange={setTestDialogOpen} 
      />

      {/* Edit Queue Dialog */}
      {editingQueue && (
        <EditQueueDialog
          open={!!editingQueue}
          onOpenChange={(open) => !open && setEditingQueue(null)}
          queue={editingQueue}
        />
      )}

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
          <div className="space-y-6 py-4">
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
                    <SelectItem value="simple">Round Robin</SelectItem>
                    <SelectItem value="weighted">Ponderada</SelectItem>
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
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Valor..."
                  value={newRuleValue}
                  onChange={(e) => setNewRuleValue(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="secondary" onClick={addRule}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {queueRules.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {queueRules.map((rule, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                      {matchTypeLabels[rule.type]}: {rule.value}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-4 w-4 hover:bg-transparent"
                        onClick={() => removeRule(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Members */}
            <div className="space-y-3">
              <Label>Participantes</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select onValueChange={(v) => addMember(v, undefined)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Adicionar corretor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter(u => !queueMembers.some(m => m.userId === u.id))
                      .map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {user.name}
                          </div>
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              {queueMembers.length > 0 && (
                <div className="space-y-2">
                  {queueMembers.map((member, idx) => {
                    const user = users.find(u => u.id === member.userId);
                    const team = teams.find(t => t.id === member.teamId);
                    return (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || team?.name?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {user?.name || team?.name}
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeMember(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setQueueDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateQueue}
                disabled={!queueName.trim() || createRoundRobin.isPending}
              >
                {createRoundRobin.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Fila
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
