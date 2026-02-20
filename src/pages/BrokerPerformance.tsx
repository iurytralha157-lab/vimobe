import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useBrokerPerformance } from "@/hooks/use-broker-performance";
import { useMyPerformance, useUpsertMyGoal } from "@/hooks/use-my-performance";
import { useAuth } from "@/contexts/AuthContext";
import { SimplePeriodFilter } from "@/components/ui/date-filter-popover";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  DollarSign, TrendingUp, Clock, FileText, Users, Edit2, Check, X, Medal,
} from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear,
} from "date-fns";

type PeriodType = "month" | "quarter" | "year";

const periodOptions = [
  { value: "month", label: "Este mês" },
  { value: "quarter", label: "Este trimestre" },
  { value: "year", label: "Este ano" },
];

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const fmtCompact = (value: number) => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return fmt(value);
};

const fmtSeconds = (s: number | null) => {
  if (s === null) return "—";
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min`;
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const medalColors = ["text-yellow-500", "text-slate-400", "text-amber-700"];

export default function BrokerPerformance() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodType>("month");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const getDateRange = (p: PeriodType) => {
    const now = new Date();
    switch (p) {
      case "month": return { from: startOfMonth(now), to: endOfMonth(now) };
      case "quarter": return { from: startOfQuarter(now), to: endOfQuarter(now) };
      case "year": return { from: startOfYear(now), to: endOfYear(now) };
    }
  };

  const dateRange = getDateRange(period);
  const { data: brokers = [], isLoading: brokersLoading } = useBrokerPerformance(dateRange);
  const { data: myPerf, isLoading: myPerfLoading } = useMyPerformance(dateRange);
  const upsertGoal = useUpsertMyGoal();

  const handleSaveGoal = async () => {
    const amount = parseFloat(goalInput.replace(/[^\d,]/g, "").replace(",", "."));
    if (!isNaN(amount) && amount >= 0) await upsertGoal.mutateAsync(amount);
    setEditingGoal(false);
  };

  // Chart data from last 6 months
  const chartData = (myPerf?.last6Months || []).map((m) => ({
    month: m.month,
    vendas: m.totalSales,
    meta: m.goal,
  }));

  // Max sales for ranking bar widths
  const maxSales = Math.max(...brokers.map((b) => b.totalSales), 1);

  const periodLabel = periodOptions.find((o) => o.value === period)?.label || "Este mês";

  return (
    <AppLayout title="Performance">
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-xl font-bold">Performance</h1>
        <p className="text-sm text-muted-foreground">Acompanhe seus resultados e o ranking da equipe</p>
      </div>

      {/* Period filter */}
      <div className="flex justify-end mb-6">
        <SimplePeriodFilter
          value={period}
          onChange={(v) => setPeriod(v as PeriodType)}
          options={periodOptions}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

        {/* ── LEFT: Minha Performance ── */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 border-l-4 border-primary pl-3">
            <h2 className="text-base font-semibold">Minha Performance</h2>
          </div>

          {/* KPI Grid 3 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Vendido */}
            <Card className="bg-card/60">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Total Vendido</span>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">
                  {myPerfLoading ? "..." : fmt(myPerf?.totalSales || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">no período selecionado</p>
              </CardContent>
            </Card>

            {/* Negócios Fechados */}
            <Card className="bg-card/60">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Negócios Fechados</span>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">
                  {myPerfLoading ? "..." : (myPerf?.closedCount || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">no período selecionado</p>
              </CardContent>
            </Card>

            {/* Comissão */}
            <Card className="bg-card/60">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Comissão (período)</span>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">
                  {myPerfLoading ? "..." : fmt(myPerf?.totalCommission || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">do sistema financeiro</p>
              </CardContent>
            </Card>

            {/* Contratos Ativos */}
            <Card className="bg-card/60">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Contratos Ativos</span>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">
                  {myPerfLoading ? "..." : (myPerf?.activeContracts || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">em andamento</p>
              </CardContent>
            </Card>

            {/* Leads em Andamento */}
            <Card className="bg-card/60 cursor-pointer hover:bg-card/80 transition-colors">
              <Link to="/crm/pipelines" className="block">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Leads em Andamento</span>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">
                    {myPerfLoading ? "..." : (myPerf?.activeLeads || 0)}
                  </div>
                  <p className="text-xs text-primary mt-1">Ver no funil →</p>
                </CardContent>
              </Link>
            </Card>

            {/* Tempo de Resposta */}
            <Card className="bg-card/60">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Tempo de Resposta</span>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">
                  {myPerfLoading ? "..." : fmtSeconds(myPerf?.avgResponseSeconds ?? null)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">tempo médio 1ª resposta</p>
              </CardContent>
            </Card>
          </div>

          {/* Meta bar */}
          <Card className="bg-card/60">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Meta:</span>
                  {editingGoal ? (
                    <div className="flex items-center gap-1">
                      <Input
                        autoFocus
                        className="h-7 w-32 text-sm"
                        value={goalInput}
                        onChange={(e) => setGoalInput(e.target.value)}
                        placeholder="Ex: 500000"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveGoal();
                          if (e.key === "Escape") setEditingGoal(false);
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveGoal}>
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingGoal(false)}>
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold">{fmt(myPerf?.currentGoal || 0)}</span>
                      <Button
                        size="icon" variant="ghost" className="h-6 w-6"
                        onClick={() => { setGoalInput(String(myPerf?.currentGoal || "")); setEditingGoal(true); }}
                      >
                        <Edit2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {(myPerf?.goalProgress || 0).toFixed(0)}%{" "}
                  {!myPerf?.currentGoal && <span className="text-xs">(clique no lápis para definir uma meta)</span>}
                </span>
              </div>
              <Progress value={myPerf?.goalProgress || 0} className="h-2 mb-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{fmt(myPerf?.totalSales || 0)} alcançado</span>
                <span>Meta: {fmt(myPerf?.currentGoal || 0)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Evolution chart */}
          <Card className="bg-card/60">
            <CardContent className="pt-5 pb-2">
              <p className="text-sm font-semibold mb-1">📈 Evolução dos últimos 6 meses</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => fmtCompact(v)}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                  />
                  <Tooltip
                    formatter={(value: number) => [fmtCompact(value), "Vendas"]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="vendas"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#grad)"
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: Ranking da Equipe ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-l-4 border-primary pl-3">
            <Medal className="h-4 w-4 text-primary" />
            <div>
              <h2 className="text-base font-semibold">Ranking da Equipe</h2>
              <p className="text-xs text-muted-foreground">{periodLabel}</p>
            </div>
          </div>

          <Card className="bg-card/60">
            <CardContent className="pt-4 pb-4 space-y-3">
              {brokersLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
              ) : brokers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado no período</p>
              ) : (
                brokers.map((broker, index) => {
                  const isMe = broker.userId === user?.id;
                  const barWidth = maxSales > 0 ? (broker.totalSales / maxSales) * 100 : 0;

                  return (
                    <div key={broker.userId} className="flex items-center gap-3">
                      {/* Position */}
                      <div className="w-6 flex items-center justify-center shrink-0">
                        {index < 3 ? (
                          <Medal className={`h-4 w-4 ${medalColors[index]}`} />
                        ) : (
                          <span className="text-xs text-muted-foreground">{index + 1}º</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={broker.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">{getInitials(broker.userName)}</AvatarFallback>
                      </Avatar>

                      {/* Name + bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-sm font-medium truncate ${isMe ? "text-primary" : ""}`}>
                            {broker.userName}
                          </span>
                          {isMe && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary">
                              Você
                            </Badge>
                          )}
                        </div>
                        {/* Progress bar */}
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isMe ? "bg-primary" : "bg-muted-foreground/50"}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>

                      {/* Sales count */}
                      <div className="text-right shrink-0">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {broker.closedLeads} {broker.closedLeads === 1 ? "venda" : "vendas"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
