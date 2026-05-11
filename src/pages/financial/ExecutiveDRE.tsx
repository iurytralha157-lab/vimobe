import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileSpreadsheet, 
  Loader2,
  HardHat,
  Filter
} from 'lucide-react';
import { useDREExecutive } from '@/hooks/use-dre-executive';
import { useConstructionProjects } from '@/hooks/use-construction';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { exportToExcel } from '@/lib/export-financial';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function ExecutiveDRE() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  
  const { data: projects } = useConstructionProjects();
  
  const [year, month] = selectedMonth.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const startDate = startOfMonth(date);
  const endDate = endOfMonth(date);

  const { data: dreData, isLoading: dreLoading } = useDREExecutive({
    startDate,
    endDate,
    regime: 'cash',
    compareWithPrevious: true,
    projectId: selectedProjectId === 'all' ? undefined : selectedProjectId
  });

  const handleExportExcel = async () => {
    if (!dreData) return;
    
    const exportData = dreData.lines.map(line => ({
      'Descrição': line.name,
      'Valor Atual': line.value,
      'Valor Anterior': line.previousValue || 0,
      'Variação %': line.variation?.toFixed(2) || '0.00'
    }));

    await exportToExcel(exportData, `DRE_Executivo_${selectedMonth}`);
    toast.success('DRE exportado com sucesso!');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return {
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy', { locale: ptBR })
    };
  });

  return (
    <AppLayout title="DRE Executivo - Visão Enterprise">
      <div className="space-y-6">
        {/* Header com Filtros */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
           <div className="flex flex-wrap items-center gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Mês de Referência</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Filtrar por Obra</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="w-[220px] h-9">
                    <HardHat className="h-3.5 w-3.5 mr-2 text-orange-500" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Obras</SelectItem>
                    {projects?.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
           </div>

           <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-9">
                <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
                Exportar Excel
              </Button>
           </div>
        </div>

        {dreLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : dreData ? (
          <>
            {/* Cards de Resumo Executivo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard 
                title="EBITDA" 
                value={dreData.totals.ebitda} 
                subValue="Resultado Operacional"
                trend={dreData.totals.ebitda >= 0 ? 'up' : 'down'}
              />
              <SummaryCard 
                title="Receita" 
                value={dreData.totals.grossRevenue} 
                subValue="Vendas e Recebimentos"
              />
              <SummaryCard 
                title="Custo Variável" 
                value={dreData.totals.variableCosts} 
                subValue="Materiais e Mão de Obra"
                variant="negative"
              />
              <SummaryCard 
                title="Custo Fixo" 
                value={dreData.totals.fixedCosts} 
                subValue="Despesas Administrativas"
                variant="negative"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard 
                title="Receita Líquida" 
                value={dreData.totals.netRevenue} 
                subValue="Após Deduções/Impostos"
              />
              <SummaryCard 
                title="Lucro Bruto" 
                value={dreData.totals.grossProfit} 
                subValue="Margem de Contribuição"
              />
              <SummaryCard 
                title="Resultado" 
                value={dreData.totals.netResult} 
                subValue="Lucro/Prejuízo Líquido"
                variant={dreData.totals.netResult >= 0 ? 'positive' : 'negative'}
              />
              <SummaryCard 
                title="ROI Geral" 
                value={(dreData.totals.roi * 100)} 
                isPercent
                subValue="Retorno sobre Investimento"
                variant="info"
              />
            </div>

            {/* Gráfico de Composição */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Fluxo de Resultados</CardTitle>
                  <CardDescription>Composição de Receita vs Custos no período</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dreData.lines}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                      <YAxis hide />
                      <Tooltip 
                        formatter={(val: number) => formatCurrency(val)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60}>
                        {dreData.lines.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.type === 'revenue' ? '#10b981' : entry.type === 'expense' ? '#ef4444' : '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Análise de Margem</CardTitle>
                  <CardDescription>Performance relativa</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-[300px] space-y-6">
                   <div className="relative h-40 w-40 flex items-center justify-center rounded-full border-8 border-slate-100">
                      <div className="text-center">
                        <p className="text-3xl font-black text-blue-600">
                          {((dreData.totals.ebitda / (dreData.totals.grossRevenue || 1)) * 100).toFixed(1)}%
                        </p>
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Margem Líquida</p>
                      </div>
                      <div 
                        className="absolute inset-0 rounded-full border-8 border-blue-500 border-t-transparent border-l-transparent rotate-45"
                        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
                      />
                   </div>
                   <div className="w-full space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ponto de Equilíbrio</span>
                        <span className="font-bold">Atingido</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[100%]" />
                      </div>
                   </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela Detalhada */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Demonstrativo Detalhado</CardTitle>
                  <CardDescription>Valores comparativos com o mês anterior</CardDescription>
                </div>
                <Badge variant="secondary">Regime de Caixa</Badge>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-[10px] uppercase font-bold text-slate-500 border-b">
                        <th className="pb-3 px-2">Descrição</th>
                        <th className="pb-3 px-2 text-right">Valor Atual</th>
                        <th className="pb-3 px-2 text-right">Valor Anterior</th>
                        <th className="pb-3 px-2 text-right">Variação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dreData.lines.map((line) => (
                        <tr key={line.id} className={`hover:bg-slate-50 transition-colors ${line.isTotal ? 'bg-slate-50/50 font-bold' : ''}`}>
                          <td className="py-4 px-2 text-sm">{line.name}</td>
                          <td className={`py-4 px-2 text-right text-sm tabular-nums ${line.type === 'expense' ? 'text-red-500' : line.type === 'revenue' ? 'text-emerald-600' : ''}`}>
                            {formatCurrency(line.value)}
                          </td>
                          <td className="py-4 px-2 text-right text-sm text-slate-400 tabular-nums">
                            {line.previousValue ? formatCurrency(line.previousValue) : '-'}
                          </td>
                          <td className="py-4 px-2 text-right text-sm">
                            <div className="flex items-center justify-end gap-1">
                               {line.variation && line.variation > 0 ? (
                                 <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                               ) : line.variation && line.variation < 0 ? (
                                 <ArrowDownRight className="h-3 w-3 text-red-500" />
                               ) : null}
                               <span className={line.variation && line.variation > 0 ? 'text-emerald-600' : 'text-red-500'}>
                                  {line.variation ? `${line.variation.toFixed(1)}%` : '-'}
                                </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
            Nenhum dado financeiro encontrado para o período selecionado.
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function SummaryCard({ title, value, subValue, trend, isPercent = false, variant = 'default' }: any) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getColors = () => {
    switch (variant) {
      case 'negative': return 'text-red-600';
      case 'positive': return 'text-emerald-600';
      case 'info': return 'text-blue-600';
      default: return 'text-slate-900';
    }
  };

  return (
    <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{title}</p>
          {trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
        </div>
        <h3 className={`text-2xl font-black ${getColors()}`}>
          {isPercent ? `${value.toFixed(1)}%` : formatCurrency(value)}
        </h3>
        <p className="text-[10px] text-slate-500 mt-1 font-medium italic">{subValue}</p>
      </CardContent>
    </Card>
  );
}
