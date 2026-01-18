import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { Users, Building2, FileText, TrendingUp, Target, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function Dashboard() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();

  const statCards = [
    { 
      title: t("dashboard.totalLeads"), 
      value: stats?.totalLeads || 0, 
      icon: Users, 
      change: `+${stats?.newLeadsThisMonth || 0}`,
      changeLabel: "este mês",
      trend: "up",
      color: "text-blue-500"
    },
    { 
      title: t("dashboard.activeDeals"), 
      value: stats?.activeDeals || 0, 
      icon: TrendingUp, 
      change: `${stats?.conversionRate || 0}%`,
      changeLabel: "taxa de conversão",
      trend: "up",
      color: "text-emerald-500"
    },
    { 
      title: t("nav.properties"), 
      value: stats?.totalProperties || 0, 
      icon: Building2, 
      change: "+0",
      changeLabel: "este mês",
      trend: "up",
      color: "text-violet-500"
    },
    { 
      title: t("nav.contracts"), 
      value: stats?.totalContracts || 0, 
      icon: FileText, 
      change: `${stats?.closedDeals || 0}`,
      changeLabel: "fechados",
      trend: "up",
      color: "text-amber-500"
    },
  ];

  const COLORS = ["#6366f1", "#8b5cf6", "#0ea5e9", "#f59e0b", "#10b981", "#ef4444"];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">{t("dashboard.welcome")}, {profile?.name?.split(" ")[0]}!</h1>
          <p className="text-muted-foreground">{t("dashboard.overview")}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                      <span className={stat.trend === "up" ? "text-emerald-500" : ""}>
                        {stat.change}
                      </span>
                      <span>{stat.changeLabel}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Leads by Stage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("dashboard.leadsByStage")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : stats?.leadsByStage?.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats.leadsByStage}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="name"
                    >
                      {stats.leadsByStage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [value, name]}
                      contentStyle={{ 
                        background: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                  Nenhum lead cadastrado
                </div>
              )}
              {/* Legend */}
              {stats?.leadsByStage?.length ? (
                <div className="flex flex-wrap gap-4 mt-4 justify-center">
                  {stats.leadsByStage.map((stage, index) => (
                    <div key={stage.name} className="flex items-center gap-2 text-sm">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: stage.color || COLORS[index % COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{stage.name}</span>
                      <span className="font-medium">{stage.count}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("dashboard.performance")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{t("dashboard.conversionRate")}</p>
                    <p className="text-sm text-muted-foreground">Leads → Vendas</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-primary">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : `${stats?.conversionRate || 0}%`}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium">{t("dashboard.pendingTasks")}</p>
                    <p className="text-sm text-muted-foreground">Tarefas para hoje</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-amber-500">0</div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="font-medium">{t("dashboard.newLeads")}</p>
                    <p className="text-sm text-muted-foreground">Este mês</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-500">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : stats?.newLeadsThisMonth || 0}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
