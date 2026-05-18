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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, MessageSquare, UserCheck, Calendar, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export default function GamificationHistory() {
  const { user, profile, isSuperAdmin } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin' || isSuperAdmin;
  const targetUserId = selectedUserId || user?.id;

  const { data: history, isLoading } = useQuery({
    queryKey: ['gamification-history-events', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data, error } = await supabase
        .from('gamification_events')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!targetUserId,
  });

  const { data: users } = useQuery({
    queryKey: ['org-users-gamification'],
    queryFn: async () => {
      const { data } = await supabase.from('users' as any).select('id, name');
      return data || [];
    },
    enabled: isAdmin
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Transparência e Histórico</h2>
          <p className="text-muted-foreground">Veja todas as ações que geraram pontos no sistema.</p>
        </div>
        
        {isAdmin && users && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filtrar Usuário:</span>
            <select 
              className="flex h-9 w-[200px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(e.target.value || null)}
            >
              <option value="">Meu Histórico</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Registro de Atividades
          </CardTitle>
          <CardDescription>
            Detalhamento de pontos ganhos por ação realizada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead className="text-center">Pontos</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!history || history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma atividade registrada neste período.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-semibold">
                          {item.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold text-emerald-600">
                        +{item.points_earned}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {item.source_module || 'Sistema'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        <span className="text-xs text-muted-foreground">
                          {item.metadata ? JSON.stringify(item.metadata).slice(0, 50) + '...' : '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
