import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Zap, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function GamificationStatsWidget() {
  const { user, organization } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['gamification-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_gamification_stats' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

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

  const points = (stats as any)?.total_points || 0;
  const level = (stats as any)?.current_level || 1;
  const nextLevelPoints = level * 1000; // Simplified logic: each level is 1000 points
  const progress = Math.min((points % 1000) / 10, 100);

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
            <span>{points % 1000} / 1000 XP</span>
          </div>
          <Progress value={progress} className="h-2 bg-indigo-500/20" />
          <p className="text-[10px] text-muted-foreground text-center italic">
            Ganhe mais {1000 - (points % 1000)} pontos para o próximo nível!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
