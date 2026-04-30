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
  Loader2
} from 'lucide-react';

const RULE_ICONS: Record<string, any> = {
  call_made: Phone,
  message_sent: MessageSquare,
  contact_made: UserCheck,
  visit_scheduled: Calendar,
  sale_closed: BadgeDollarSign,
};

const RULE_LABELS: Record<string, string> = {
  call_made: 'Ligação Realizada',
  message_sent: 'Mensagem Enviada',
  contact_made: 'Contato Efetivo',
  visit_scheduled: 'Visita Agendada',
  sale_closed: 'Venda Concluída',
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <CardTitle>Configuração de Gamificação</CardTitle>
          </div>
          <CardDescription>
            Defina quantos pontos cada ação vale para os corretores da sua imobiliária.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
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
                      <h4 className="font-medium">{RULE_LABELS[rule.action_type] || rule.action_type}</h4>
                      <p className="text-sm text-muted-foreground">Pontos por cada ocorrência</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`points-${rule.id}`} className="sr-only">Pontos</Label>
                      <Input
                        id={`points-${rule.id}`}
                        type="number"
                        className="w-20"
                        defaultValue={rule.points}
                        onChange={(e) => handlePointChange(rule.id, e.target.value)}
                      />
                      <span className="text-sm font-medium text-muted-foreground">pts</span>
                    </div>

                    <div className="flex items-center gap-2 border-l pl-4">
                      <Switch 
                        checked={rule.is_active} 
                        onCheckedChange={(checked) => handleToggle(rule, checked)}
                        disabled={isUpdating}
                      />
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleSave(rule)}
                        disabled={isUpdating || editingRules[rule.id] === undefined}
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4 flex gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center shrink-0">
            <Trophy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-semibold">Dica de Gestão:</p>
            <p>Aumente os pontos das ações que você quer incentivar no mês (ex: se o foco for prospecção, dobre os pontos de "Ligação"). Isso guiará o comportamento da equipe automaticamente.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
