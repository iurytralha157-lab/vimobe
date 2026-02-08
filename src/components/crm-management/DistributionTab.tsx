import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Pencil,
  Trash2,
  Loader2,
  Play,
  Filter,
  Zap,
  Target,
  UsersRound
} from 'lucide-react';
import { useRoundRobins, useUpdateRoundRobin, useDeleteRoundRobin, RoundRobin as RoundRobinType } from '@/hooks/use-round-robins';
import { useTeams } from '@/hooks/use-teams';
import { useOrganizationUsers } from '@/hooks/use-users';
import { useTags } from '@/hooks/use-tags';
import { useProperties } from '@/hooks/use-properties';
import { useServicePlans } from '@/hooks/use-service-plans';
import { useMetaIntegrations } from '@/hooks/use-meta-integration';
import { useMetaFormConfigs } from '@/hooks/use-meta-forms';
import { useWebhooks } from '@/hooks/use-webhooks';
import { useWhatsAppSessions } from '@/hooks/use-whatsapp-sessions';
import { useCreateQueueAdvanced, useUpdateQueueAdvanced } from '@/hooks/use-create-queue-advanced';
import { DistributionQueueEditor } from '@/components/round-robin/DistributionQueueEditor';
import { RulesManager } from '@/components/round-robin/RulesManager';
import { TestRuleDialog } from '@/components/round-robin/TestRuleDialog';

const matchTypeLabels: Record<string, string> = {
  campaign: 'Campanha',
  campaign_contains: 'Campanha',
  tag: 'Tag',
  property: 'Imóvel',
  source: 'Fonte',
  form: 'Formulário',
  meta_form: 'Form Meta',
  webhook: 'Webhook',
  whatsapp_session: 'WhatsApp',
  interest_property: 'Imóvel',
  interest_plan: 'Plano',
  city: 'Cidade',
};

export function DistributionTab() {
  const { data: roundRobins = [], isLoading } = useRoundRobins();
  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const { data: users = [] } = useOrganizationUsers();
  const { data: tags = [] } = useTags();
  const { data: properties = [] } = useProperties();
  const { data: plans = [] } = useServicePlans();
  const { data: webhooks = [] } = useWebhooks();
  const { data: whatsappSessions = [] } = useWhatsAppSessions();
  const { data: metaIntegrations = [] } = useMetaIntegrations();
  const activeMetaIntegration = metaIntegrations.find(i => i.is_connected);
  const { data: metaFormConfigs = [] } = useMetaFormConfigs(activeMetaIntegration?.id);
  const updateRoundRobin = useUpdateRoundRobin();
  const deleteRoundRobin = useDeleteRoundRobin();
  const createQueue = useCreateQueueAdvanced();
  const updateQueue = useUpdateQueueAdvanced();
  
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQueue, setEditingQueue] = useState<RoundRobinType | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [rulesQueue, setRulesQueue] = useState<RoundRobinType | null>(null);

  const toggleActive = async (id: string, currentValue: boolean) => {
    await updateRoundRobin.mutateAsync({ id, is_active: !currentValue });
  };

  const handleDeleteRR = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta fila?')) return;
    await deleteRoundRobin.mutateAsync(id);
  };

  const handleSaveQueue = async (data: any) => {
    if (editingQueue) {
      await updateQueue.mutateAsync({ id: editingQueue.id, ...data });
    } else {
      await createQueue.mutateAsync(data);
    }
    setEditingQueue(null);
  };

  const openEditor = (queue?: RoundRobinType) => {
    setEditingQueue(queue || null);
    setEditorOpen(true);
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
          <Button onClick={() => openEditor()} className="gap-2">
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
            <Button onClick={() => openEditor()} size="lg" className="gap-2">
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
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                        {rr.target_pipeline && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Target className="h-3 w-3" />
                            {rr.target_pipeline.name}
                          </Badge>
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
                        <DropdownMenuItem onClick={() => openEditor(rr)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar Fila
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRulesQueue(rr)}>
                          <Filter className="h-4 w-4 mr-2" />
                          Ver Regras
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
                      rr.rules.slice(0, 3).map((rule) => {
                        // Se for tag, busca o nome e cor da tag
                        if (rule.match_type === 'tag') {
                          const tag = tags.find(t => t.id === rule.match_value);
                          if (tag) {
                            return (
                              <Badge 
                                key={rule.id} 
                                variant="outline" 
                                className="gap-1 text-xs"
                                style={{ borderColor: tag.color, color: tag.color }}
                              >
                                Tag: {tag.name}
                              </Badge>
                            );
                          }
                        }
                        
                        // Se for imóvel, busca o código do imóvel
                        if (rule.match_type === 'interest_property' || rule.match_type === 'property') {
                          const property = properties.find(p => p.id === rule.match_value);
                          return (
                            <Badge key={rule.id} variant="outline" className="gap-1 text-xs">
                              Imóvel: {property?.code || property?.title || rule.match_value?.substring(0, 10)}
                            </Badge>
                          );
                        }
                        
                        // Se for plano, busca o nome do plano
                        if (rule.match_type === 'interest_plan') {
                          const plan = plans.find(p => p.id === rule.match_value);
                          return (
                            <Badge key={rule.id} variant="outline" className="gap-1 text-xs">
                              Plano: {plan?.name || rule.match_value?.substring(0, 10)}
                            </Badge>
                          );
                        }
                        
                        // Se for formulário Meta, busca o nome do formulário
                        if (rule.match_type === 'meta_form') {
                          const metaForm = metaFormConfigs.find(f => f.form_id === rule.match_value);
                          return (
                            <Badge key={rule.id} variant="outline" className="gap-1 text-xs">
                              📝 {metaForm?.form_name || `Form ${rule.match_value?.substring(0, 8)}...`}
                            </Badge>
                          );
                        }
                        
                        // Se for webhook, busca o nome do webhook
                        if (rule.match_type === 'webhook') {
                          const webhook = webhooks.find(w => w.id === rule.match_value);
                          return (
                            <Badge key={rule.id} variant="outline" className="gap-1 text-xs">
                              🔗 {webhook?.name || `Webhook ${rule.match_value?.substring(0, 8)}...`}
                            </Badge>
                          );
                        }
                        
                        // Se for sessão WhatsApp, busca o nome da sessão
                        if (rule.match_type === 'whatsapp_session') {
                          const session = whatsappSessions.find(s => s.id === rule.match_value);
                          return (
                            <Badge key={rule.id} variant="outline" className="gap-1 text-xs">
                              💬 {session?.display_name || session?.phone_number || session?.instance_name || 'WhatsApp'}
                            </Badge>
                          );
                        }
                        
                        return (
                          <Badge key={rule.id} variant="outline" className="gap-1 text-xs">
                            {matchTypeLabels[rule.match_type] || rule.match_type}: {rule.match_value?.substring(0, 20) || 'Configurado'}
                          </Badge>
                        );
                      })
                    ) : (
                      <span className="text-xs text-muted-foreground">Qualquer lead (fila genérica)</span>
                    )}
                    {rr.rules.length > 3 && (
                      <Badge variant="secondary" className="text-xs">+{rr.rules.length - 3}</Badge>
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
                            {rr.members.slice(0, 5).map((member, index) => {
                              const user = member.user;
                              const team = member.team_id ? teams.find(t => t.id === member.team_id) : null;
                              const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 
                                              team?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
                              
                              // Cores para avatares sem foto
                              const colors = [
                                'bg-primary text-primary-foreground',
                                'bg-orange-500 text-white',
                                'bg-emerald-500 text-white',
                                'bg-violet-500 text-white',
                                'bg-pink-500 text-white',
                              ];
                              const colorClass = colors[index % colors.length];
                              
                              return (
                                <Avatar key={member.id} className="h-7 w-7 border-2 border-background">
                                  {user?.avatar_url && (
                                    <AvatarImage src={user.avatar_url} alt={user.name || ''} />
                                  )}
                                  <AvatarFallback className={`${colorClass} text-xs font-medium`}>
                                    {member.team_id ? (
                                      <UsersRound className="h-3.5 w-3.5" />
                                    ) : (
                                      initials
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                              );
                            })}
                            {rr.members.length > 5 && (
                              <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">+{rr.members.length - 5}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {rr.members.length} {rr.members.length === 1 ? 'participante' : 'participantes'}
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

      {/* Distribution Queue Editor */}
      <DistributionQueueEditor
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditingQueue(null);
        }}
        queue={editingQueue}
        onSave={handleSaveQueue}
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
    </div>
  );
}
