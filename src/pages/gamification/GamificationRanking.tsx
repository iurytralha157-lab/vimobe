import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award, TrendingUp, Crown, PartyPopper } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface LeaderboardUser {
  id: string;
  user_id: string;
  total_points: number;
  profiles: {
    name: string | null;
    avatar_url: string | null;
  } | null;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function GamificationRanking() {
  const { organization } = useAuth();
  const { t } = useLanguage();
  const [prevTopUserId, setPrevTopUserId] = useState<string | null>(null);

  const { data: leaderboard, isLoading, refetch } = useQuery({
    queryKey: ['gamification-leaderboard-full', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      // 1. Buscamos as pontuações
      const { data: statsData, error: statsError } = await (supabase as any)
        .from('user_gamification_stats')
        .select('user_id, total_points')
        .eq('organization_id', organization.id);
      
      if (statsError) throw statsError;

      // 2. Buscamos os usuários (Profiles)
      const { data: userData, error: userError } = await (supabase as any)
        .from('users')
        .select('id, name, avatar_url')
        .eq('organization_id', organization.id);

      if (userError) throw userError;

      // 3. Mesclamos os dados manualmente para evitar erros de tipagem
      const mergedData = (userData || []).map((user: any) => {
        const stats = (statsData || []).find((s: any) => s.user_id === user.id);
        return {
          id: user.id,
          user_id: user.id,
          total_points: stats?.total_points || 0,
          profiles: {
            name: user.name,
            avatar_url: user.avatar_url
          }
        };
      });

      return mergedData.sort((a: any, b: any) => b.total_points - a.total_points) as unknown as LeaderboardUser[];
    },
    enabled: !!organization?.id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel('ranking_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_gamification_stats',
          // filter: `organization_id=eq.${organization.id}`
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id, refetch]);

  // Effect for celebrations when 1st place changes
  useEffect(() => {
    if (leaderboard && leaderboard.length > 0) {
      const currentTopUser = leaderboard[0];
      if (prevTopUserId && prevTopUserId !== currentTopUser.user_id) {
        // First place changed!
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF4500']
        });
        toast.success(`${currentTopUser.profiles?.name} assumiu a LIDERANÇA! 🏆`, {
          icon: <PartyPopper className="text-yellow-500" />,
          duration: 5000,
        });
      }
      setPrevTopUserId(currentTopUser.user_id);
    }
  }, [leaderboard, prevTopUserId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        <Skeleton className="md:col-span-8 h-full rounded-xl" />
        <Skeleton className="md:col-span-4 h-full rounded-xl" />
      </div>
    );
  }

  const topThree = leaderboard?.slice(0, 3) || [];
  const others = leaderboard?.slice(3) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] min-h-[500px] animate-in fade-in duration-700 overflow-hidden">
      
      {/* LEFT SIDE: PODIUM (Arena) */}
      <div className="lg:col-span-8 flex flex-col gap-6 h-full overflow-hidden">
        <div className="relative flex-1 bg-gradient-to-b from-indigo-900/10 via-background to-background border rounded-2xl p-8 flex flex-col items-center justify-end overflow-hidden shadow-none min-h-0">
          <div className="absolute top-8 left-8 flex items-center gap-2">
            <div className="bg-yellow-500/20 p-2 rounded-full">
              <Trophy className="h-6 w-6 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-indigo-900 dark:text-indigo-100">Arena de Elite</h2>
          </div>

          <div className="absolute top-8 right-8 text-right">
            <div className="flex items-center gap-1 text-emerald-500 font-bold animate-pulse">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              LIVE
            </div>
          </div>

          {/* Podium Visualization */}
          <div className="flex items-end justify-center gap-4 w-full max-w-2xl relative z-10">
            
            {/* 2nd Place */}
            {topThree[1] && (
              <div className="flex flex-col items-center gap-4 flex-1">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-4 border-slate-300 shadow-xl transition-transform group-hover:scale-110">
                    <AvatarImage src={topThree[1].profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xl">{getInitials(topThree[1].profiles?.name || '')}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-3 -right-3 bg-slate-100 text-slate-600 rounded-full p-2 border-2 border-slate-300">
                    <Medal className="h-5 w-5" />
                  </div>
                </div>
                <div className="bg-slate-300/30 w-full rounded-t-xl p-4 text-center min-h-[120px] flex flex-col justify-center border-x border-t border-slate-300">
                  <p className="font-bold text-sm truncate w-full">{topThree[1].profiles?.name}</p>
                  <p className="text-2xl font-black text-slate-600">{topThree[1].total_points.toLocaleString()}</p>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1">Pontos</p>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <div className="flex flex-col items-center gap-4 flex-1 -mt-12">
                <div className="relative group">
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 animate-bounce">
                    <Crown className="h-12 w-12 text-yellow-500 fill-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                  </div>
                  <Avatar className="h-32 w-32 border-4 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-transform group-hover:scale-110">
                    <AvatarImage src={topThree[0].profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl font-bold">{getInitials(topThree[0].profiles?.name || '')}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-yellow-950 text-[10px] font-black px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                    TOP 1
                  </div>
                </div>
                <div className="bg-gradient-to-b from-yellow-500/20 to-yellow-500/5 w-full rounded-t-2xl p-6 text-center min-h-[180px] flex flex-col justify-center border-x border-t border-yellow-500 shadow-[0_-10px_40px_rgba(234,179,8,0.1)]">
                  <p className="font-black text-lg truncate w-full mb-1">{topThree[0].profiles?.name}</p>
                  <p className="text-4xl font-black text-yellow-600 drop-shadow-sm">{topThree[0].total_points.toLocaleString()}</p>
                  <p className="text-xs uppercase font-black text-yellow-700 tracking-widest mt-2">Campeão Atual</p>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div className="flex flex-col items-center gap-4 flex-1">
                <div className="relative group">
                  <Avatar className="h-20 w-20 border-4 border-amber-600 shadow-xl transition-transform group-hover:scale-110">
                    <AvatarImage src={topThree[2].profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-lg">{getInitials(topThree[2].profiles?.name || '')}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-2 -right-2 bg-amber-50 text-amber-700 rounded-full p-1.5 border-2 border-amber-600">
                    <Award className="h-4 w-4" />
                  </div>
                </div>
                <div className="bg-amber-600/20 w-full rounded-t-xl p-4 text-center min-h-[100px] flex flex-col justify-center border-x border-t border-amber-600/50">
                  <p className="font-bold text-xs truncate w-full">{topThree[2].profiles?.name}</p>
                  <p className="text-xl font-black text-amber-700">{topThree[2].total_points.toLocaleString()}</p>
                  <p className="text-[10px] uppercase font-bold text-amber-600 tracking-widest mt-1">Pontos</p>
                </div>
              </div>
            )}
          </div>

          {/* Floor */}
          <div className="w-full h-2 bg-indigo-900/10 rounded-full mt-[-2px] blur-sm" />
        </div>
      </div>

      {/* RIGHT SIDE: LIST (The Field) */}
      <div className="lg:col-span-4 flex flex-col overflow-hidden border rounded-2xl bg-card shadow-none h-full">
        <div className="p-6 border-b bg-muted/30">
          <h3 className="text-lg font-bold">
            Classificação Geral
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
          {leaderboard?.map((user, index) => {
            const isTop3 = index < 3;
            return (
              <div 
                key={user.id} 
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-xl transition-all duration-300 border border-transparent hover:border-indigo-500/20 hover:bg-indigo-500/5",
                  isTop3 && "bg-muted/50"
                )}
              >
                <div className={cn(
                  "w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-black",
                  index === 0 ? "bg-yellow-500 text-yellow-950" : 
                  index === 1 ? "bg-slate-300 text-slate-700" :
                  index === 2 ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {index + 1}
                </div>
                
                <Avatar className="h-10 w-10 border border-border shrink-0 transition-transform group-hover:scale-105">
                  <AvatarImage src={user.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs font-bold">{getInitials(user.profiles?.name || '')}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate leading-tight">{user.profiles?.name}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Corretor Ativo</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{user.total_points.toLocaleString()}</p>
                  <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">PTS</p>
                </div>
              </div>
            );
          })}

          {(!leaderboard || leaderboard.length === 0) && (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
              <Trophy className="h-12 w-12 mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">A arena está vazia...</p>
              <p className="text-xs">Lance uma prospecção para entrar no jogo!</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-muted/20 text-center">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Atualizado em tempo real</p>
        </div>
      </div>
    </div>
  );
}
