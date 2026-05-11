import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp, 
  Crown, 
  PartyPopper, 
  Phone,
  MessageSquare,
  BadgeDollarSign,
  Target,
  Calendar,
  ChevronDown,
  Filter,
  FileText,
  Users2,
  Presentation
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { startOfDay, endOfDay } from 'date-fns';
import { DateFilterPopover } from '@/components/ui/date-filter-popover';
import { DatePreset, getDateRangeFromPreset } from '@/hooks/use-dashboard-filters';

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
  const [prevTopUserId, setPrevTopUserId] = useState<string | null>(null);
  const [rankingType, setRankingType] = useState('general');
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);

  const dateRange = useMemo(() => {
    if (datePreset === 'custom' && customDateRange) {
      return customDateRange;
    }
    return getDateRangeFromPreset(datePreset);
  }, [datePreset, customDateRange]);

  const { data: leaderboard, isLoading, refetch } = useQuery({
    queryKey: ['gamification-leaderboard-full', organization?.id, rankingType, datePreset, customDateRange],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      // Query events instead of stats for filtered/period points
      let query = supabase
        .from('gamification_events')
        .select('user_id, points_earned, event_type')
        .eq('organization_id', organization.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (rankingType !== 'general') {
        const typeMap: Record<string, string[]> = {
          calls: ['call_made'],
          proposals: ['proposal_sent'],
          sales: ['sale_closed', 'contract_signed'],
          meetings: ['meeting_held'],
          visits: ['visit_scheduled', 'visit_confirmed'],
          general: ['call_made', 'message_sent', 'proposal_sent', 'sale_closed', 'contract_signed', 'meeting_held', 'visit_scheduled', 'visit_confirmed', 'mission_bonus', 'prospecting_report', 'lead_created_manual', 'property_created']
        };
        const types = typeMap[rankingType] || [];
        if (types.length > 0) {
          query = query.in('event_type', types);
        }
      }

      const { data: events, error: eventsError } = await query;
      
      if (eventsError) throw eventsError;

      // Aggregate points by user
      const pointsByUser: Record<string, number> = {};
      events?.forEach(event => {
        pointsByUser[event.user_id] = (pointsByUser[event.user_id] || 0) + (event.points_earned || 0);
      });

      // Fetch user profiles
      const { data: userData, error: userError } = await supabase
        .from('users' as any)
        .select('id, name, avatar_url')
        .eq('organization_id', organization.id);

      if (userError) throw userError;

      const mergedData = (userData || []).map((user: any) => ({
        id: user.id,
        user_id: user.id,
        total_points: pointsByUser[user.id] || 0,
        profiles: {
          name: user.name,
          avatar_url: user.avatar_url
        }
      }));

      return mergedData.sort((a, b) => b.total_points - a.total_points) as LeaderboardUser[];
    },
    enabled: !!organization?.id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel('ranking_events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gamification_events',
          filter: `organization_id=eq.${organization.id}`
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
    if (leaderboard && leaderboard.length > 0 && leaderboard[0].total_points > 0) {
      const currentTopUser = leaderboard[0];
      if (prevTopUserId && prevTopUserId !== currentTopUser.user_id) {
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

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700 pb-10">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 h-auto lg:h-[calc(100vh-220px)] min-h-[500px] overflow-visible lg:overflow-hidden">
        
        {/* LEFT SIDE: PODIUM (Arena) */}
        <div className="lg:col-span-8 flex flex-col gap-6 h-full overflow-hidden">
          <div className="relative flex-1 bg-gradient-to-b from-indigo-900/10 via-background to-background border rounded-2xl p-4 lg:p-8 flex flex-col items-center justify-end overflow-hidden shadow-none min-h-[400px] lg:min-h-0">
            <div className="absolute top-4 lg:top-8 left-4 lg:left-8 flex items-center gap-2">
              <div className="bg-yellow-500/20 p-1.5 lg:p-2 rounded-full">
                <Trophy className="h-5 w-5 lg:h-6 lg:w-6 text-yellow-500" />
              </div>
              <h2 className="text-lg lg:text-2xl font-black italic uppercase tracking-tighter text-indigo-900 dark:text-indigo-100">
                Arena {
                  rankingType === 'general' ? 'de Elite' : 
                  rankingType === 'calls' ? 'de Ligações' :
                  rankingType === 'proposals' ? 'de Propostas' :
                  rankingType === 'sales' ? 'de Vendas' :
                  rankingType === 'meetings' ? 'de Reuniões' :
                  rankingType === 'visits' ? 'de Visitas' :
                  'de Elite'
                }
              </h2>
            </div>

            <div className="absolute top-4 lg:top-8 right-4 lg:right-8 text-right">
              <div className="flex items-center gap-1 text-emerald-500 text-[10px] lg:text-base font-bold animate-pulse">
                <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-emerald-500" />
                LIVE
              </div>
            </div>

            {/* Podium Visualization */}
            <div className="flex items-end justify-center gap-4 w-full max-w-2xl relative z-10">
              {/* 2nd Place */}
              {topThree[1] && (
                <div className="flex flex-col items-center gap-2 lg:gap-4 flex-1">
                  <div className="relative group">
                    <Avatar className="h-16 w-16 lg:h-24 lg:w-24 border-2 lg:border-4 border-slate-300 shadow-xl transition-transform lg:group-hover:scale-110">
                      <AvatarImage src={topThree[1].profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-sm lg:text-xl">{getInitials(topThree[1].profiles?.name || '')}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-2 -right-2 bg-slate-100 text-slate-600 rounded-full p-1.5 border-2 border-slate-300">
                      <Medal className="h-4 w-4 lg:h-5 lg:w-5" />
                    </div>
                  </div>
                  <div className="bg-slate-300/30 w-full rounded-t-xl p-2 lg:p-4 text-center min-h-[80px] lg:min-h-[120px] flex flex-col justify-center border-x border-t border-slate-300">
                    <p className="font-bold text-[10px] lg:text-sm truncate w-full px-1">{topThree[1].profiles?.name}</p>
                    <p className="text-base lg:text-2xl font-black text-slate-600">{topThree[1].total_points.toLocaleString()}</p>
                    <p className="text-[8px] lg:text-[10px] uppercase font-bold text-slate-500 tracking-widest">Pontos</p>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {topThree[0] && (
                <div className="flex flex-col items-center gap-2 lg:gap-4 flex-1 -mt-8 lg:-mt-12">
                  <div className="relative group">
                    <div className="absolute -top-8 lg:-top-12 left-1/2 -translate-x-1/2 animate-bounce">
                      <Crown className="h-8 w-8 lg:h-12 lg:w-12 text-yellow-500 fill-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                    </div>
                    <Avatar className="h-20 w-20 lg:h-32 lg:w-32 border-2 lg:border-4 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-transform lg:group-hover:scale-110">
                      <AvatarImage src={topThree[0].profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-lg lg:text-2xl font-bold">{getInitials(topThree[0].profiles?.name || '')}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-yellow-950 text-[8px] lg:text-[10px] font-black px-2 lg:px-3 py-0.5 lg:py-1 rounded-full shadow-lg whitespace-nowrap">
                      TOP 1
                    </div>
                  </div>
                  <div className="bg-gradient-to-b from-yellow-500/20 to-yellow-500/5 w-full rounded-t-2xl p-2 lg:p-6 text-center min-h-[110px] lg:min-h-[180px] flex flex-col justify-center border-x border-t border-yellow-500 shadow-[0_-10px_40px_rgba(234,179,8,0.1)]">
                    <p className="font-black text-xs lg:text-lg truncate w-full mb-0.5 lg:mb-1 px-1">{topThree[0].profiles?.name}</p>
                    <p className="text-2xl lg:text-4xl font-black text-yellow-600 drop-shadow-sm">{topThree[0].total_points.toLocaleString()}</p>
                    <p className="text-[9px] lg:text-xs uppercase font-black text-yellow-700 tracking-widest mt-1">Campeão</p>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {topThree[2] && (
                <div className="flex flex-col items-center gap-2 lg:gap-4 flex-1">
                  <div className="relative group">
                    <Avatar className="h-14 w-14 lg:h-20 lg:w-20 border-2 lg:border-4 border-amber-600 shadow-xl transition-transform lg:group-hover:scale-110">
                      <AvatarImage src={topThree[2].profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs lg:text-lg">{getInitials(topThree[2].profiles?.name || '')}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1.5 -right-1.5 bg-amber-50 text-amber-700 rounded-full p-1 border-2 border-amber-600">
                      <Award className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                    </div>
                  </div>
                  <div className="bg-amber-600/20 w-full rounded-t-xl p-2 lg:p-4 text-center min-h-[70px] lg:min-h-[100px] flex flex-col justify-center border-x border-t border-amber-600/50">
                    <p className="font-bold text-[10px] lg:text-xs truncate w-full px-1">{topThree[2].profiles?.name}</p>
                    <p className="text-base lg:text-xl font-black text-amber-700">{topThree[2].total_points.toLocaleString()}</p>
                    <p className="text-[8px] lg:text-[10px] uppercase font-bold text-amber-600 tracking-widest">Pontos</p>
                  </div>
                </div>
              )}
            </div>

            {/* Floor */}
            <div className="w-full h-2 bg-indigo-900/10 rounded-full mt-[-2px] blur-sm" />
          </div>
        </div>

        {/* RIGHT SIDE: LIST (The Field) */}
        <div className="lg:col-span-4 flex flex-col overflow-hidden border rounded-2xl bg-card shadow-none h-[500px] lg:h-full">
          <div className="p-4 border-b bg-muted/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base lg:text-lg font-bold flex items-center gap-2">
                Classificação 
              </h3>
              
              <div className="flex items-center gap-1">
                <DateFilterPopover
                  datePreset={datePreset}
                  onDatePresetChange={(p) => p && setDatePreset(p)}
                  customDateRange={customDateRange}
                  onCustomDateRangeChange={setCustomDateRange}
                  align="end"
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                      <Filter className="h-4 w-4 text-indigo-600" />
                      <span className="hidden sm:inline">
                        {rankingType === 'general' ? 'Geral' : 
                         rankingType === 'calls' ? 'Ligações' :
                         rankingType === 'proposals' ? 'Propostas' :
                         rankingType === 'sales' ? 'Vendas' :
                         rankingType === 'meetings' ? 'Reuniões' :
                         rankingType === 'visits' ? 'Visitas' : 'Filtrar'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setRankingType('general')} className={cn(rankingType === 'general' && "bg-muted")}>
                      <Target className="mr-2 h-4 w-4" /> Geral
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRankingType('calls')} className={cn(rankingType === 'calls' && "bg-muted")}>
                      <Phone className="mr-2 h-4 w-4" /> Ligações
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRankingType('proposals')} className={cn(rankingType === 'proposals' && "bg-muted")}>
                      <FileText className="mr-2 h-4 w-4" /> Propostas
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRankingType('sales')} className={cn(rankingType === 'sales' && "bg-muted")}>
                      <BadgeDollarSign className="mr-2 h-4 w-4" /> Vendas
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRankingType('meetings')} className={cn(rankingType === 'meetings' && "bg-muted")}>
                      <Presentation className="mr-2 h-4 w-4" /> Reuniões
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRankingType('visits')} className={cn(rankingType === 'visits' && "bg-muted")}>
                      <Users2 className="mr-2 h-4 w-4" /> Visitas
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            {leaderboard?.map((user, index) => {
              const isTop3 = index < 3;
              return (
                <div 
                  key={user.id} 
                  className={cn(
                    "group flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-xl transition-all duration-300 border border-transparent hover:border-indigo-500/20 hover:bg-indigo-500/5",
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
                  
                  <Avatar className="h-8 w-8 lg:h-10 lg:w-10 border border-border shrink-0 transition-transform lg:group-hover:scale-105">
                    <AvatarImage src={user.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] lg:text-xs font-bold">{getInitials(user.profiles?.name || '')}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs lg:text-sm font-bold truncate leading-tight">{user.profiles?.name}</p>
                    <p className="text-[9px] lg:text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Corretor Ativo</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs lg:text-sm font-black text-indigo-600 dark:text-indigo-400">{user.total_points.toLocaleString()}</p>
                    <p className="text-[8px] lg:text-[9px] uppercase font-bold text-muted-foreground tracking-widest">PTS</p>
                  </div>
                </div>
              );
            })}

            {(!leaderboard || leaderboard.length === 0 || leaderboard.every(u => u.total_points === 0)) && (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                <Trophy className="h-12 w-12 mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">A arena está vazia...</p>
                <p className="text-xs">Nenhuma ação registrada neste período.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}