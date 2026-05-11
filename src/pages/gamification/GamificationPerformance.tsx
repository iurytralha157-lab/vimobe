import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { 
  TrendingUp, 
  Zap, 
  Target, 
  Users, 
  Clock, 
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

const data = [
  { name: 'Seg', pontos: 400, acoes: 24 },
  { name: 'Ter', pontos: 300, acoes: 18 },
  { name: 'Qua', pontos: 200, acoes: 12 },
  { name: 'Qui', pontos: 278, acoes: 20 },
  { name: 'Sex', pontos: 189, acoes: 15 },
  { name: 'Sáb', pontos: 239, acoes: 10 },
  { name: 'Dom', pontos: 349, acoes: 5 },
];

export default function GamificationPerformance() {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Inteligência de Performance</h2>
        <p className="text-muted-foreground">Análise detalhada de produtividade e métricas comerciais.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Eficiência</p>
                <h3 className="text-2xl font-bold">87%</h3>
                <p className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3" /> +12% vs mês ant.
                </p>
              </div>
              <div className="bg-emerald-500 p-2 rounded-lg">
                <Target className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Ações/Dia</p>
                <h3 className="text-2xl font-bold">42.5</h3>
                <p className="text-[10px] text-blue-600 flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3" /> +5% vs mês ant.
                </p>
              </div>
              <div className="bg-blue-500 p-2 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wider">Conversão</p>
                <h3 className="text-2xl font-bold">14.2%</h3>
                <p className="text-[10px] text-orange-600 flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3" /> +2.1% vs mês ant.
                </p>
              </div>
              <div className="bg-orange-500 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-500/20 bg-indigo-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Consistência</p>
                <h3 className="text-2xl font-bold">94%</h3>
                <p className="text-[10px] text-indigo-600 flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3" /> Estável
                </p>
              </div>
              <div className="bg-indigo-500 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart className="h-4 w-4 text-primary" />
              Evolução de Pontos (Semana)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="pontos" stroke="#6366f1" fillOpacity={1} fill="url(#colorPoints)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Volume de Ações Operacionais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="acoes" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Distribuição por Departamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Vendas', value: 65, color: 'bg-indigo-500' },
              { label: 'Prospecção', value: 25, color: 'bg-emerald-500' },
              { label: 'Pós-Venda', value: 10, color: 'bg-orange-500' },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}