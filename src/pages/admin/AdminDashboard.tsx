import { 
  Building2, 
  Users, 
  AlertTriangle,
  Clock,
  DollarSign,
  Gift,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { useAdminPlans } from '@/hooks/use-admin-plans';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AdminGrowthChart } from '@/components/admin/AdminGrowthChart';
import { AdminStatusChart } from '@/components/admin/AdminStatusChart';
import { AdminAlerts } from '@/components/admin/AdminAlerts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function AdminDashboard() {
  const { organizations, stats, loadingOrgs } = useSuperAdmin();
  const { plans } = useAdminPlans();
  const navigate = useNavigate();

  // Fetch organizations with plan data
  const { data: orgsWithPlans } = useQuery({
    queryKey: ['orgs-with-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          subscription_type,
          trial_ends_at,
          plan_id,
          is_active
        `)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
  });

  const recentOrgs = organizations?.slice(0, 5) || [];

  // Calculate stats by subscription type
  const subscriptionStats = {
    trial: orgsWithPlans?.filter(o => o.subscription_type === 'trial').length || 0,
    paid: orgsWithPlans?.filter(o => o.subscription_type === 'paid').length || 0,
    free: orgsWithPlans?.filter(o => o.subscription_type === 'free').length || 0,
  };

  // Calculate MRR based on actual plans
  const calculateMRR = () => {
    if (!orgsWithPlans || !plans) return 0;
    
    return orgsWithPlans.reduce((total, org) => {
      if (org.subscription_type === 'paid' && org.plan_id) {
        const plan = plans.find(p => p.id === org.plan_id);
        if (plan) {
          return total + plan.price;
        }
      }
      return total;
    }, 0);
  };

  // Find trials expiring soon (next 7 days)
  const trialsExpiringSoon = orgsWithPlans?.filter(org => {
    if (org.subscription_type !== 'trial' || !org.trial_ends_at) return false;
    const daysLeft = differenceInDays(new Date(org.trial_ends_at), new Date());
    return daysLeft >= 0 && daysLeft <= 7;
  }).length || 0;

  const mrr = calculateMRR();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-primary">Ativo</Badge>;
      case 'trial':
        return <Badge variant="secondary">Trial</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspenso</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSubscriptionBadge = (type: string | null) => {
    switch (type) {
      case 'paid':
        return <Badge className="bg-primary"><CreditCard className="h-3 w-3 mr-1" />Pago</Badge>;
      case 'trial':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Trial</Badge>;
      case 'free':
        return <Badge variant="outline"><Gift className="h-3 w-3 mr-1" />Gratuito</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats Cards - Updated */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Organizações
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 md:px-6 pb-4">
              <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeOrganizations} ativas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pagantes
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 md:px-6 pb-4">
              <div className="text-2xl font-bold">{subscriptionStats.paid}</div>
              <p className="text-xs text-muted-foreground">
                assinaturas ativas
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
            <CardContent className="px-4 md:px-6 pb-4">
              <div className="text-2xl font-bold">{subscriptionStats.trial}</div>
              <p className="text-xs text-muted-foreground">
                {trialsExpiringSoon > 0 && (
                  <span className="text-orange-600">{trialsExpiringSoon} expirando</span>
                )}
                {trialsExpiringSoon === 0 && 'período de teste'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gratuitos
              </CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 md:px-6 pb-4">
              <div className="text-2xl font-bold">{subscriptionStats.free}</div>
              <p className="text-xs text-muted-foreground">
                parcerias
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
            <CardContent className="px-4 md:px-6 pb-4">
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                em todas as organizações
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                MRR
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="px-4 md:px-6 pb-4">
              <div className="text-2xl font-bold text-primary">
                R$ {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                receita mensal
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {organizations && organizations.length > 0 && (
          <AdminAlerts organizations={organizations} />
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
          <CardContent className="px-4 md:px-6 pb-4">
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors gap-3"
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
                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                      {getStatusBadge(org.subscription_status)}
                      <span className="text-xs sm:text-sm text-muted-foreground">
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
