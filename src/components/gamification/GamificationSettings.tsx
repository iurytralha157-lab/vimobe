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
  ClipboardCheck
} from 'lucide-react';

const RULE_ICONS: Record<string, any> = {
  call_made: Phone,
  message_sent: MessageSquare,
  contact_made: UserCheck,
  visit_scheduled: Calendar,
  sale_closed: BadgeDollarSign,
  lead_created_manual: UserPlus,
  property_created: Home,
  proposal_sent: MessageSquare,
  contract_signed: FileCheck,
  visit_confirmed: ClipboardCheck,
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
      const { data, error } = await supabase
        .from('gamification_rules' as any)
        .select('*')
        .eq('organization_id', organization.id);
      
      if (error) throw error;
      
      // If some default rules are missing, we'll merge them for display
      const existingTypes = new Set(data?.map(r => r.action_type));
      const missingRules = DEFAULT_RULES.filter(dr => !existingTypes.has(dr.action_type));
      
      return [...(data || []), ...missingRules.map(mr => ({ ...mr, id: `temp-${mr.action_type}`, is_temp: true }))];
    },
    enabled: !!organization?.id,
  });

  const updateRuleMutation = useMutation({
    mutationFn: async (rule: any) => {
      const points = editingRules[rule.id] ?? rule.points;
      
      if (rule.is_temp) {
        const { error } = await supabase
          .from('gamification_rules' as any)
          .insert([{ 
            organization_id: organization?.id, 
            action_type: rule.action_type, 
            points, 
            is_active: true 
          }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gamification_rules' as any)
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
    mutationFn: async ({ id, is_active, action_type, points, is_temp }: any) => {
      if (is_temp) {
        const { error } = await supabase
          .from('gamification_rules' as any)
          .insert([{ 
            organization_id: organization?.id, 
            action_type, 
            points, 
            is_active 
          }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gamification_rules' as any)
          .update({ is_active, updated_at: new Date().toISOString() })
          .eq('id', id);
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
              {rules?.map((rule) => {
                const Icon = RULE_ICONS[rule.action_type] || Trophy;
                const isUpdating = updateRuleMutation.isPending && updateRuleMutation.variables?.id === rule.id;

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
                          onCheckedChange={(checked) => toggleRuleMutation.mutate({ ...rule, is_active: checked })}
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
      </div>
    </div>
  );
}