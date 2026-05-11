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
  Compass,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ArchitectureDashboard() {
  const projects = [
    { id: 1, name: 'Residencial Alpha', architect: 'Ricardo Silva', deadline: '20/05/2026', status: 'Plantas em Revisão', progress: 65 },
    { id: 2, name: 'Sobrado Lote 45', architect: 'Ana Oliveira', deadline: '12/06/2026', status: 'Cálculo Estrutural', progress: 40 },
    { id: 3, name: 'Reforma Comercial J&M', architect: 'Ricardo Silva', deadline: '05/05/2026', status: 'Aprovado Prefeitura', progress: 100 },
  ];

  const protocols = [
    { id: '2026-001', project: 'Residencial Alpha', agency: 'Prefeitura Municipal', days: 15, status: 'Em análise' },
    { id: '2026-005', project: 'Condomínio Solar', agency: 'Corpo de Bombeiros', days: 42, status: 'Atrasado' },
    { id: '2025-998', project: 'Studio Bela Vista', agency: 'Vigilância Sanitária', days: 5, status: 'Deferido' },
  ];

  return (
    <AppLayout title="Dashboard de Arquitetura">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Projetos Ativos" value="8" icon={Compass} color="text-blue-600" />
          <StatCard title="Protocolos Abertos" value="5" icon={FileText} color="text-orange-600" />
          <StatCard title="SLA Aprovação" value="22 dias" icon={Clock} color="text-purple-600" />
          <StatCard title="Revisões Pendentes" value="3" icon={AlertCircle} color="text-red-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Projetos em Andamento */}
          <Card>
            <CardHeader>
              <CardTitle>Projetos em Andamento</CardTitle>
              <CardDescription>Fluxo de criação e detalhamento técnico</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                 {projects.map((p) => (
                   <div key={p.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-sm">{p.name}</h4>
                          <p className="text-[11px] text-muted-foreground">Arquiteto: {p.architect} | Entrega: {p.deadline}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{p.status}</Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="bg-blue-600 h-full transition-all" style={{ width: `${p.progress}%` }} />
                      </div>
                   </div>
                 ))}
              </div>
            </CardContent>
          </Card>

          {/* Protocolos Prefeitura */}
          <Card>
            <CardHeader>
              <CardTitle>Protocolos e Alvarás</CardTitle>
              <CardDescription>Monitoramento de liberações legais</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                   <thead>
                      <tr className="text-left text-[10px] uppercase font-bold text-slate-500 border-b">
                        <th className="pb-3">Projeto</th>
                        <th className="pb-3 text-right">Dias</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y">
                      {protocols.map((pt) => (
                        <tr key={pt.id}>
                          <td className="py-3">
                            <p className="font-medium text-xs">{pt.project}</p>
                            <p className="text-[10px] text-slate-400">{pt.id} - {pt.agency}</p>
                          </td>
                          <td className={`py-3 text-right text-xs font-bold ${pt.days > 30 ? 'text-red-500' : 'text-slate-600'}`}>
                            {pt.days}
                          </td>
                          <td className="py-3 text-right">
                             <Badge variant="outline" className="text-[10px]">{pt.status}</Badge>
                          </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Repositório de Plantas Aprovadas */}
        <Card>
          <CardHeader>
            <CardTitle>Últimas Plantas Entregues</CardTitle>
            <CardDescription>Versões finais aprovadas e liberadas para obra</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FileItem name="Executivo_V2_Alpha.pdf" date="há 2 dias" size="12 MB" />
                <FileItem name="Eletrico_Lote45_FINAL.dwg" date="há 1 semana" size="8 MB" />
                <FileItem name="Hidraulico_Solar_Rev04.pdf" date="há 2 semanas" size="15 MB" />
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

function FileItem({ name, date, size }: { name: string, date: string, size: string }) {
  return (
    <div className="p-3 border rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-3">
       <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
          <FileText className="h-5 w-5 text-red-600" />
       </div>
       <div className="min-w-0">
          <p className="text-xs font-bold truncate">{name}</p>
          <p className="text-[10px] text-muted-foreground">{date} • {size}</p>
       </div>
    </div>
  );
}
