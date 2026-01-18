import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, TrendingUp, Download, Calendar } from "lucide-react";

const mockCalls = [
  { id: 1, type: "incoming", number: "(11) 99999-1234", agent: "João Silva", duration: "5:32", status: "answered", date: "2024-01-15 10:30" },
  { id: 2, type: "outgoing", number: "(11) 98888-5678", agent: "Maria Santos", duration: "3:15", status: "answered", date: "2024-01-15 11:45" },
  { id: 3, type: "missed", number: "(11) 97777-9012", agent: "Pedro Costa", duration: "0:00", status: "missed", date: "2024-01-15 14:20" },
];

const mockStats = { totalCalls: 1250, answered: 1100, missed: 150, avgDuration: "4:32", avgWaitTime: "0:45" };
const mockAgentStats = [
  { name: "João Silva", calls: 320, answered: 300, missed: 20, avgDuration: "5:15", satisfaction: 4.8 },
  { name: "Maria Santos", calls: 280, answered: 265, missed: 15, avgDuration: "4:45", satisfaction: 4.9 },
];

export default function TelephonyReports() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState("month");
  const getCallIcon = (type: string) => { switch (type) { case "incoming": return <PhoneIncoming className="h-4 w-4 text-green-500" />; case "outgoing": return <PhoneOutgoing className="h-4 w-4 text-blue-500" />; case "missed": return <PhoneMissed className="h-4 w-4 text-destructive" />; default: return <Phone className="h-4 w-4" />; } };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold">{t("telephonyReports")}</h1><p className="text-muted-foreground">Análise detalhada das ligações</p></div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-[180px]"><Calendar className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="today">Hoje</SelectItem><SelectItem value="week">Esta semana</SelectItem><SelectItem value="month">Este mês</SelectItem></SelectContent></Select>
            <Button variant="outline"><Download className="mr-2 h-4 w-4" />Exportar</Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card><CardHeader className="pb-2"><CardDescription>Total de Ligações</CardDescription><CardTitle className="text-2xl">{mockStats.totalCalls}</CardTitle></CardHeader><CardContent><div className="flex items-center text-sm text-green-600"><TrendingUp className="mr-1 h-4 w-4" />+12% vs período anterior</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Atendidas</CardDescription><CardTitle className="text-2xl text-green-600">{mockStats.answered}</CardTitle></CardHeader><CardContent><div className="text-sm text-muted-foreground">{((mockStats.answered / mockStats.totalCalls) * 100).toFixed(1)}% do total</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Perdidas</CardDescription><CardTitle className="text-2xl text-destructive">{mockStats.missed}</CardTitle></CardHeader><CardContent><div className="text-sm text-muted-foreground">{((mockStats.missed / mockStats.totalCalls) * 100).toFixed(1)}% do total</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Duração Média</CardDescription><CardTitle className="text-2xl">{mockStats.avgDuration}</CardTitle></CardHeader><CardContent><div className="flex items-center text-sm text-muted-foreground"><Clock className="mr-1 h-4 w-4" />minutos</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Tempo de Espera</CardDescription><CardTitle className="text-2xl">{mockStats.avgWaitTime}</CardTitle></CardHeader><CardContent><div className="flex items-center text-sm text-muted-foreground"><Clock className="mr-1 h-4 w-4" />média</div></CardContent></Card>
        </div>
        <Tabs defaultValue="calls" className="space-y-4">
          <TabsList><TabsTrigger value="calls">Histórico de Ligações</TabsTrigger><TabsTrigger value="agents">Performance por Agente</TabsTrigger></TabsList>
          <TabsContent value="calls"><Card><CardHeader><CardTitle>Ligações Recentes</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Número</TableHead><TableHead>Agente</TableHead><TableHead>Duração</TableHead><TableHead>Status</TableHead><TableHead>Data/Hora</TableHead></TableRow></TableHeader><TableBody>{mockCalls.map((call) => (<TableRow key={call.id}><TableCell>{getCallIcon(call.type)}</TableCell><TableCell className="font-mono">{call.number}</TableCell><TableCell>{call.agent}</TableCell><TableCell>{call.duration}</TableCell><TableCell><Badge variant={call.status === "answered" ? "default" : "destructive"}>{call.status === "answered" ? "Atendida" : "Perdida"}</Badge></TableCell><TableCell className="text-muted-foreground">{call.date}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card></TabsContent>
          <TabsContent value="agents"><Card><CardHeader><CardTitle>Performance dos Agentes</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Agente</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Atendidas</TableHead><TableHead className="text-right">Perdidas</TableHead><TableHead className="text-right">Duração Média</TableHead><TableHead className="text-right">Satisfação</TableHead></TableRow></TableHeader><TableBody>{mockAgentStats.map((agent) => (<TableRow key={agent.name}><TableCell className="font-medium">{agent.name}</TableCell><TableCell className="text-right">{agent.calls}</TableCell><TableCell className="text-right text-green-600">{agent.answered}</TableCell><TableCell className="text-right text-destructive">{agent.missed}</TableCell><TableCell className="text-right">{agent.avgDuration}</TableCell><TableCell className="text-right"><Badge variant="outline">⭐ {agent.satisfaction}</Badge></TableCell></TableRow>))}</TableBody></Table></CardContent></Card></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
