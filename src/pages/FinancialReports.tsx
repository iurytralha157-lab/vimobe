import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useFinancialEntries, useFinancialDashboard } from '@/hooks/use-financial';
import { useCommissionsByBroker } from '@/hooks/use-commissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { SimplePeriodFilter } from '@/components/ui/date-filter-popover';
import { 
  formatCurrency, 
  formatDate, 
  exportToExcel, 
  exportToCSV,
  prepareFinancialEntriesExport, 
} from '@/lib/export-financial';
import { 
  FileText, 
  Download, 
  BarChart3, 
  DollarSign, 
  Building2,
  Users,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { toast } from 'sonner';

const periodOptions = [
  { value: 'current', label: 'Mês Atual' },
  { value: 'last', label: 'Mês Anterior' },
  { value: 'quarter', label: 'Últimos 3 meses' },
];

type ReportType = 'monthly' | 'cashflow' | 'commissions' | 'property' | 'payments' | 'overdue';

interface ReportConfig {
  id: ReportType;
  title: string;
  description: string;
  icon: typeof FileText;
}

const reports: ReportConfig[] = [
  { id: 'monthly', title: 'Fechamento Mensal', description: 'Resumo de receitas e despesas do mês', icon: BarChart3 },
  { id: 'cashflow', title: 'Fluxo de Caixa', description: 'Entradas e saídas por período', icon: TrendingUp },
  { id: 'commissions', title: 'Comissões por Corretor', description: 'Ranking de corretores por comissões', icon: Users },
  { id: 'property', title: 'Receita por Imóvel', description: 'Performance financeira dos imóveis', icon: Building2 },
  { id: 'payments', title: 'Pagamentos Realizados', description: 'Histórico de pagamentos efetuados', icon: DollarSign },
  { id: 'overdue', title: 'Pendências Financeiras', description: 'Contas vencidas e pendentes', icon: AlertTriangle },
];

// Mobile Entry Card
function EntryCardMobile({ entry }: { entry: any }) {
  return (
    <div className="p-3 border-b last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{entry.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={entry.type === 'receivable' ? 'default' : 'secondary'} className="text-xs">
              {entry.type === 'receivable' ? 'Receita' : 'Despesa'}
            </Badge>
            <span className={`text-xs ${entry.status === 'paid' ? 'text-success' : entry.status === 'overdue' ? 'text-destructive' : 'text-warning'}`}>
              {entry.status === 'paid' ? 'Pago' : entry.status === 'overdue' ? 'Vencido' : 'Pendente'}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-sm">{formatCurrency(entry.value)}</p>
          <p className="text-xs text-muted-foreground">{formatDate(entry.due_date)}</p>
        </div>
      </div>
    </div>
  );
}

// Mobile Commission Card
function CommissionCardMobile({ broker }: { broker: any }) {
  return (
    <div className="p-3 border-b last:border-b-0">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">{broker.user.name}</p>
        <p className="font-bold text-sm">{formatCurrency(broker.total)}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div>
          <p className="text-xs text-muted-foreground">Previsão</p>
          <p className="text-xs font-medium">{formatCurrency(broker.forecast)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Aprovadas</p>
          <p className="text-xs font-medium text-warning">{formatCurrency(broker.approved)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Pagas</p>
          <p className="text-xs font-medium text-success">{formatCurrency(broker.paid)}</p>
        </div>
      </div>
    </div>
  );
}

export default function FinancialReports() {
  const isMobile = useIsMobile();
  const [selectedReport, setSelectedReport] = useState<ReportType>('monthly');
  const [period, setPeriod] = useState('current');

  const { data: entries, isLoading: entriesLoading } = useFinancialEntries();
  const { data: dashboard } = useFinancialDashboard();
  const { data: commissionsByBroker, isLoading: commissionsLoading } = useCommissionsByBroker();

  const getPeriodDates = () => {
    const now = new Date();
    switch (period) {
      case 'current':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last':
        return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case 'quarter':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start, end } = getPeriodDates();

  const filteredEntries = entries?.filter(e => {
    const date = new Date(e.due_date);
    return date >= start && date <= end;
  }) || [];

  const receivables = filteredEntries.filter(e => e.type === 'receivable');
  const payables = filteredEntries.filter(e => e.type === 'payable');
  const paidEntries = filteredEntries.filter(e => e.status === 'paid');
  const overdueEntries = entries?.filter(e => e.status === 'overdue' || (e.status === 'pending' && new Date(e.due_date) < new Date())) || [];

  const totalReceivables = receivables.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalPayables = payables.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalPaid = paidEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalOverdue = overdueEntries.reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleExportExcel = () => {
    let data: any[] = [];
    let filename = '';

    switch (selectedReport) {
      case 'monthly':
      case 'cashflow':
      case 'payments':
      case 'overdue':
        data = prepareFinancialEntriesExport(
          selectedReport === 'overdue' ? overdueEntries : 
          selectedReport === 'payments' ? paidEntries : 
          filteredEntries
        );
        filename = `${selectedReport}-${format(start, 'yyyy-MM')}`;
        break;
      case 'commissions':
        data = commissionsByBroker?.map(b => ({
          Corretor: b.user.name,
          'Total Comissões': formatCurrency(b.total),
          'Previsão': formatCurrency(b.forecast),
          'Aprovadas': formatCurrency(b.approved),
          'Pagas': formatCurrency(b.paid),
        })) || [];
        filename = `comissoes-corretores-${format(new Date(), 'yyyy-MM')}`;
        break;
      default:
        data = prepareFinancialEntriesExport(filteredEntries);
        filename = `relatorio-${format(new Date(), 'yyyy-MM-dd')}`;
    }

    if (!data.length) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    exportToExcel(data, filename);
    toast.success('Relatório exportado com sucesso');
  };

  const handleExportCSV = () => {
    let data: any[] = [];
    let filename = '';

    switch (selectedReport) {
      case 'commissions':
        data = commissionsByBroker?.map(b => ({
          Corretor: b.user.name,
          'Total Comissões': b.total,
          'Previsão': b.forecast,
          'Aprovadas': b.approved,
          'Pagas': b.paid,
        })) || [];
        filename = `comissoes-corretores-${format(new Date(), 'yyyy-MM')}`;
        break;
      default:
        data = prepareFinancialEntriesExport(
          selectedReport === 'overdue' ? overdueEntries : 
          selectedReport === 'payments' ? paidEntries : 
          filteredEntries
        );
        filename = `${selectedReport}-${format(start, 'yyyy-MM')}`;
    }

    if (!data.length) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    exportToCSV(data, filename);
    toast.success('Relatório exportado com sucesso');
  };

  const renderReportContent = () => {
    const isLoading = entriesLoading || commissionsLoading;

    if (isLoading) {
      return (
        <div className="space-y-3 md:space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
        </div>
      );
    }

    switch (selectedReport) {
      case 'monthly':
        return (
          <div className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <Card>
                <CardContent className="p-3 md:p-4">
                  <p className="text-xs md:text-sm text-muted-foreground">Total a Receber</p>
                  <p className="text-lg md:text-2xl font-bold text-success">{formatCurrency(totalReceivables)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 md:p-4">
                  <p className="text-xs md:text-sm text-muted-foreground">Total a Pagar</p>
                  <p className="text-lg md:text-2xl font-bold text-destructive">{formatCurrency(totalPayables)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 md:p-4">
                  <p className="text-xs md:text-sm text-muted-foreground">Saldo</p>
                  <p className={`text-lg md:text-2xl font-bold ${totalReceivables - totalPayables >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(totalReceivables - totalPayables)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {isMobile ? (
              <Card>
                <CardContent className="p-0">
                  {filteredEntries.slice(0, 20).map((entry) => (
                    <EntryCardMobile key={entry.id} entry={entry} />
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.slice(0, 20).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>
                        <span className={entry.type === 'receivable' ? 'text-success' : 'text-destructive'}>
                          {entry.type === 'receivable' ? 'Receita' : 'Despesa'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(entry.amount)}</TableCell>
                      <TableCell>{formatDate(entry.due_date)}</TableCell>
                      <TableCell>
                        <span className={`text-sm ${entry.status === 'paid' ? 'text-success' : entry.status === 'overdue' ? 'text-destructive' : 'text-warning'}`}>
                          {entry.status === 'paid' ? 'Pago' : entry.status === 'overdue' ? 'Vencido' : 'Pendente'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        );

      case 'commissions':
        return isMobile ? (
          <Card>
            <CardContent className="p-0">
              {commissionsByBroker?.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Nenhuma comissão encontrada
                </div>
              ) : (
                commissionsByBroker?.map((broker) => (
                  <CommissionCardMobile key={broker.user.id} broker={broker} />
                ))
              )}
            </CardContent>
          </Card>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Corretor</TableHead>
                <TableHead className="text-right">Total Comissões</TableHead>
                <TableHead className="text-right">Previsão</TableHead>
                <TableHead className="text-right">Aprovadas</TableHead>
                <TableHead className="text-right">Pagas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissionsByBroker?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma comissão encontrada
                  </TableCell>
                </TableRow>
              ) : (
                commissionsByBroker?.map((broker) => (
                  <TableRow key={broker.user.id}>
                    <TableCell className="font-medium">{broker.user.name}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(broker.total)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(broker.forecast)}</TableCell>
                    <TableCell className="text-right text-warning">{formatCurrency(broker.approved)}</TableCell>
                    <TableCell className="text-right text-success">{formatCurrency(broker.paid)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        );

      case 'payments':
        return isMobile ? (
          <Card>
            <CardContent className="p-0">
              {paidEntries.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Nenhum pagamento no período
                </div>
              ) : (
                paidEntries.map((entry) => (
                  <EntryCardMobile key={entry.id} entry={entry} />
                ))
              )}
            </CardContent>
          </Card>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor Pago</TableHead>
                <TableHead>Data Pagamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paidEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum pagamento no período
                  </TableCell>
                </TableRow>
              ) : (
                paidEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>
                      <span className={entry.type === 'receivable' ? 'text-success' : 'text-destructive'}>
                        {entry.type === 'receivable' ? 'Recebimento' : 'Pagamento'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(entry.amount)}</TableCell>
                    <TableCell>{formatDate(entry.paid_date)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        );

      case 'overdue':
        return (
          <div className="space-y-4">
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="p-3 md:p-4">
                <p className="text-xs md:text-sm text-destructive">Total em Atraso</p>
                <p className="text-xl md:text-3xl font-bold text-destructive">{formatCurrency(totalOverdue)}</p>
                <p className="text-xs md:text-sm text-muted-foreground">{overdueEntries.length} lançamentos</p>
              </CardContent>
            </Card>

            {isMobile ? (
              <Card>
                <CardContent className="p-0">
                  {overdueEntries.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      Nenhuma pendência encontrada
                    </div>
                  ) : (
                    overdueEntries.map((entry) => (
                      <EntryCardMobile key={entry.id} entry={entry} />
                    ))
                  )}
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Pessoa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma pendência encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    overdueEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell>
                          <span className={entry.type === 'receivable' ? 'text-success' : 'text-destructive'}>
                            {entry.type === 'receivable' ? 'Receber' : 'Pagar'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">{formatCurrency(entry.amount)}</TableCell>
                        <TableCell className="text-destructive">{formatDate(entry.due_date)}</TableCell>
                        <TableCell>{entry.category || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center py-12 text-muted-foreground">
            Selecione um relatório para visualizar
          </div>
        );
    }
  };

  const selectedReportConfig = reports.find(r => r.id === selectedReport);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Relatórios Financeiros</h1>
          <p className="text-sm text-muted-foreground">Análises e exportações de dados financeiros</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Report Selection */}
          {isMobile ? (
            <Select value={selectedReport} onValueChange={(value) => setSelectedReport(value as ReportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reports.map((report) => (
                  <SelectItem key={report.id} value={report.id}>
                    <div className="flex items-center gap-2">
                      <report.icon className="h-4 w-4" />
                      {report.title}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-2">
              {reports.map((report) => (
                <Card 
                  key={report.id}
                  className={`cursor-pointer transition-all ${
                    selectedReport === report.id 
                      ? 'border-primary bg-accent/50' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedReport(report.id)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <report.icon className={`h-5 w-5 ${selectedReport === report.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-medium text-sm">{report.title}</p>
                      <p className="text-xs text-muted-foreground">{report.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Report Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 md:pb-4">
                <div>
                  <CardTitle className="text-base md:text-lg">{selectedReportConfig?.title}</CardTitle>
                  <CardDescription className="text-xs md:text-sm">{selectedReportConfig?.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <SimplePeriodFilter
                    value={period}
                    onChange={setPeriod}
                    options={periodOptions}
                  />
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">CSV</span>
                  </Button>
                  <Button size="sm" onClick={handleExportExcel}>
                    <Download className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">Excel</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {renderReportContent()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
