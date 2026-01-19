import { 
  Building2, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AdminGrowthChart } from '@/components/admin/AdminGrowthChart';
import { AdminStatusChart } from '@/components/admin/AdminStatusChart';
import { AdminAlerts } from '@/components/admin/AdminAlerts';

export default function AdminDashboard() {
  const { organizations, stats, loadingOrgs } = useSuperAdmin();
  const navigate = useNavigate();

  const recentOrgs = organizations?.slice(0, 5) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'trial':
        return <Badge variant="secondary">Trial</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspenso</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate estimated MRR (assuming $99/month per active org)
  const estimatedMRR = (stats.activeOrganizations * 99);

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Organizações
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeOrganizations} ativas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Usuários
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                em todas as organizações
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Trial
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.trialOrganizations}</div>
              <p className="text-xs text-muted-foreground">
                período de teste
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Suspensas
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.suspendedOrganizations}</div>
              <p className="text-xs text-muted-foreground">
                organizações suspensas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                MRR Estimado
              </CardTitle>
              <DollarSign className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                R$ {estimatedMRR.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-muted-foreground">
                receita mensal recorrente
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {organizations && organizations.length > 0 && (
          <AdminAlerts organizations={organizations} />
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {organizations && organizations.length > 0 && (
            <AdminGrowthChart organizations={organizations} />
          )}
          <AdminStatusChart stats={stats} />
        </div>

        {/* Recent Organizations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Organizações Recentes</CardTitle>
              <CardDescription>
                Últimas organizações cadastradas no sistema
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate('/admin/organizations')}>
              Ver todas
            </Button>
          </CardHeader>
          <CardContent>
            {loadingOrgs ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : recentOrgs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma organização cadastrada
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrgs.map((org) => (
                  <div 
                    key={org.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/organizations/${org.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {org.user_count} usuários • {org.lead_count} leads
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(org.subscription_status)}
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(org.created_at), { 
                          addSuffix: true,
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
