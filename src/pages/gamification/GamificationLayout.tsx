import { Outlet } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AnimatedTabNav } from '@/components/ui/animated-tab-nav';
import { LayoutDashboard, TrendingUp, Settings, History, Trophy } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export default function GamificationLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isSuperAdmin } = useAuth();

  const tabs = useMemo(() => {
    const items = [
      { value: '/gamificacao', label: 'Arena de Ranking', icon: Trophy },
      { value: '/gamificacao/dashboard', label: 'Meu Desempenho', icon: LayoutDashboard },
      { value: '/gamificacao/historico', label: 'Histórico', icon: History },
    ];

    if (profile?.role === 'admin' || isSuperAdmin) {
      items.push({ value: '/gamificacao/configuracoes', label: 'Configurações', icon: Settings });
    }

    return items;
  }, [profile?.role, isSuperAdmin]);

  const activeTab = location.pathname;

  return (
    <AppLayout title="Gamificação">
      <div className="space-y-6">
        <AnimatedTabNav 
          tabs={tabs} 
          activeTab={activeTab} 
          onTabChange={(value) => navigate(value)} 
        />
        <Outlet />
      </div>
    </AppLayout>
  );
}
