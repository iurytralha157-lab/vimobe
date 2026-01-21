import { AppLayout } from '@/components/layout/AppLayout';
import { FinancialCard } from '@/components/financial/FinancialCard';
import { useFinancialDashboard } from '@/hooks/use-financial';
import { formatCurrency } from '@/lib/export-financial';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function FinancialDashboard() {
  const { data, isLoading } = useFinancialDashboard();

  const pieData = [
    { name: 'Receitas', value: data?.receivable30 || 0, fill: 'hsl(var(--chart-1))' },
    { name: 'Despesas', value: data?.totalPayable || 0, fill: 'hsl(var(--chart-2))' },
  ].filter(d => d.value > 0);


  const chartConfig = {
    receitas: { label: 'Receitas', color: 'hsl(var(--success))' },
    despesas: { label: 'Despesas', color: 'hsl(var(--destructive))' },
  };
  
  const totalOverdue = (data?.overdueReceivables || 0) + (data?.overduePayables || 0);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <Skeleton className="h-8 w-48 md:w-64" />
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 md:h-32" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard Financeiro</h1>
          <p className="text-sm md:text-base text-muted-foreground">Visão geral das finanças</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <FinancialCard
            title="A Receber (30 dias)"
            value={formatCurrency(data?.receivable30 || 0)}
            icon={TrendingUp}
            variant="success"
          />
          <FinancialCard
            title="A Receber (60 dias)"
            value={formatCurrency(data?.receivable60 || 0)}
            icon={Calendar}
          />
          <FinancialCard
            title="A Pagar"
            value={formatCurrency(data?.totalPayable || 0)}
            icon={TrendingDown}
            variant="warning"
          />
          <FinancialCard
            title="Comissões Pendentes"
            value={formatCurrency(data?.pendingCommissions || 0)}
            icon={DollarSign}
          />
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <FinancialCard
            title="Comissões Previstas"
            value={formatCurrency(data?.forecastCommissions || 0)}
            icon={Clock}
          />
          <FinancialCard
            title="Comissões Pagas"
            value={formatCurrency(data?.paidCommissions || 0)}
            icon={CheckCircle2}
            variant="success"
          />
          <FinancialCard
            title="Vencidos"
            value={formatCurrency(totalOverdue)}
            icon={AlertTriangle}
            variant="destructive"
          />
          <FinancialCard
            title="A Receber (90 dias)"
            value={formatCurrency(data?.receivable90 || 0)}
            icon={Calendar}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 md:gap-6">
          {/* Monthly Cash Flow - Full Width */}
          <Card>
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="text-base md:text-lg">Fluxo de Caixa Mensal</CardTitle>
              <CardDescription className="text-xs md:text-sm">Receitas vs Despesas (últimos 6 meses)</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.monthlyData && data.monthlyData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[250px] md:h-[350px]">
                  <BarChart data={data.monthlyData}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <ChartTooltip 
                      content={<ChartTooltipContent />} 
                      formatter={(value) => formatCurrency(value as number)}
                    />
                    <Legend />
                    <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[250px] md:h-[350px] flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Revenue by Type */}
          <Card>
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="text-base md:text-lg">Receita por Tipo de Negócio</CardTitle>
              <CardDescription className="text-xs md:text-sm">Distribuição das receitas</CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[200px] md:h-[300px]">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={typeof window !== 'undefined' && window.innerWidth < 768 ? 60 : 100}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[200px] md:h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending vs Paid Comparison */}
          <Card>
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="text-base md:text-lg">Resumo Atual</CardTitle>
              <CardDescription className="text-xs md:text-sm">Valores pendentes vs pagos</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px] md:h-[300px]">
                <BarChart data={[
                  { name: 'A Receber', value: data?.receivable30 || 0, fill: 'hsl(var(--success))' },
                  { name: 'A Pagar', value: data?.totalPayable || 0, fill: 'hsl(var(--destructive))' },
                  { name: 'Comissões', value: data?.pendingCommissions || 0, fill: 'hsl(var(--primary))' },
                ]}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <ChartTooltip 
                    content={<ChartTooltipContent />} 
                    formatter={(value) => formatCurrency(value as number)}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
                Valores em Atraso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4">
                <div className="flex justify-between items-center p-2.5 md:p-3 bg-destructive/5 rounded-lg">
                  <span className="text-xs md:text-sm">A Receber Vencido</span>
                  <span className="font-bold text-destructive text-sm md:text-base">{formatCurrency(data?.overdueReceivables || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 md:p-3 bg-destructive/5 rounded-lg">
                  <span className="text-xs md:text-sm">A Pagar Vencido</span>
                  <span className="font-bold text-destructive text-sm md:text-base">{formatCurrency(data?.overduePayables || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                Resumo de Comissões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4">
                <div className="flex justify-between items-center p-2.5 md:p-3 bg-muted/50 rounded-lg">
                  <span className="text-xs md:text-sm">Previstas</span>
                  <span className="font-bold text-sm md:text-base">{formatCurrency(data?.forecastCommissions || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 md:p-3 bg-success/10 rounded-lg">
                  <span className="text-xs md:text-sm">Pagas</span>
                  <span className="font-bold text-success text-sm md:text-base">{formatCurrency(data?.paidCommissions || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
