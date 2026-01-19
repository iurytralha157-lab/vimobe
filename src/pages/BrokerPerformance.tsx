import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBrokerPerformance, useTeamAverages } from "@/hooks/use-broker-performance";
import type { BrokerPerformance as BrokerPerformanceData } from "@/hooks/use-broker-performance";
import { SimplePeriodFilter } from "@/components/ui/date-filter-popover";
import { Download, TrendingUp, Clock, Target, DollarSign, Users, Medal } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";

type PeriodType = 'month' | 'quarter' | 'year';

const periodOptions = [
  { value: 'month', label: 'Este mês' },
  { value: 'quarter', label: 'Este trimestre' },
  { value: 'year', label: 'Este ano' },
];


export default function BrokerPerformance() {
  const [period, setPeriod] = useState<PeriodType>('month');

  const getDateRange = (periodType: PeriodType) => {
    const now = new Date();
    switch (periodType) {
      case 'month':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'quarter':
        return { from: startOfQuarter(now), to: endOfQuarter(now) };
      case 'year':
        return { from: startOfYear(now), to: endOfYear(now) };
    }
  };

  const dateRange = getDateRange(period);
  const { data: brokers, isLoading } = useBrokerPerformance(dateRange);
  const teamAverages = useTeamAverages(dateRange);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatTime = (minutes: number | null) => {
    if (minutes === null) return '-';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Medal className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-700" />;
      default:
        return <span className="text-muted-foreground">{position}º</span>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleExport = () => {
    if (!brokers) return;

    const exportData = brokers.map((broker, index) => ({
      'Posição': index + 1,
      'Corretor': broker.userName,
      'Leads Atribuídos': broker.totalLeads,
      'Leads Fechados': broker.closedLeads,
      'Taxa de Conversão (%)': broker.conversionRate.toFixed(1),
      'Tempo Médio Atendimento (min)': broker.avgResponseTimeMinutes?.toFixed(0) || '-',
      'Vendas (R$)': broker.totalSales,
      'Comissões (R$)': broker.totalCommissions,
      'Leads Ativos': broker.activeLeads
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Performance");
    XLSX.writeFile(wb, `performance-corretores-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <AppLayout title="Performance de Corretores">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-muted-foreground">
              Acompanhe o desempenho da sua equipe de vendas
            </p>
          </div>
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

        {/* Team Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamAverages.totalLeads}</div>
              <p className="text-xs text-muted-foreground">
                No período selecionado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversão Média</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamAverages.avgConversionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Média da equipe
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(teamAverages.avgResponseTime)}</div>
              <p className="text-xs text-muted-foreground">
                Primeiro atendimento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vendas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(teamAverages.totalSales)}</div>
              <p className="text-xs text-muted-foreground">
                Valor total fechado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissões</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(teamAverages.totalCommissions)}</div>
              <p className="text-xs text-muted-foreground">
                Total em comissões
              </p>
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
              {format(dateRange.from, "dd 'de' MMMM", { locale: ptBR })} - {format(dateRange.to, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando dados...
              </div>
            ) : brokers && brokers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Pos.</TableHead>
                    <TableHead>Corretor</TableHead>
                    <TableHead className="text-center">Leads</TableHead>
                    <TableHead className="text-center">Conversão</TableHead>
                    <TableHead className="text-center">Tempo Médio</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Comissões</TableHead>
                    <TableHead className="text-center">Ativos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brokers.map((broker, index) => (
                    <TableRow key={broker.userId}>
                      <TableCell className="font-medium">
                        {getMedalIcon(index + 1)}
                      </TableCell>
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
                        <Badge variant="secondary">
                          {broker.totalLeads}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={broker.conversionRate >= 30 ? "default" : broker.conversionRate >= 15 ? "secondary" : "outline"}
                        >
                          {broker.conversionRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {formatTime(broker.avgResponseTimeMinutes)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(broker.totalSales)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(broker.totalCommissions)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {broker.activeLeads}
                        </Badge>
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
    </AppLayout>
  );
}
