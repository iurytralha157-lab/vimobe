import { Loader2, Trophy, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLeaderStats } from "@/hooks/use-leader-stats";

export function TeamLeadersStats() {
  const { data: stats, isLoading } = useLeaderStats();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">Nenhum líder encontrado</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Defina líderes nas equipes para ver estatísticas de performance
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((leader, index) => {
        const isTopPerformer = leader.conversionRate >= 50;

        return (
          <Card key={leader.userId} className="relative overflow-hidden">
            {index === 0 && stats.length > 1 && (
              <div className="absolute top-2 right-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
            )}

            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={leader.userAvatar || undefined} />
                  <AvatarFallback className="text-sm">
                    {getInitials(leader.userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{leader.userName}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {leader.teamName}
                  </p>
                </div>
                {isTopPerformer && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shrink-0">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Alta performance
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{leader.totalLeads}</p>
                  <p className="text-xs text-muted-foreground">Total de leads</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-emerald-600">
                    {leader.convertedLeads}
                  </p>
                  <p className="text-xs text-muted-foreground">Convertidos</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de conversão</span>
                  <span className="font-medium">{leader.conversionRate}%</span>
                </div>
                <Progress
                  value={leader.conversionRate}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
