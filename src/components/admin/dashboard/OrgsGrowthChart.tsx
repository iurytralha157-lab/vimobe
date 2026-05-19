import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  data?: Array<{ date: string; created: number; trial: number; cancelled: number }>;
  loading?: boolean;
}

export function OrgsGrowthChart({ data = [], loading }: Props) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Crescimento de organizações</CardTitle>
        <p className="text-xs text-muted-foreground">Cadastros, trials e cancelamentos por dia</p>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-[260px] w-full rounded-xl" /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), 'dd/MM', { locale: ptBR })} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={30} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="created" stackId="a" name="Novos" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
              <Bar dataKey="trial" stackId="a" name="Trial" fill="hsl(187 85% 40%)" radius={[6,6,0,0]} />
              <Bar dataKey="cancelled" name="Cancelados" fill="hsl(0 70% 55%)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
