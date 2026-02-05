import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Timer, 
  RefreshCw, 
  Clock, 
  Users, 
  AlertTriangle,
  History,
  ArrowRight,
  Loader2,
  Play,
  Settings2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pipeline {
  id: string;
  name: string;
  pool_enabled: boolean;
  pool_timeout_minutes: number;
  pool_max_redistributions: number;
}

interface LeadInPool {
  id: string;
  name: string;
  assigned_at: string;
  redistribution_count: number;
  assignee: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  stage: {
    name: string;
    color: string;
  } | null;
}

interface PoolHistoryItem {
  id: string;
  lead_id: string;
  reason: string;
  redistributed_at: string;
  from_user: {
    name: string;
    avatar_url: string | null;
  } | null;
  to_user: {
    name: string;
    avatar_url: string | null;
  } | null;
  lead: {
    name: string;
  } | null;
}

export function PoolTab() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const [runningChecker, setRunningChecker] = useState(false);

  // Fetch pipelines with pool settings
  const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery({
    queryKey: ['pipelines-pool-settings', organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipelines')
        .select('id, name, pool_enabled, pool_timeout_minutes, pool_max_redistributions')
        .eq('organization_id', organization!.id)
        .order('created_at');
      
      if (error) throw error;
      // Cast to any to handle new columns not yet in generated types
      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        pool_enabled: p.pool_enabled ?? false,
        pool_timeout_minutes: p.pool_timeout_minutes ?? 10,
        pool_max_redistributions: p.pool_max_redistributions ?? 3
      })) as Pipeline[];
    },
    enabled: !!organization?.id
  });

  // Fetch leads currently in pool (assigned but no first_touch)
  const { data: leadsInPool = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads-in-pool', organization?.id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('leads') as any)
        .select(`
          id, name, assigned_at, redistribution_count,
          assignee:users!leads_assigned_user_id_fkey(id, name, avatar_url),
          stage:stages!leads_stage_id_fkey(name, color)
        `)
        .eq('organization_id', organization!.id)
        .not('assigned_user_id', 'is', null)
        .not('assigned_at', 'is', null)
        .is('first_touch_at', null)
        .order('assigned_at', { ascending: true })
        .limit(50);
      
      if (error) throw error;
      return (data || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        assigned_at: l.assigned_at,
        redistribution_count: l.redistribution_count ?? 0,
        assignee: l.assignee,
        stage: l.stage
      })) as LeadInPool[];
    },
    enabled: !!organization?.id,
    refetchInterval: 30000 // Refresh every 30s
  });

  // Fetch pool history - table not in types yet, use any cast
  const { data: poolHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['pool-history', organization?.id],
    queryFn: async () => {
      const supabaseAny = supabase as any;
      const { data, error } = await supabaseAny
        .from('lead_pool_history')
        .select(`
          id, lead_id, reason, redistributed_at,
          from_user:from_user_id(name, avatar_url),
          to_user:to_user_id(name, avatar_url),
          lead:lead_id(name)
        `)
        .eq('organization_id', organization!.id)
        .order('redistributed_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as PoolHistoryItem[];
    },
    enabled: !!organization?.id
  });

  // Update pipeline pool settings
  const updatePipelineMutation = useMutation({
    mutationFn: async ({ pipelineId, updates }: { pipelineId: string; updates: Partial<Pipeline> }) => {
      const { error } = await (supabase
        .from('pipelines') as any)
        .update(updates)
        .eq('id', pipelineId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines-pool-settings'] });
      toast.success('Configuração atualizada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    }
  });

  // Run pool checker manually
  const handleRunChecker = async () => {
    setRunningChecker(true);
    try {
      const { data, error } = await supabase.functions.invoke('pool-checker');
      
      if (error) throw error;
      
      toast.success(`Verificação concluída! ${data.redistributed || 0} leads redistribuídos.`);
      queryClient.invalidateQueries({ queryKey: ['leads-in-pool'] });
      queryClient.invalidateQueries({ queryKey: ['pool-history'] });
    } catch (error: any) {
      toast.error('Erro ao executar verificação: ' + error.message);
    } finally {
      setRunningChecker(false);
    }
  };

  const activePoolPipelines = pipelines.filter(p => p.pool_enabled);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activePoolPipelines.length}</p>
                <p className="text-sm text-muted-foreground">Pipelines com bolsão ativo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Timer className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leadsInPool.length}</p>
                <p className="text-sm text-muted-foreground">Leads aguardando contato</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <RefreshCw className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{poolHistory.length}</p>
                <p className="text-sm text-muted-foreground">Redistribuições recentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configuração por Pipeline
            </CardTitle>
            <CardDescription>
              Configure o bolsão de redistribuição automática para cada pipeline
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRunChecker}
            disabled={runningChecker}
          >
            {runningChecker ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Executar Agora
          </Button>
        </CardHeader>
        <CardContent>
          {pipelinesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : pipelines.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum pipeline encontrado. Crie um pipeline primeiro.
            </p>
          ) : (
            <div className="space-y-4">
              {pipelines.map((pipeline) => (
                <div 
                  key={pipeline.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{pipeline.name}</h4>
                      {pipeline.pool_enabled && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                          Ativo
                        </Badge>
                      )}
                    </div>
                    <Switch
                      checked={pipeline.pool_enabled}
                      onCheckedChange={(checked) => {
                        updatePipelineMutation.mutate({
                          pipelineId: pipeline.id,
                          updates: { pool_enabled: checked }
                        });
                      }}
                    />
                  </div>
                  
                  {pipeline.pool_enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4" />
                          Tempo máximo para primeiro contato
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={120}
                            value={pipeline.pool_timeout_minutes}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 10;
                              updatePipelineMutation.mutate({
                                pipelineId: pipeline.id,
                                updates: { pool_timeout_minutes: Math.max(1, Math.min(120, value)) }
                              });
                            }}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">minutos</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Se não houver contato neste período, o lead será redistribuído
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <RefreshCw className="h-4 w-4" />
                          Quantas vezes tentar outro corretor
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={pipeline.pool_max_redistributions}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 3;
                              updatePipelineMutation.mutate({
                                pipelineId: pipeline.id,
                                updates: { pool_max_redistributions: Math.max(1, Math.min(10, value)) }
                              });
                            }}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">vezes</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Após isso, o lead permanece com o último corretor atribuído
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads in Pool */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Leads Aguardando Contato
            </CardTitle>
            <CardDescription>
              Leads que ainda não receberam primeiro contato
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : leadsInPool.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Todos os leads já foram contactados! 🎉
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {leadsInPool.map((lead) => (
                    <div 
                      key={lead.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={lead.assignee?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {lead.assignee?.name?.slice(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Atribuído {formatDistanceToNow(new Date(lead.assigned_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {lead.redistribution_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {lead.redistribution_count}x redistribuído
                          </Badge>
                        )}
                        {lead.stage && (
                          <Badge 
                            variant="secondary"
                            style={{ 
                              backgroundColor: `${lead.stage.color}20`,
                              color: lead.stage.color
                            }}
                          >
                            {lead.stage.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Pool History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Redistribuição
            </CardTitle>
            <CardDescription>
              Últimas redistribuições automáticas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : poolHistory.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma redistribuição realizada ainda
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {poolHistory.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarImage src={item.from_user?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {item.from_user?.name?.slice(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarImage src={item.to_user?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {item.to_user?.name?.slice(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {item.lead?.name || 'Lead removido'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.redistributed_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {item.reason === 'timeout' ? 'Tempo esgotado' : item.reason}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
