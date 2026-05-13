import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Trophy, 
  Save, 
  Phone, 
  MessageSquare, 
  UserCheck, 
  Calendar, 
  BadgeDollarSign,
  Loader2,
  UserPlus,
  Home,
  FileCheck,
  ClipboardCheck,
  Presentation,
  FileText,
  RefreshCcw,
  ShieldAlert
} from 'lucide-react';

const RULE_ICONS: Record<string, any> = {
  call_made: Phone,
  message_sent: MessageSquare,
  contact_made: UserCheck,
  visit_scheduled: Calendar,
  sale_closed: BadgeDollarSign,
  lead_created_manual: UserPlus,
  property_created: Home,
  proposal_sent: FileText,
  contract_signed: FileCheck,
  visit_confirmed: ClipboardCheck,
  meeting_held: Presentation,
};

const RULE_LABELS: Record<string, string> = {
  call_made: 'Ligação Realizada',
  message_sent: 'Mensagem Enviada',
  contact_made: 'Contato Efetivo',
  visit_scheduled: 'Visita Agendada',
  sale_closed: 'Venda Concluída',
  lead_created_manual: 'Cadastro Manual de Lead',
  property_created: 'Captação de Imóvel',
  proposal_sent: 'Proposta Enviada',
  contract_signed: 'Contrato Assinado',
  visit_confirmed: 'Visita Confirmada',
  meeting_held: 'Reunião Realizada',
};

const DEFAULT_RULES = Object.keys(RULE_LABELS).map(type => ({
  action_type: type,
  points: 10,
  is_active: true
}));

export function GamificationSettings() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const [editingRules, setEditingRules] = useState<Record<string, number>>({});

  const { data: rules, isLoading } = useQuery({
    queryKey: ['gamification-rules-admin', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await (supabase as any)
        .from('gamification_rules')
        .select('*')
        .eq('organization_id', organization.id);
      
      if (error) throw error;
      
      // If some default rules are missing, we'll merge them for display
      const existingTypes = new Set(data?.map((r: any) => r.action_type));
      const missingRules = DEFAULT_RULES.filter(dr => !existingTypes.has(dr.action_type));
      
      return [...(data || []), ...missingRules.map(mr => ({ ...mr, id: `temp-${mr.action_type}`, is_temp: true }))];
    },
    enabled: !!organization?.id,
  });

  const updateRuleMutation = useMutation({
    mutationFn: async (rule: any) => {
      const points = editingRules[rule.id] ?? rule.points;
      
      if (rule.is_temp) {
        const { error } = await (supabase as any)
          .from('gamification_rules')
          .insert([{ 
            organization_id: organization?.id, 
            action_type: rule.action_type, 
            points, 
            is_active: true 
          }]);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('gamification_rules')
          .update({ points, is_active: rule.is_active, updated_at: new Date().toISOString() })
          .eq('id', rule.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-rules-admin'] });
      toast.success('Regra atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar regra: ' + error.message);
    }
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async (rule: any) => {
      if (rule.is_temp) {
        const { error } = await (supabase as any)
          .from('gamification_rules')
          .insert([{ 
            organization_id: organization?.id, 
            action_type: rule.action_type, 
            points: rule.points, 
            is_active: !rule.is_active 
          }]);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('gamification_rules')
          .update({ is_active: !rule.is_active, updated_at: new Date().toISOString() })
          .eq('id', rule.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-rules-admin'] });
    }
  });

  const handlePointChange = (ruleId: string, value: string) => {
    setEditingRules(prev => ({
      ...prev,
      [ruleId]: parseInt(value) || 0
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleReprocessLeads = async () => {
    if (!organization?.id) return;
    
    const loadingToast = toast.loading('Reprocessando leads ganhos...');
    
    try {
      // We'll call the function via RPC. 
      // If it doesn't exist, we'll fall back to manual processing in JS
      const { data, error } = await (supabase as any).rpc('reprocess_won_leads_gamification', {
        p_organization_id: organization.id
      });
      
      if (error) {
        console.error('RPC Error:', error);
        // Fallback: manual processing if the function hasn't been created yet
        await manualReprocessLeads();
      } else {
        const result = Array.isArray(data) ? data[0] : data;
        toast.success(`Sucesso! ${result.processed_count || 0} leads reprocessados, somando ${result.total_points_added || 0} pontos.`, {
          id: loadingToast
        });
        queryClient.invalidateQueries({ queryKey: ['gamification-ranking'] });
      }
    } catch (err: any) {
      toast.error('Erro ao reprocessar: ' + err.message, { id: loadingToast });
    }
  };

  const manualReprocessLeads = async () => {
    // 1. Fetch won leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, assigned_user_id, organization_id, won_at, name')
      .in('deal_status', ['won', 'GANHO', 'Venda concluída'])
      .eq('organization_id', organization.id);
      
    if (leadsError) throw leadsError;
    if (!leads || leads.length === 0) {
      toast.info('Nenhum lead ganho encontrado para reprocessar.');
      return;
    }

    // 2. Fetch existing logs to avoid duplicates
    const { data: existingLogs, error: logsError } = await supabase
      .from('gamification_activity_logs')
      .select('reference_id')
      .eq('organization_id', organization.id)
      .eq('action_type', 'sale_closed');
      
    if (logsError) throw logsError;
    
    const processedIds = new Set(existingLogs?.map(l => l.reference_id));
    const leadsToProcess = leads.filter(l => l.assigned_user_id && !processedIds.has(l.id));
    
    if (leadsToProcess.length === 0) {
      toast.info('Todos os leads ganhos já possuem pontuação registrada.');
      return;
    }

    // 3. Get points rule
    const { data: rule } = await supabase
      .from('gamification_rules')
      .select('points')
      .eq('organization_id', organization.id)
      .eq('action_type', 'sale_closed')
      .eq('is_active', true)
      .single();
      
    const pointsPerLead = rule?.points || 500;
    let count = 0;
    let totalPoints = 0;

    // 4. Process each lead
    for (const lead of leadsToProcess) {
      const { error: insertError } = await supabase
        .from('gamification_activity_logs')
        .insert([{
          user_id: lead.assigned_user_id,
          organization_id: organization.id,
          action_type: 'sale_closed',
          points_earned: pointsPerLead,
          reference_id: lead.id,
          metadata: { lead_name: lead.name, reprocessed: true, won_at: lead.won_at }
        }]);
        
      if (!insertError) {
        // Update stats
        const { error: statsError } = await supabase
          .from('user_gamification_stats')
          .select('total_points')
          .eq('user_id', lead.assigned_user_id)
          .single();

        if (statsError && statsError.code === 'PGRST116') {
          // Record doesn't exist, create it
          await supabase.from('user_gamification_stats').insert([{
            user_id: lead.assigned_user_id,
            organization_id: organization.id,
            total_points: pointsPerLead,
            updated_at: new Date().toISOString()
          }]);
        } else {
          // Record exists, update it
          await supabase.from('user_gamification_stats')
            .update({ 
              total_points: (statsError ? 0 : (error as any)?.total_points || 0) + pointsPerLead,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', lead.assigned_user_id);
        }
        
        count++;
        totalPoints += pointsPerLead;
      }
    }

    toast.success(`Reprocessamento manual concluído: ${count} leads processados, ${totalPoints} pontos somados.`);
    queryClient.invalidateQueries({ queryKey: ['gamification-ranking'] });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <CardTitle>Regras de Pontuação</CardTitle>
            </div>
            <CardDescription>
              Defina quantos pontos cada ação vale para os corretores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {(rules as any[])?.map((rule) => {
                const Icon = RULE_ICONS[rule.action_type] || Trophy;
                const isUpdating = updateRuleMutation.isPending && (updateRuleMutation.variables as any)?.id === rule.id;

                return (
                  <div key={rule.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-card gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{RULE_LABELS[rule.action_type] || rule.action_type}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-20 h-8 text-sm"
                          defaultValue={rule.points}
                          onChange={(e) => handlePointChange(rule.id, e.target.value)}
                        />
                        <span className="text-xs font-medium text-muted-foreground">pts</span>
                      </div>

                      <div className="flex items-center gap-2 border-l pl-4 h-8">
                        <Switch 
                          checked={rule.is_active} 
                          onCheckedChange={() => toggleRuleMutation.mutate(rule)}
                          disabled={isUpdating}
                        />
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => updateRuleMutation.mutate(rule)}
                          disabled={isUpdating || (editingRules[rule.id] === undefined && !rule.is_temp)}
                        >
                          {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 flex gap-3">
            <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-semibold text-xs">Dica de Gestão:</p>
              <p className="text-xs">Aumente os pontos das ações que você quer incentivar no mês para guiar o comportamento da equipe.</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Configuração Rápida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Pontos salvos aqui são aplicados retroativamente se o sistema recalcular os rankings.
            </p>
            <div className="p-3 bg-muted rounded-lg text-xs font-medium">
              Ações como "Venda Concluída" devem ter pontuação alta para refletir sua importância.
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 dark:border-orange-900/50">
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-sm">Manutenção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Se houver divergência no ranking, você pode reprocessar leads antigos.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full gap-2 text-xs"
              onClick={handleReprocessLeads}
            >
              <RefreshCcw className="h-3 w-3" />
              Reprocessar Ganhos
            </Button>
            <p className="text-[10px] text-muted-foreground italic">
              * Isso apenas adicionará pontos para leads ganhos que ainda não possuem pontuação registrada.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}