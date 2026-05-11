import { AppLayout } from "@/components/layout/AppLayout";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { 
  Loader2, 
  ShoppingCart,
  Package,
  Truck,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';

export default function PurchaseDashboard() {
  const supplies = [
    { obra: 'Residencial Alpha', material: 'Cimento CP II', qtd: '50 sacos', status: 'delivered', date: '10/05' },
    { obra: 'Residencial Alpha', material: 'Aço CA-50 10mm', qtd: '200kg', status: 'pending', date: '15/05' },
    { obra: 'Sobrado Lote 45', material: 'Bloco Cerâmico', qtd: '3000 un', status: 'partial', date: '12/05' },
  ];

  const costsData = [
    { name: 'Alpha', value: 12500 },
    { name: 'Lote 45', value: 8900 },
    { name: 'Bela Vista', value: 4500 },
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  return (
    <AppLayout title="Dashboard de Compras">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Pedidos Abertos" value="14" icon={ShoppingCart} color="text-blue-600" />
          <StatCard title="Aguardando Entrega" value="6" icon={Truck} color="text-orange-600" />
          <StatCard title="Custo do Mês" value="R$ 42.5k" icon={DollarSign} color="text-emerald-600" />
          <StatCard title="Urgências" value="2" icon={AlertTriangle} color="text-red-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Custos por Obra */}
          <Card>
            <CardHeader>
              <CardTitle>Custos de Suprimentos por Obra</CardTitle>
              <CardDescription>Acumulado de pedidos de compra (Mês atual)</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                      {costsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Últimas Entregas */}
          <Card>
            <CardHeader>
              <CardTitle>Status de Entregas</CardTitle>
              <CardDescription>Acompanhamento de logística</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                  {supplies.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                       <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{s.material}</p>
                          <p className="text-[10px] text-muted-foreground">{s.obra} | {s.qtd}</p>
                       </div>
                       <div className="text-right">
                          <Badge variant="outline" className={`text-[9px] mb-1 ${s.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' : s.status === 'partial' ? 'bg-amber-50 text-amber-700' : ''}`}>
                             {s.status === 'delivered' ? 'Entregue' : s.status === 'partial' ? 'Parcial' : 'Pendente'}
                          </Badge>
                          <p className="text-[9px] text-slate-400">Prev. {s.date}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Planejamento de Compras (Lead Time) */}
        <Card>
          <CardHeader>
            <CardTitle>Necessidades Próximos 15 dias</CardTitle>
            <CardDescription>Materiais vinculados a milestones de engenharia</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="overflow-x-auto">
                <table className="w-full">
                   <thead>
                      <tr className="text-left text-[10px] uppercase font-bold text-slate-500 border-b">
                        <th className="pb-3 px-2">Obra</th>
                        <th className="pb-3 px-2">Material</th>
                        <th className="pb-3 px-2 text-right">Data Necessidade</th>
                        <th className="pb-3 px-2 text-right">Deadline Compra</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y text-xs">
                      <tr>
                        <td className="py-3 px-2 font-medium">Residencial Alpha</td>
                        <td className="py-3 px-2">Concreto Usinado (20m3)</td>
                        <td className="py-3 px-2 text-right">25/05/2026</td>
                        <td className="py-3 px-2 text-right font-bold text-orange-600">18/05/2026</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-medium">Residencial Alpha</td>
                        <td className="py-3 px-2">Madeira para Caixaria</td>
                        <td className="py-3 px-2 text-right">20/05/2026</td>
                        <td className="py-3 px-2 text-right font-bold text-red-600">IMEDIATO</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-medium">Sobrado Lote 45</td>
                        <td className="py-3 px-2">Tubos e Conexões Tigre</td>
                        <td className="py-3 px-2 text-right">02/06/2026</td>
                        <td className="py-3 px-2 text-right text-emerald-600">25/05/2026</td>
                      </tr>
                   </tbody>
                </table>
             </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="shadow-sm border-none bg-white">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-slate-50`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
            <h3 className={`text-xl font-black ${color}`}>{value}</h3>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
