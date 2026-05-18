import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';

export function GamificationStatsWidget() {
  const { user, organization } = useAuth();

  const { data: totalPoints, isLoading, refetch } = useQuery({
    queryKey: ['gamification-total-points-agg', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data, error } = await supabase
        .from('gamification_events')
        .select('points_earned')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return (data || []).reduce((acc, curr) => acc + (curr.points_earned || 0), 0);
    },
    enabled: !!user?.id,
  });

  // Realtime update
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-points-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gamification_events',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  const points = totalPoints || 0;
  const level = Math.floor(points / 1000) + 1;
  const pointsInCurrentLevel = points % 1000;
  const progress = (pointsInCurrentLevel / 1000) * 100;

  return (
    <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-500 p-2 rounded-lg">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Seu Nível</p>
              <h3 className="text-xl font-bold">Nível {level}</h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pontuação Total</p>
            <div className="flex items-center gap-1 justify-end">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-xl font-bold">{points.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-500" />
              Progresso do Nível
            </span>
            <span>{pointsInCurrentLevel} / 1000 XP</span>
          </div>
          <Progress value={progress} className="h-2 bg-indigo-500/20" />
          <p className="text-[10px] text-muted-foreground text-center italic">
            Ganhe mais {1000 - pointsInCurrentLevel} pontos para o próximo nível!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
