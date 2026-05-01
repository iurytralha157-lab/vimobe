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
  Home
} from 'lucide-react';

const RULE_ICONS: Record<string, any> = {
  call_made: Phone,
  message_sent: MessageSquare,
  contact_made: UserCheck,
  visit_scheduled: Calendar,
  sale_closed: BadgeDollarSign,
  lead_created_manual: UserPlus,
  property_created: Home,
};

const RULE_LABELS: Record<string, string> = {
  call_made: 'Ligação Realizada',
  message_sent: 'Mensagem Enviada',
  contact_made: 'Contato Efetivo',
  visit_scheduled: 'Visita Agendada',
  sale_closed: 'Venda Concluída',
  lead_created_manual: 'Cadastro Manual de Lead',
  property_created: 'Captação de Imóvel',
};

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
      return data as any[];
    },
    enabled: !!organization?.id,
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, points, is_active }: { id: string, points: number, is_active: boolean }) => {
      const { error } = await supabase
        .from('gamification_rules' as any)
        .update({ points, is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-rules-admin'] });
      toast.success('Regra atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar regra: ' + error.message);
    }
  });

  const handlePointChange = (ruleId: string, value: string) => {
    setEditingRules(prev => ({
      ...prev,
      [ruleId]: parseInt(value) || 0
    }));
  };

  const handleSave = (rule: any) => {
    const points = editingRules[rule.id] ?? rule.points;
    updateRuleMutation.mutate({ 
      id: rule.id, 
      points, 
      is_active: rule.is_active 
    });
  };

  const handleToggle = (rule: any, active: boolean) => {
    updateRuleMutation.mutate({ 
      id: rule.id, 
      points: editingRules[rule.id] ?? rule.points, 
      is_active: active 
    });
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
                          className="w-16 h-8 text-sm"
                          defaultValue={rule.points}
                          onChange={(e) => handlePointChange(rule.id, e.target.value)}
                        />
                        <span className="text-xs font-medium text-muted-foreground">pts</span>
                      </div>

                      <div className="flex items-center gap-2 border-l pl-4 h-8">
                        <Switch 
                          checked={rule.is_active} 
                          onCheckedChange={(checked) => handleToggle(rule, checked)}
                          disabled={isUpdating}
                        />
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleSave(rule)}
                          disabled={isUpdating || editingRules[rule.id] === undefined}
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
            <CardTitle className="text-sm">Missões Automáticas</CardTitle>
            <CardDescription className="text-[10px]">As missões usam os pontos base definidos ao lado.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground text-center py-4 italic">
              Em breve: Editor de missões personalizadas.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
