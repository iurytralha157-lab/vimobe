import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { useUserOrganizations } from '@/hooks/use-user-organizations';
import { useSystemSettings } from '@/hooks/use-system-settings';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Loader2, Shield, User } from 'lucide-react';

const getInitials = (name?: string | null) => {
  const parts = (name || 'OR').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'OR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export default function SelectOrganization() {
  const { user, loading, isSuperAdmin, switchOrganization } = useAuth();
  const navigate = useNavigate();
  const { data: organizations = [], isLoading: orgsLoading } = useUserOrganizations(user?.id);
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

  // Replaced auto-redirect to allow users to always see the selection screen if desired
  // This addresses the user request "Ele não tá sempre aparecendo, ele tem que sempre aparecer"


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

  if (organizations.length <= 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-14 w-auto object-contain"
              />
            ) : (
              <Building2 className="h-12 w-12 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">Selecione a organização</h1>
          <p className="text-muted-foreground text-sm">
            Você tem acesso a múltiplas organizações. Escolha qual deseja acessar.
          </p>
        </div>

        <div className="space-y-3">
          {organizations.map((org) => {
            const name = org.organization_name || 'Organização';
            return (
              <Card
                key={org.organization_id}
                className="p-4 cursor-pointer rounded-2xl hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
                onClick={() => handleSelectOrg(org.organization_id)}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 rounded-full">
                    {org.organization_logo && (
                      <AvatarImage src={org.organization_logo} className="object-cover rounded-full" />
                    )}
                    <AvatarFallback className="rounded-full bg-primary text-primary-foreground font-bold">
                      {getInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground break-words group-hover:text-primary transition-colors">
                      {name}
                    </p>
                    <Badge variant="secondary" className="text-[10px] mt-1">
                      {org.member_role === 'admin' ? (
                        <><Shield className="h-3 w-3 mr-1" /> Administrador</>
                      ) : (
                        <><User className="h-3 w-3 mr-1" /> Usuário</>
                      )}
                    </Badge>
                  </div>
                  <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <span className="text-xs">→</span>
                  </div>
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
      </div>
    </div>
  );
}
