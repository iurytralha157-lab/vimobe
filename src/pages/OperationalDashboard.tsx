import { AppLayout } from "@/components/layout/AppLayout";
import { useOperationalRequests } from "@/hooks/use-operational";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Badge 
} from "@/components/ui/badge";
import { 
  Loader2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  HardHat,
  Wallet,
  Compass,
  ShoppingCart,
  User
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function OperationalDashboard() {
  const { data: requests, isLoading } = useOperationalRequests();

  const stats = {
    pending: requests?.filter(r => r.status === 'pending').length || 0,
    in_analysis: requests?.filter(r => r.status === 'in_analysis').length || 0,
    approved: requests?.filter(r => r.status === 'approved').length || 0,
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'finance': return <Wallet className="h-4 w-4 text-emerald-500" />;
      case 'architecture': return <Compass className="h-4 w-4 text-blue-500" />;
      case 'engineering': return <HardHat className="h-4 w-4 text-orange-500" />;
      case 'purchase': return <ShoppingCart className="h-4 w-4 text-purple-500" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pendente</Badge>;
      case 'in_analysis': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Em Análise</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Aprovado</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejeitado</Badge>;
      case 'completed': return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Concluído</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout title="Cockpit Operacional">
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Solicitações Pendentes</p>
                  <h3 className="text-2xl font-bold">{stats.pending}</h3>
                </div>
                <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Em Análise</p>
                  <h3 className="text-2xl font-bold text-blue-600">{stats.in_analysis}</h3>
                </div>
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Aprovadas (Mês)</p>
                  <h3 className="text-2xl font-bold text-emerald-600">{stats.approved}</h3>
                </div>
                <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Obras Ativas</p>
                  <h3 className="text-2xl font-bold text-orange-600">0</h3>
                </div>
                <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <HardHat className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operational Flow Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full md:w-auto grid-cols-3 md:grid-cols-5 h-auto p-1 bg-muted/50">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="finance" className="gap-2">
              <Wallet className="h-4 w-4" /> Financeiro
            </TabsTrigger>
            <TabsTrigger value="architecture" className="gap-2">
              <Compass className="h-4 w-4" /> Arquitetura
            </TabsTrigger>
            <TabsTrigger value="engineering" className="gap-2">
              <HardHat className="h-4 w-4" /> Engenharia
            </TabsTrigger>
            <TabsTrigger value="purchase" className="gap-2">
              <ShoppingCart className="h-4 w-4" /> Compras
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 gap-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : requests?.length === 0 ? (
                <Card className="border-dashed py-12 text-center">
                  <p className="text-muted-foreground">Nenhuma solicitação operacional encontrada.</p>
                </Card>
              ) : (
                requests?.map(request => (
                  <RequestCard key={request.id} request={request} getIcon={getIcon} getStatusBadge={getStatusBadge} />
                ))
              )}
            </div>
          </TabsContent>
          
          {['finance', 'architecture', 'engineering', 'purchase'].map(tab => (
            <TabsContent key={tab} value={tab} className="mt-6">
               <div className="grid grid-cols-1 gap-4">
                {requests?.filter(r => r.type === tab).map(request => (
                  <RequestCard key={request.id} request={request} getIcon={getIcon} getStatusBadge={getStatusBadge} />
                ))}
                {requests?.filter(r => r.type === tab).length === 0 && (
                   <Card className="border-dashed py-12 text-center">
                    <p className="text-muted-foreground">Nenhuma solicitação de {tab} pendente.</p>
                  </Card>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}

function RequestCard({ request, getIcon, getStatusBadge }: any) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-muted/30`}>
          {getIcon(request.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold truncate">{request.title}</h4>
            {getStatusBadge(request.status)}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {request.lead && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> Lead: <span className="text-foreground font-medium">{request.lead.name}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Criado em: {format(new Date(request.created_at), "dd MMM HH:mm", { locale: ptBR })}
            </span>
            {request.due_date && (
              <span className="flex items-center gap-1 text-red-500 font-medium">
                <AlertCircle className="h-3 w-3" /> SLA: {format(new Date(request.due_date), "dd/MM")}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 md:ml-auto">
          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
            {request.priority}
          </Badge>
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
            {request.assignee?.avatar_url ? (
              <img src={request.assignee.avatar_url} alt={request.assignee.name} className="h-full w-full object-cover" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
