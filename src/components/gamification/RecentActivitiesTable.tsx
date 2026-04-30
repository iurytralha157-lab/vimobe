import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Star, TrendingUp, Phone, MessageSquare, UserCheck, Trophy } from 'lucide-react';

const ACTION_ICONS: Record<string, any> = {
  call_made: Phone,
  message_sent: MessageSquare,
  contact_made: UserCheck,
  visit_scheduled: TrendingUp,
  sale_closed: Trophy,
  prospecting_report: Star,
  mission_bonus: Star,
};

const ACTION_LABELS: Record<string, string> = {
  call_made: 'Ligação',
  message_sent: 'Mensagem',
  contact_made: 'Contato',
  visit_scheduled: 'Visita Agendada',
  sale_closed: 'Venda',
  prospecting_report: 'Relatório de Prospecção',
  mission_bonus: 'Bônus de Missão',
};

export function RecentActivitiesTable() {
  const { user } = useAuth();

  const { data: activities, isLoading } = useQuery({
    queryKey: ['gamification-recent-activities', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('gamification_activity_logs' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <div className="p-4 text-center text-sm text-muted-foreground">Carregando atividades...</div>;
  if (!activities || activities.length === 0) return <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</div>;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ação</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Pontos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity) => {
            const Icon = ACTION_ICONS[activity.action_type] || Star;
            return (
              <TableRow key={activity.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span>{ACTION_LABELS[activity.action_type] || activity.action_type}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(activity.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right font-bold text-emerald-600">
                  +{activity.points_earned}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
