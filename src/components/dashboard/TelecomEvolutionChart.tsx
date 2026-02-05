import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TelecomEvolutionPoint } from '@/hooks/use-telecom-dashboard-stats';

interface TelecomEvolutionChartProps {
  data: TelecomEvolutionPoint[];
  isLoading?: boolean;
}

const STATUS_CONFIG = {
  novos: { color: '#3B82F6', label: 'Novos' },
  instalados: { color: '#22C55E', label: 'Instalados' },
  aguardando: { color: '#EAB308', label: 'Aguardando' },
  em_analise: { color: '#8B5CF6', label: 'Em Análise' },
  cancelado: { color: '#EF4444', label: 'Cancelados' },
  suspenso: { color: '#F97316', label: 'Suspensos' },
  inadimplente: { color: '#DC2626', label: 'Inadimplentes' },
} as const;

export function TelecomEvolutionChart({ data, isLoading }: TelecomEvolutionChartProps) {
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolução de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolução de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px]">
          <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate which statuses have data
  const totals = data.reduce(
    (acc, item) => ({
      novos: acc.novos + item.novos,
      instalados: acc.instalados + item.instalados,
      aguardando: acc.aguardando + item.aguardando,
      em_analise: acc.em_analise + item.em_analise,
      cancelado: acc.cancelado + item.cancelado,
      suspenso: acc.suspenso + item.suspenso,
      inadimplente: acc.inadimplente + item.inadimplente,
    }),
    { novos: 0, instalados: 0, aguardando: 0, em_analise: 0, cancelado: 0, suspenso: 0, inadimplente: 0 }
  );

  const activeStatuses = (Object.keys(totals) as (keyof typeof totals)[]).filter(
    (key) => totals[key] > 0
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Evolução de Clientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 250 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                allowDecimals={false}
                width={30}
              />
              <Tooltip />
              <Legend />
              
              {activeStatuses.includes('instalados') && (
                <Line
                  type="monotone"
                  dataKey="instalados"
                  name={STATUS_CONFIG.instalados.label}
                  stroke={STATUS_CONFIG.instalados.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {activeStatuses.includes('novos') && (
                <Line
                  type="monotone"
                  dataKey="novos"
                  name={STATUS_CONFIG.novos.label}
                  stroke={STATUS_CONFIG.novos.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {activeStatuses.includes('aguardando') && (
                <Line
                  type="monotone"
                  dataKey="aguardando"
                  name={STATUS_CONFIG.aguardando.label}
                  stroke={STATUS_CONFIG.aguardando.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {activeStatuses.includes('em_analise') && (
                <Line
                  type="monotone"
                  dataKey="em_analise"
                  name={STATUS_CONFIG.em_analise.label}
                  stroke={STATUS_CONFIG.em_analise.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {activeStatuses.includes('cancelado') && (
                <Line
                  type="monotone"
                  dataKey="cancelado"
                  name={STATUS_CONFIG.cancelado.label}
                  stroke={STATUS_CONFIG.cancelado.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {activeStatuses.includes('suspenso') && (
                <Line
                  type="monotone"
                  dataKey="suspenso"
                  name={STATUS_CONFIG.suspenso.label}
                  stroke={STATUS_CONFIG.suspenso.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {activeStatuses.includes('inadimplente') && (
                <Line
                  type="monotone"
                  dataKey="inadimplente"
                  name={STATUS_CONFIG.inadimplente.label}
                  stroke={STATUS_CONFIG.inadimplente.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
