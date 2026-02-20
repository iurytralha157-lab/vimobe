import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBrokerPerformance, useTeamAverages } from "@/hooks/use-broker-performance";
import { useMyPerformance, useUpsertMyGoal } from "@/hooks/use-my-performance";
import { SimplePeriodFilter } from "@/components/ui/date-filter-popover";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from "recharts";
import {
  Download, TrendingUp, Clock, Target, DollarSign, Users, Medal,
  Flame, Trophy, Briefcase, ArrowRight, Edit2, Check, X
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import ExcelJS from "exceljs";

type PeriodType = 'month' | 'quarter' | 'year';

const periodOptions = [
  { value: 'month', label: 'Este mês' },
  { value: 'quarter', label: 'Este trimestre' },
  { value: 'year', label: 'Este ano' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatSeconds = (s: number | null) => {
  if (s === null) return '-';
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min`;
};

const formatMinutes = (minutes: number | null) => {
  if (minutes === null) return '-';
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}min`;
};

const getMedalIcon = (position: number) => {
  switch (position) {
    case 1: return <Medal className="h-5 w-5 text-yellow-500" />;
    case 2: return <Medal className="h-5 w-5 text-gray-400" />;
    case 3: return <Medal className="h-5 w-5 text-amber-700" />;
    default: return <span className="text-muted-foreground">{position}º</span>;
  }
};

const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

export default function BrokerPerformance() {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const getDateRange = (periodType: PeriodType) => {
    const now = new Date();
    switch (periodType) {
      case 'month': return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'quarter': return { from: startOfQuarter(now), to: endOfQuarter(now) };
      case 'year': return { from: startOfYear(now), to: endOfYear(now) };
    }
  };

  const dateRange = getDateRange(period);
  const { data: brokers, isLoading } = useBrokerPerformance(dateRange);
  const teamAverages = useTeamAverages(dateRange);
  const { data: myPerf, isLoading: myPerfLoading } = useMyPerformance(dateRange);
  const upsertGoal = useUpsertMyGoal();

  const handleSaveGoal = async () => {
    const amount = parseFloat(goalInput.replace(/[^\d,]/g, '').replace(',', '.'));
    if (!isNaN(amount) && amount >= 0) {
      await upsertGoal.mutateAsync(amount);
    }
    setEditingGoal(false);
  };

  const handleExport = async () => {
    if (!brokers) return;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Performance');
    worksheet.columns = [
      { header: 'Posição', key: 'posicao', width: 10 },
      { header: 'Corretor', key: 'corretor', width: 25 },
      { header: 'Leads Atribuídos', key: 'leads_atribuidos', width: 18 },
      { header: 'Leads Fechados', key: 'leads_fechados', width: 16 },
      { header: 'Taxa de Conversão (%)', key: 'conversao', width: 20 },
      { header: 'Tempo Médio Atendimento (min)', key: 'tempo_medio', width: 28 },
      { header: 'Vendas (R$)', key: 'vendas', width: 18 },
      { header: 'Comissões (R$)', key: 'comissoes', width: 18 },
      { header: 'Leads Ativos', key: 'leads_ativos', width: 14 },
    ];
    brokers.forEach((broker, index) => {
      worksheet.addRow({
        posicao: index + 1,
        corretor: broker.userName,
        leads_atribuidos: broker.totalLeads,
        leads_fechados: broker.closedLeads,
        conversao: broker.conversionRate.toFixed(1),
        tempo_medio: broker.avgResponseTimeMinutes?.toFixed(0) || '-',
        vendas: broker.totalSales,
        comissoes: broker.totalCommissions,
        leads_ativos: broker.activeLeads,
      });
    });
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `performance-corretores-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const chartData = myPerf?.last6Months?.map((m) => ({
    month: m.month,
    vendas: m.totalSales,
    meta: m.goal,
  })) || [];

  return (
    <AppLayout title="Performance de Corretores">
      <div className="space-y-8">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-muted-foreground">Acompanhe o desempenho da sua equipe de vendas</p>
          <div className="flex items-center gap-2">
            <SimplePeriodFilter
              value={period}
              onChange={(v) => setPeriod(v as PeriodType)}
              options={periodOptions}
            />
            <Button variant="outline" onClick={handleExport} disabled={!brokers?.length}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            SEÇÃO 1 — MINHA PERFORMANCE (área privada)
        ════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Minha Performance</h2>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {myPerfLoading ? '...' : formatCurrency(myPerf?.totalSales || 0)}
                </div>
                <p className="text-xs text-muted-foreground">{myPerf?.closedCount || 0} negócios fechados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comissão</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {myPerfLoading ? '...' : formatCurrency(myPerf?.totalCommission || 0)}
                </div>
                <p className="text-xs text-muted-foreground">No período</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {myPerfLoading ? '...' : (myPerf?.activeContracts || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Em andamento</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
              <Link to="/crm/pipelines">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leads em Andamento</CardTitle>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {myPerfLoading ? '...' : (myPerf?.activeLeads || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Ver no pipeline →</p>
                </CardContent>
              </Link>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {myPerfLoading ? '...' : formatSeconds(myPerf?.avgResponseSeconds ?? null)}
                </div>
                <p className="text-xs text-muted-foreground">Médio no período</p>
              </CardContent>
            </Card>
          </div>

          {/* Meta Mensal + Gráfico */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Meta Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Meta Mensal
                  </CardTitle>
                  {myPerf?.streak != null && myPerf.streak > 0 && (
                    <div className="flex items-center gap-1 text-orange-500">
                      <Flame className="h-4 w-4" />
                      <span className="text-sm font-semibold">{myPerf.streak} {myPerf.streak === 1 ? 'mês' : 'meses'} consecutivos</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Meta atual</p>
                    {editingGoal ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          autoFocus
                          className="h-8 w-40 text-sm"
                          value={goalInput}
                          onChange={(e) => setGoalInput(e.target.value)}
                          placeholder="Ex: 500000"
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveGoal(); if (e.key === 'Escape') setEditingGoal(false); }}
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveGoal}>
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingGoal(false)}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold">{formatCurrency(myPerf?.currentGoal || 0)}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setGoalInput(String(myPerf?.currentGoal || '')); setEditingGoal(true); }}>
                          <Edit2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Progresso</p>
                    <p className="text-xl font-bold text-primary">{(myPerf?.goalProgress || 0).toFixed(0)}%</p>
                  </div>
                </div>
                <Progress value={myPerf?.goalProgress || 0} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(myPerf?.totalSales || 0)} vendido</span>
                  <span>{formatCurrency(Math.max(0, (myPerf?.currentGoal || 0) - (myPerf?.totalSales || 0)))} restante</span>
                </div>
              </CardContent>
            </Card>

            {/* Evolution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolução — Últimos 6 Meses</CardTitle>
                <CardDescription>Vendas da equipe vs sua meta mensal</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === 'vendas' ? 'Vendas' : 'Meta',
                      ]}
                    />
                    <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.meta > 0 && entry.vendas >= entry.meta
                            ? 'hsl(var(--primary))'
                            : 'hsl(var(--muted-foreground) / 0.5)'}
                        />
                      ))}
                    </Bar>
                    {chartData.some((d) => d.meta > 0) && (
                      <ReferenceLine
                        y={chartData.find((d) => d.meta > 0)?.meta}
                        stroke="hsl(var(--destructive))"
                        strokeDasharray="4 4"
                        label={{ value: 'Meta', position: 'right', fontSize: 11, fill: 'hsl(var(--destructive))' }}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            SEÇÃO 2 — RANKING DA EQUIPE (área pública)
        ════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Ranking da Equipe</h2>
          </div>

          {/* Team Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamAverages.totalLeads}</div>
                <p className="text-xs text-muted-foreground">No período selecionado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversão Média</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamAverages.avgConversionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Média da equipe</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMinutes(teamAverages.avgResponseTime)}</div>
                <p className="text-xs text-muted-foreground">Primeiro atendimento</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Vendas</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(teamAverages.totalSales)}</div>
                <p className="text-xs text-muted-foreground">Valor total fechado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comissões</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(teamAverages.totalCommissions)}</div>
                <p className="text-xs text-muted-foreground">Total em comissões</p>
              </CardContent>
            </Card>
          </div>

          {/* Ranking Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="h-5 w-5" />
                Ranking de Corretores
              </CardTitle>
              <CardDescription>
                {format(dateRange.from, "dd 'de' MMMM", { locale: ptBR })} -{' '}
                {format(dateRange.to, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando dados...</div>
              ) : brokers && brokers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Pos.</TableHead>
                      <TableHead>Corretor</TableHead>
                      <TableHead className="text-center">Conversão</TableHead>
                      <TableHead className="text-center">Tempo Médio</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Comissões</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brokers.map((broker, index) => (
                      <TableRow key={broker.userId}>
                        <TableCell className="font-medium">{getMedalIcon(index + 1)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={broker.avatarUrl || undefined} />
                              <AvatarFallback>{getInitials(broker.userName)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{broker.userName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              broker.conversionRate >= 30
                                ? 'default'
                                : broker.conversionRate >= 15
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {broker.conversionRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {formatMinutes(broker.avgResponseTimeMinutes)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(broker.totalSales)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(broker.totalCommissions)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum dado encontrado para o período selecionado
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
