import { useMemo } from 'react';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Wallet,
  AlertOctagon,
  Clock,
  XCircle,
  Activity,
  Zap,
  AlertTriangle,
  LogIn,
  Users2,
  Briefcase,
  Phone,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLocalStorage } from '@/hooks/use-local-storage';
import {
  useDashboardOverview,
  useDashboardTimeseries,
  useDashboardPendingBoards,
  useDashboardFeed,
  type DashboardPeriod,
} from '@/hooks/use-admin-dashboard';
import { PlatformHeader } from '@/components/admin/dashboard/PlatformHeader';
import { KpiCard } from '@/components/admin/dashboard/KpiCard';
import { RevenueChart } from '@/components/admin/dashboard/RevenueChart';
import { OrgsGrowthChart } from '@/components/admin/dashboard/OrgsGrowthChart';
import { HealthDonutChart } from '@/components/admin/dashboard/HealthDonutChart';
import { UsageChart } from '@/components/admin/dashboard/UsageChart';
import { PendingBoard, PendingRow } from '@/components/admin/dashboard/PendingBoard';
import { OperationalFeed } from '@/components/admin/dashboard/OperationalFeed';
import { useQueryClient } from '@tanstack/react-query';

const fmtBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);
const fmtNum = (n: number) => new Intl.NumberFormat('pt-BR').format(n || 0);

export default function AdminDashboard() {
  const [period, setPeriod] = useLocalStorage<DashboardPeriod>('admin-dash-period', 30);
  const qc = useQueryClient();

  const overview = useDashboardOverview(period);
  const ts = useDashboardTimeseries(period);
  const pending = useDashboardPendingBoards();
  const feed = useDashboardFeed(40);

  const isFetching = overview.isFetching || ts.isFetching || pending.isFetching || feed.isFetching;

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['admin-dashboard-overview'] });
    qc.invalidateQueries({ queryKey: ['admin-dashboard-timeseries'] });
    qc.invalidateQueries({ queryKey: ['admin-dashboard-pending'] });
    qc.invalidateQueries({ queryKey: ['admin-dashboard-feed'] });
  };

  const highlights = useMemo(() => {
    const o = overview.data;
    const p = pending.data;
    const list: string[] = [];
    if (p?.overdue?.length) list.push(`${p.overdue.length} ${p.overdue.length === 1 ? 'cliente inadimplente' : 'clientes inadimplentes'}`);
    if (p?.trials?.length) list.push(`${p.trials.length} ${p.trials.length === 1 ? 'trial vencendo' : 'trials vencendo'}`);
    if (o?.financial.revenue_growth_pct) {
      const g = o.financial.revenue_growth_pct;
      list.push(`Receita ${g >= 0 ? '+' : ''}${g.toFixed(1)}% no período`);
    }
    if (o?.operational.errors_recent) list.push(`${o.operational.errors_recent} erros recentes`);
    return list;
  }, [overview.data, pending.data]);

  const fin = overview.data?.financial;
  const plat = overview.data?.platform;
  const op = overview.data?.operational;

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6 max-w-[1600px]">
        <PlatformHeader
          period={period}
          onPeriodChange={setPeriod}
          onRefresh={refreshAll}
          isFetching={isFetching}
          lastUpdated={overview.dataUpdatedAt ? new Date(overview.dataUpdatedAt) : undefined}
          highlights={highlights}
        />

        {/* KPIs Financeiro */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Financeiro</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <KpiCard label="MRR" value={fmtBRL(fin?.mrr ?? 0)} icon={DollarSign} accent="primary" hint="receita mensal recorrente" loading={overview.isLoading} />
            <KpiCard label="Receita no período" value={fmtBRL(fin?.revenue_period ?? 0)} icon={TrendingUp} deltaPct={fin?.revenue_growth_pct} accent="success" loading={overview.isLoading} />
            <KpiCard label="Receita prevista" value={fmtBRL(fin?.revenue_forecast ?? 0)} icon={Wallet} hint="a vencer no período" loading={overview.isLoading} />
            <KpiCard label="Ticket médio" value={fmtBRL(fin?.avg_ticket ?? 0)} icon={Briefcase} hint="últimos 90 dias" loading={overview.isLoading} />
            <KpiCard label="Inadimplência" value={fmtBRL(fin?.overdue_total ?? 0)} icon={AlertOctagon} accent="danger" hint="total em atraso" loading={overview.isLoading} />
          </div>
        </section>

        {/* KPIs Plataforma */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Plataforma</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <KpiCard label="Organizações" value={fmtNum(plat?.total_orgs ?? 0)} icon={Building2} deltaPct={plat?.orgs_growth_pct} loading={overview.isLoading} />
            <KpiCard label="Ativas" value={fmtNum(plat?.active_orgs ?? 0)} icon={Activity} accent="success" loading={overview.isLoading} />
            <KpiCard label="Trials ativos" value={fmtNum(plat?.trial_orgs ?? 0)} icon={Clock} accent="warning" loading={overview.isLoading} />
            <KpiCard label="Canceladas" value={fmtNum(plat?.cancelled_orgs ?? 0)} icon={XCircle} accent="danger" loading={overview.isLoading} />
            <KpiCard label="Usuários ativos hoje" value={fmtNum(plat?.active_users_today ?? 0)} icon={Users} loading={overview.isLoading} />
          </div>
        </section>

        {/* KPIs Operacional */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Operacional</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <KpiCard label="Leads hoje" value={fmtNum(op?.leads_today ?? 0)} icon={Users2} loading={overview.isLoading} />
            <KpiCard label="Automações executadas" value={fmtNum(op?.automations_today ?? 0)} icon={Zap} loading={overview.isLoading} />
            <KpiCard label="Atividades hoje" value={fmtNum(op?.activities_today ?? 0)} icon={Activity} loading={overview.isLoading} />
            <KpiCard label="Erros recentes" value={fmtNum(op?.errors_recent ?? 0)} icon={AlertTriangle} accent={op?.errors_recent ? 'danger' : 'default'} hint="últimas 24h" loading={overview.isLoading} />
            <KpiCard label="Acessos hoje" value={fmtNum(op?.accesses_today ?? 0)} icon={LogIn} loading={overview.isLoading} />
          </div>
        </section>

        {/* Gráficos */}
        <section className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' }}>
          <RevenueChart data={ts.data?.revenue} loading={ts.isLoading} />
          <OrgsGrowthChart data={ts.data?.orgs} loading={ts.isLoading} />
          <HealthDonutChart data={ts.data?.health} loading={ts.isLoading} />
          <UsageChart data={ts.data?.usage} loading={ts.isLoading} />
        </section>

        {/* Central de pendências */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Central de pendências</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            <PendingBoard title="Clientes inadimplentes" icon={AlertOctagon} tone="danger" count={pending.data?.overdue?.length ?? 0} loading={pending.isLoading} empty="Nenhum cliente em atraso.">
              {pending.data?.overdue?.map((o) => (
                <PendingRow
                  key={o.id}
                  title={o.name}
                  subtitle={`${o.days_overdue} dia${o.days_overdue === 1 ? '' : 's'} em atraso`}
                  value={fmtBRL(Number(o.amount_due))}
                  valueTone="danger"
                />
              ))}
            </PendingBoard>

            <PendingBoard title="Organizações sem uso" icon={Activity} tone="warning" count={pending.data?.idle?.length ?? 0} loading={pending.isLoading} empty="Todas as organizações ativas.">
              {pending.data?.idle?.map((o) => (
                <PendingRow
                  key={o.id}
                  title={o.name}
                  subtitle={o.days_idle == null ? 'Nunca acessou' : `Sem acesso há ${o.days_idle} dias`}
                  value="risco de churn"
                  valueTone="warning"
                />
              ))}
            </PendingBoard>

            <PendingBoard title="Problemas técnicos" icon={AlertTriangle} tone="danger" count={pending.data?.issues?.length ?? 0} loading={pending.isLoading} empty="Tudo funcionando.">
              {pending.data?.issues?.map((i) => (
                <PendingRow
                  key={i.id}
                  title={i.title}
                  subtitle={`${i.organization_name ?? 'Sistema'} · ${i.type}`}
                  value={i.severity}
                  valueTone="danger"
                />
              ))}
            </PendingBoard>

            <PendingBoard title="Trials vencendo" icon={Clock} tone="warning" count={pending.data?.trials?.length ?? 0} loading={pending.isLoading} empty="Sem trials próximos do vencimento.">
              {pending.data?.trials?.map((t) => (
                <PendingRow
                  key={t.id}
                  title={t.name}
                  subtitle={t.whatsapp ?? t.telefone ?? t.email ?? '—'}
                  value={`${t.days_left}d restantes`}
                  valueTone={t.days_left <= 3 ? 'danger' : 'warning'}
                />
              ))}
            </PendingBoard>
          </div>
        </section>

        {/* Feed operacional */}
        <section>
          <OperationalFeed events={feed.data} loading={feed.isLoading} />
        </section>
      </div>
    </AdminLayout>
  );
}
