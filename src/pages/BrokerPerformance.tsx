import { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { DateFilterPopover } from "@/components/ui/date-filter-popover";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMyPerformance, useUpsertMyGoal } from "@/hooks/use-my-performance";
import { useTeamRanking } from "@/hooks/use-team-ranking";
import { formatSlaTime } from "@/hooks/use-sla-reports";

import {
  DatePreset,
  getDateRangeFromPreset,
  datePresetOptions,
} from "@/hooks/use-dashboard-filters";
import {
  TrendingUp,
  Target,
  DollarSign,
  FileText,
  Flame,
  Trophy,
  Pencil,
  Check,
  Loader2,
  Users,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getMedalEmoji(position: number) {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return null;
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <p className="text-primary font-semibold">
        {formatCurrency(payload[0].value)}
      </p>
      <p className="text-muted-foreground">{payload[0].payload.closedCount} vendas</p>
    </div>
  );
}

// ── Goal Editor ───────────────────────────────────────────────────────────────

function GoalEditor({
  currentGoal,
  onSave,
  isSaving,
}: {
  currentGoal: number;
  onSave: (v: number) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(currentGoal));
  const [saved, setSaved] = useState(false);

  const handleBlur = () => {
    const num = parseFloat(value.replace(/\D/g, "")) || 0;
    onSave(num);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Meta:</span>
        <Input
          autoFocus
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && handleBlur()}
          className="h-7 w-36 text-sm"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        Meta: <span className="font-semibold text-foreground">{formatCurrency(currentGoal)}</span>
      </span>
      <button
        onClick={() => { setValue(String(currentGoal)); setEditing(true); }}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title="Editar meta"
      >
        {isSaving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : saved ? (
          <Check className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Pencil className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BrokerPerformance() {
  const [datePreset, setDatePreset] = useState<DatePreset>("thisMonth");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);

  const dateRange = useMemo(() => {
    if (datePreset === "custom" && customDateRange) return customDateRange;
    return getDateRangeFromPreset(datePreset);
  }, [datePreset, customDateRange]);

  const { data: perf, isLoading: loadingPerf } = useMyPerformance(dateRange);
  const { data: teamData, isLoading: loadingTeam } = useTeamRanking(dateRange);
  const upsertGoal = useUpsertMyGoal();

  const topClosedCount = teamData?.ranking[0]?.closedCount || 1;

  const periodLabel = useMemo(() => {
    if (datePreset === "custom" && customDateRange) {
      return `${format(customDateRange.from, "dd/MM", { locale: ptBR })} – ${format(customDateRange.to, "dd/MM", { locale: ptBR })}`;
    }
    return datePresetOptions.find((o) => o.value === datePreset)?.label || "Período";
  }, [datePreset, customDateRange]);

  const handleSaveGoal = useCallback(
    (amount: number) => {
      upsertGoal.mutate(amount);
    },
    [upsertGoal]
  );

  return (
    <AppLayout title="Performance">
      {/* ── FILTRO GLOBAL ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Performance</h1>
          <p className="text-xs text-muted-foreground">Acompanhe seus resultados e o ranking da equipe</p>
        </div>
        <DateFilterPopover
          datePreset={datePreset}
          onDatePresetChange={setDatePreset}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
          defaultPreset="thisMonth"
          align="end"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 w-full pb-10 items-start">

        {/* ── ÁREA 1: MINHA PERFORMANCE ─────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-1 rounded-full bg-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Minha Performance</h2>
            </div>
            {(perf?.streak ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-auto flex items-center gap-1 text-xs">
                <Flame className="h-3.5 w-3.5 text-destructive" />
                {perf!.streak} {perf!.streak === 1 ? "mês" : "meses"} seguidos batendo a meta
              </Badge>
            )}
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-4">
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Vendido</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {loadingPerf ? (
                  <div className="h-7 w-24 bg-muted animate-pulse rounded" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground">
                      {formatCurrency(perf?.totalSales ?? 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">no período selecionado</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Negócios Fechados</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {loadingPerf ? (
                  <div className="h-7 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground">
                      {perf?.closedCount ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">no período selecionado</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Ticket Médio</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {loadingPerf ? (
                  <div className="h-7 w-24 bg-muted animate-pulse rounded" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground">
                      {formatCurrency(perf?.ticketMedio ?? 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">por negócio</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Contratos Ativos</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {loadingPerf ? (
                  <div className="h-7 w-12 bg-muted animate-pulse rounded" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground">
                      {perf?.activeContracts ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">em andamento</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Link to="/pipelines" className="block">
              <Card className="border shadow-sm hover:border-primary/40 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Leads em Andamento</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {loadingPerf ? (
                    <div className="h-7 w-12 bg-muted animate-pulse rounded" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-foreground">
                        {perf?.activeLeads ?? 0}
                      </div>
                      <p className="text-xs text-primary mt-0.5">Ver no funil →</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </Link>

            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Tempo de Resposta</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {loadingPerf ? (
                  <div className="h-7 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground">
                      {perf?.avgResponseSeconds != null
                        ? formatSlaTime(Math.round(perf.avgResponseSeconds))
                        : "—"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">tempo médio 1ª resposta</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Meta Progress */}
          <Card className="border shadow-sm mb-4">
            <CardContent className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <GoalEditor
                  currentGoal={perf?.currentGoal ?? 0}
                  onSave={handleSaveGoal}
                  isSaving={upsertGoal.isPending}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {(perf?.goalProgress ?? 0).toFixed(0)}%
                  </span>
                  {(perf?.currentGoal ?? 0) === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                      (clique no lápis para definir uma meta)
                    </span>
                  )}
                </div>
              </div>
              <Progress
                value={perf?.goalProgress ?? 0}
                className="h-2.5"
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(perf?.totalSales ?? 0)} alcançado
                </span>
                <span className="text-xs text-muted-foreground">
                  Meta: {formatCurrency(perf?.currentGoal ?? 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 6-Month Chart */}
          <Card className="border shadow-sm">
            <CardHeader className="px-5 pt-4 pb-2">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Evolução dos últimos 6 meses
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {loadingPerf ? (
                <div className="h-48 bg-muted animate-pulse rounded" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart
                    data={perf?.last6Months ?? []}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={1.0}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1000
                          ? `${(v / 1000).toFixed(0)}k`
                          : String(v)
                      }
                      width={40}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="totalSales"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#salesGradient)"
                      dot={{ r: 3, fill: "hsl(var(--primary))" }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── ÁREA 2: RANKING DA EQUIPE ─────────────────────────────────── */}
        <section className="lg:sticky lg:top-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-1 rounded-full bg-secondary-foreground" />
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Trophy className="h-5 w-5 text-secondary-foreground" />
                Ranking da Equipe
              </h2>
              <p className="text-xs text-muted-foreground capitalize">{periodLabel}</p>
            </div>
          </div>

          <Card className="border shadow-sm">
            <CardContent className="px-0 py-2">
              {loadingTeam ? (
                <div className="space-y-3 px-5 py-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : teamData?.ranking.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  Nenhum dado encontrado para {periodLabel.toLowerCase()}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {teamData?.ranking.map((entry) => {
                    const medal = getMedalEmoji(entry.position);
                    const barWidth =
                      topClosedCount > 0
                        ? (entry.closedCount / topClosedCount) * 100
                        : 0;

                    return (
                      <div
                        key={entry.userId}
                        className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                          entry.isCurrentUser
                            ? "bg-primary/5 border-l-2 border-l-primary"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        {/* Position */}
                        <div className="w-8 text-center flex-shrink-0">
                          {medal ? (
                            <span className="text-xl leading-none">{medal}</span>
                          ) : (
                            <span className="text-sm font-medium text-muted-foreground">
                              {entry.position}º
                            </span>
                          )}
                        </div>

                        {/* Avatar */}
                        <Avatar className="h-9 w-9 flex-shrink-0">
                          <AvatarImage src={entry.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(entry.userName)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Name + bar */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-sm font-medium truncate ${
                                entry.isCurrentUser
                                  ? "text-primary"
                                  : "text-foreground"
                              }`}
                            >
                              {entry.userName}
                            </span>
                            {entry.isCurrentUser && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0 bg-primary/10 text-primary border-primary/20"
                              >
                                Você
                              </Badge>
                            )}
                          </div>
                          {/* Progress bar relative to leader */}
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                entry.isCurrentUser
                                   ? "bg-primary"
                                   : entry.position === 1
                                   ? "bg-foreground"
                                   : entry.position === 2
                                   ? "bg-muted-foreground"
                                   : entry.position === 3
                                   ? "bg-muted-foreground/70"
                                   : "bg-muted-foreground/40"
                              }`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>

                        {/* Count — only sales number, never R$ */}
                        <div className="text-right flex-shrink-0 w-20">
                          <span className="text-sm font-bold text-foreground">
                            {entry.closedCount}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            {entry.closedCount === 1 ? "venda" : "vendas"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppLayout>
  );
}
