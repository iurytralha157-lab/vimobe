import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserOrganizations } from '@/hooks/use-user-organizations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Loader2, Shield, User } from 'lucide-react';

export default function SelectOrganization() {
  const { user, loading, profile, isSuperAdmin, switchOrganization } = useAuth();
  const navigate = useNavigate();
  const { data: organizations = [], isLoading: orgsLoading } = useUserOrganizations(user?.id);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [loading, user, navigate]);

  // If super admin without orgs, go to admin
  useEffect(() => {
    if (!loading && !orgsLoading && isSuperAdmin && organizations.length === 0) {
      navigate('/admin', { replace: true });
    }
  }, [loading, orgsLoading, isSuperAdmin, organizations, navigate]);

  // If only 1 org, auto-select
  useEffect(() => {
    if (!loading && !orgsLoading && organizations.length === 1) {
      handleSelectOrg(organizations[0].organization_id);
    }
  }, [loading, orgsLoading, organizations]);

  const handleSelectOrg = async (orgId: string) => {
    await switchOrganization(orgId);
    navigate('/crm/conversas', { replace: true });
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
        <div className="text-center space-y-2">
          <Building2 className="h-12 w-12 mx-auto text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Selecione a organização</h1>
          <p className="text-muted-foreground text-sm">
            Você tem acesso a múltiplas organizações. Escolha qual deseja acessar.
          </p>
        </div>

        <div className="space-y-3">
          {organizations.map((org) => (
            <Card
              key={org.organization_id}
              className="p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
              onClick={() => handleSelectOrg(org.organization_id)}
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 rounded-xl border border-border">
                  <AvatarImage src={org.organization_logo || undefined} />
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold">
                    {org.organization_name?.charAt(0)?.toUpperCase() || 'O'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {org.organization_name}
                  </p>
                  <Badge variant="secondary" className="text-[10px] mt-1">
                    {org.member_role === 'admin' ? (
                      <><Shield className="h-3 w-3 mr-1" /> Administrador</>
                    ) : (
                      <><User className="h-3 w-3 mr-1" /> Usuário</>
                    )}
                  </Badge>
                </div>
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <span className="text-xs">→</span>
                </div>
              </div>
            </Card>
          ))}
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
