import { AppLayout } from "@/components/layout/AppLayout";
import { useConstructionProjects } from "@/hooks/use-construction";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { 
  Loader2, 
  HardHat,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { 
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Badge } from "@/components/ui/badge";

export default function EngineeringDashboard() {
  const { data: projects, isLoading } = useConstructionProjects();

  const mockSData = [
    { name: 'Mês 1', previsto: 5, realizado: 4 },
    { name: 'Mês 2', previsto: 15, realizado: 12 },
    { name: 'Mês 3', previsto: 30, realizado: 28 },
    { name: 'Mês 4', previsto: 45, realizado: 42 },
    { name: 'Mês 5', previsto: 60, realizado: 58 },
    { name: 'Mês 6', previsto: 75, realizado: 70 },
  ];

  if (isLoading) {
    return (
      <AppLayout title="Dashboard de Engenharia">
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard de Engenharia">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Obras a Iniciar" value="2" icon={Calendar} color="text-blue-600" />
          <StatCard title="Em Execução" value={projects?.filter(p => p.status === 'in_progress' || p.status === 'active').length || 0} icon={HardHat} color="text-orange-600" />
          <StatCard title="Projetos Técnicos" value="12" icon={Layers} color="text-purple-600" />
          <StatCard title="Atraso Médio" value="2 dias" icon={AlertTriangle} color="text-red-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Curva S */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Curva S (Previsto vs Realizado)</CardTitle>
              <CardDescription>Evolução física consolidada das obras</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockSData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis unit="%" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="previsto" stroke="#94a3b8" strokeWidth={2} dot={{ r: 4 }} name="Previsto" />
                  <Line type="monotone" dataKey="realizado" stroke="#f59e0b" strokeWidth={3} dot={{ r: 6 }} name="Realizado" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Projetos Complementares */}
          <Card>
            <CardHeader>
              <CardTitle>Projetos Técnicos</CardTitle>
              <CardDescription>Status por disciplina</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                  <ProjectStatusItem label="Estrutural" status="approved" />
                  <ProjectStatusItem label="Elétrica" status="in_review" />
                  <ProjectStatusItem label="Hidráulica" status="pending" />
                  <ProjectStatusItem label="Ar Condicionado" status="approved" />
                  <ProjectStatusItem label="Interiores" status="in_review" />
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Cronograma / Gantt Simplificado */}
        <Card>
          <CardHeader>
            <CardTitle>Linha do Tempo das Obras</CardTitle>
            <CardDescription>Cronograma macro e marcos críticos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8 py-4">
              {projects?.map((project: any, idx: number) => (
                <div key={idx} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold">{project.name}</h4>
                    <Badge variant="outline">{project.physical_progress_percent}% Concluído</Badge>
                  </div>
                  <div className="relative h-10 bg-muted/30 rounded-lg flex items-center px-2">
                    <div 
                      className="h-6 bg-orange-500/20 border-r-2 border-orange-500 rounded flex items-center px-2 text-[10px] font-bold text-orange-700"
                      style={{ width: `${project.physical_progress_percent}%` }}
                    >
                      {project.physical_progress_percent}%
                    </div>
                    {/* Marcos (Milestones) seriam mapeados aqui */}
                    <div className="absolute left-[20%] top-[-8px] h-20 w-px bg-slate-300 pointer-events-none" />
                    <div className="absolute left-[60%] top-[-8px] h-20 w-px bg-slate-300 pointer-events-none" />
                  </div>
                </div>
              ))}
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

function ProjectStatusItem({ label, status }: { label: string, status: 'pending' | 'in_review' | 'approved' }) {
  const getBadge = () => {
    switch (status) {
      case 'approved': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Aprovado</Badge>;
      case 'in_review': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Em Análise</Badge>;
      default: return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none">Pendente</Badge>;
    }
  };

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm font-medium">{label}</span>
      {getBadge()}
    </div>
  );
}
