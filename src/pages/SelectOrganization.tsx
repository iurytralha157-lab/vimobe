import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { useUserOrganizations } from '@/hooks/use-user-organizations';
import { useSystemSettings } from '@/hooks/use-system-settings';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Building2, Loader2, Shield, User } from 'lucide-react';

const getInitials = (name?: string | null) => {
  const parts = (name || 'OR').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'OR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const formatLastAccess = (iso: string | null) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).replace(',', ' às');
  } catch {
    return null;
  }
};

export default function SelectOrganization() {
  const { user, loading, isSuperAdmin, switchOrganization, organization } = useAuth();
  const navigate = useNavigate();
  const { data: organizations = [], isLoading: orgsLoading } = useUserOrganizations(user?.id, organization?.id);
  const { data: systemSettings } = useSystemSettings();
  const { resolvedTheme } = useTheme();

  const logoUrl = useMemo(() => {
    if (!systemSettings) return null;
    return resolvedTheme === 'dark'
      ? systemSettings.logo_url_dark || systemSettings.logo_url_light
      : systemSettings.logo_url_light || systemSettings.logo_url_dark;
  }, [systemSettings, resolvedTheme]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && !orgsLoading && isSuperAdmin && organizations.length === 0) {
      navigate('/admin', { replace: true });
    }
  }, [loading, orgsLoading, isSuperAdmin, organizations, navigate]);

  const handleSelectOrg = async (orgId: string) => {
    await switchOrganization(orgId);
    navigate('/dashboard', { replace: true });
  };

  if (loading || orgsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center space-y-4">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Nenhuma organização encontrada</h2>
          <p className="text-muted-foreground max-w-xs">
            Você não possui acesso a nenhuma organização ativa no momento.
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="text-primary hover:underline font-medium"
          >
            Acessar Painel Super Admin
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-5xl space-y-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
            ) : (
              <Building2 className="h-12 w-12 text-primary" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-foreground">Selecione a organização</h1>
          <p className="text-muted-foreground text-sm">
            Você tem acesso a múltiplas organizações. Escolha qual deseja acessar.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {organizations.map((org) => {
            const name = org.organization_name || 'Organização';
            const lastAccess = formatLastAccess(org.last_accessed_at);
            const isAdmin = org.member_role === 'admin' || org.member_role === 'super_admin';
            return (
              <Card
                key={org.organization_id}
                onClick={() => handleSelectOrg(org.organization_id)}
                className="p-6 cursor-pointer rounded-2xl hover:border-primary/60 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group flex flex-col items-center text-center"
              >
                <Avatar className="h-20 w-20 rounded-full border border-border/40 mb-4">
                  {org.organization_logo ? (
                    <AvatarImage
                      src={org.organization_logo}
                      className="object-contain rounded-full"
                    />
                  ) : null}
                  <AvatarFallback className="rounded-full bg-primary text-primary-foreground font-bold text-xl">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>

                <p className="font-semibold text-foreground uppercase tracking-wide text-sm break-words group-hover:text-primary transition-colors">
                  {name}
                </p>

                {lastAccess && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    <p>Último acesso:</p>
                    <p>{lastAccess}</p>
                  </div>
                )}

                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-foreground">
                  {isAdmin ? (
                    <>
                      <Shield className="h-3 w-3 text-primary" /> Administrador
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3 text-primary" /> Usuário
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors py-2"
          >
            Acessar Painel Super Admin
          </button>
        )}

        {/* Logout button */}
        <button
          onClick={() => {
            // Clear org selection flag so they see the selector again on next login
            sessionStorage.removeItem('org_selected');
            window.location.href = '/auth?logout=true';
          }}
          className="w-full px-4 py-2.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white font-medium transition-colors mt-6"
        >
          Sair
        </button>
      </div>
    </div>
  );
}
