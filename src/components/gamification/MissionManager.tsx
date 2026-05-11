import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Target, 
  Plus, 
  Trash2, 
  Loader2,
  Flame,
  Star
} from 'lucide-react';

export function MissionManager() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newMission, setNewMission] = useState({
    title: '',
    description: '',
    action_type: 'call_made',
    target_count: 10,
    bonus_points: 100,
    period: 'daily'
  });

  const { data: missions, isLoading } = useQuery({
    queryKey: ['gamification-missions-admin', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from('gamification_missions' as any)
        .select('*')
        .eq('organization_id', organization.id);
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!organization?.id,
  });

  const createMissionMutation = useMutation({
    mutationFn: async (mission: typeof newMission) => {
      const { error } = await supabase
        .from('gamification_missions' as any)
        .insert([{ ...mission, organization_id: organization?.id, is_active: true }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-missions-admin'] });
      setIsAdding(false);
      toast.success('Missão criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar missão: ' + error.message);
    }
  });

  const updateMissionMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const { error } = await supabase
        .from('gamification_missions' as any)
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-missions-admin'] });
    }
  });

  const deleteMissionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gamification_missions' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-missions-admin'] });
      toast.success('Missão removida.');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Missões Automáticas
          </h3>
          <p className="text-sm text-muted-foreground">Crie desafios recorrentes para motivar sua equipe.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "ghost" : "default"}>
          {isAdding ? 'Cancelar' : <><Plus className="h-4 w-4 mr-2" /> Nova Missão</>}
        </Button>
      </div>

      {isAdding && (
        <Card className="border-indigo-500/20 bg-indigo-500/5">
          <CardHeader>
            <CardTitle className="text-sm">Configurar Nova Missão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título da Missão</Label>
                <Input 
                  placeholder="Ex: Guerreiro de Vendas" 
                  value={newMission.title}
                  onChange={e => setNewMission({...newMission, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Ação Gatilho</Label>
                <Select 
                  value={newMission.action_type}
                  onValueChange={val => setNewMission({...newMission, action_type: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call_made">Ligações</SelectItem>
                    <SelectItem value="message_sent">Mensagens</SelectItem>
                    <SelectItem value="sale_closed">Vendas</SelectItem>
                    <SelectItem value="lead_created_manual">Novos Leads</SelectItem>
                    <SelectItem value="visit_scheduled">Visitas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Meta (Quantidade)</Label>
                <Input 
                  type="number"
                  value={newMission.target_count}
                  onChange={e => setNewMission({...newMission, target_count: parseInt(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Bônus de Pontos</Label>
                <Input 
                  type="number"
                  value={newMission.bonus_points}
                  onChange={e => setNewMission({...newMission, bonus_points: parseInt(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Período de Reset</Label>
                <Select 
                  value={newMission.period}
                  onValueChange={val => setNewMission({...newMission, period: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input 
                placeholder="Ex: Realize 10 ligações hoje para ganhar o bônus." 
                value={newMission.description}
                onChange={e => setNewMission({...newMission, description: e.target.value})}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={() => createMissionMutation.mutate(newMission)}
              disabled={createMissionMutation.isPending || !newMission.title}
            >
              {createMissionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Missão'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {missions?.map((mission) => (
          <Card key={mission.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <Target className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{mission.title}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{mission.period}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={mission.is_active} 
                    onCheckedChange={(checked) => updateMissionMutation.mutate({ id: mission.id, is_active: checked })}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive"
                    onClick={() => deleteMissionMutation.mutate(mission.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Meta:</span>
                  <span className="font-bold">{mission.target_count} {mission.action_type}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Recompensa:</span>
                  <span className="font-bold text-emerald-600">+{mission.bonus_points} pts</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 italic">"{mission.description}"</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}