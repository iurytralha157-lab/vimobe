import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, CheckCircle2, Flame, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function MissionsWidget() {
  const { user, organization } = useAuth();

  const { data: missions, isLoading } = useQuery({
    queryKey: ['gamification-missions', user?.id],
    queryFn: async () => {
      if (!user?.id || !organization?.id) return [];
      
      // Get active missions for organization
      const { data: missionsData, error: missionsError } = await supabase
        .from('gamification_missions' as any)
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true);
      
      if (missionsError) throw missionsError;

      // Get user progress for these missions
      const { data: progressData, error: progressError } = await supabase
        .from('user_mission_progress' as any)
        .select('*')
        .eq('user_id', user.id)
        .gte('reset_at', new Date().toISOString());

      if (progressError) throw progressError;

      // Merge data
      return (missionsData as any[]).map(mission => {
        const progress = (progressData as any[])?.find(p => p.mission_id === mission.id);
        return {
          ...mission,
          current_count: progress?.current_count || 0,
          is_completed: progress?.is_completed || false,
        };
      });
    },
    enabled: !!user?.id && !!organization?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-orange-500" />
            Missões Ativas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!missions || missions.length === 0) return null;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Missões Diárias & Semanais
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {missions.map((mission) => {
          const progressPercent = Math.min((mission.current_count / mission.target_count) * 100, 100);
          
          return (
            <div key={mission.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className={cn(
                    "text-sm font-semibold flex items-center gap-1",
                    mission.is_completed && "text-emerald-600 line-through"
                  )}>
                    {mission.is_completed && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                    {mission.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{mission.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">
                    +{mission.bonus_points} pts
                  </span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-2 w-2" />
                    {mission.period === 'daily' ? 'Reseta hoje' : 'Reseta domingo'}
                  </span>
                  <span>{mission.current_count} / {mission.target_count}</span>
                </div>
                <Progress 
                  value={progressPercent} 
                  className={cn(
                    "h-1.5",
                    mission.is_completed ? "bg-emerald-100" : "bg-orange-100"
                  )}
                  // Pass dynamic color via style as shadcn-ui Progress uses primary color by default
                  style={mission.is_completed ? { "--progress-foreground": "var(--emerald-500)" } as any : {}}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
