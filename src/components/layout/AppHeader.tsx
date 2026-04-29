import React from 'react';
import { Bell, Moon, Sun, Loader2, LogOut, ChevronDown, UserPlus, CheckSquare, FileText, DollarSign, Info, Settings, HelpCircle, Shield, Building2, Check, Key, BookOpen } from 'lucide-react';
import { useOrganizationModules } from '@/hooks/use-organization-modules';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
// Notifications hooks removed
import { useUserOrganizations } from '@/hooks/use-user-organizations';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// notificationIcons removed

interface AppHeaderProps {
  title?: string;
}

export const AppHeader = React.memo(function AppHeader({
  title
}: AppHeaderProps) {
  const {
    profile,
    signOut,
    isSuperAdmin,
    organization,
    switchOrganization,
    user,
  } = useAuth();
  const { hasModule } = useOrganizationModules();
  const {
    theme,
    setTheme,
    resolvedTheme
  } = useTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: userOrganizations = [] } = useUserOrganizations(user?.id);
  
  const hasMultipleOrgs = userOrganizations.length > 1;

  const handleSwitchOrg = async (orgId: string) => {
    try {
      await switchOrganization(orgId);
      // Wait a moment for state to stabilize before redirecting
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
        // Force reload to reset all queries and ensure clean state
        window.location.reload();
      }, 100);
    } catch (err) {
      console.error("Error switching organization:", err);
    }
  };


  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 h-16 flex items-center px-4 md:px-6 bg-background/80 backdrop-blur-md border-b border-border/10">
      {/* Page title - aligned with content */}
      {title && <h1 className="text-xl font-bold text-foreground ml-2 lg:ml-0 tracking-tight">{title}</h1>}

      {/* Right side actions - Capsule style redesign */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Org switcher */}
        {hasMultipleOrgs && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 gap-2 px-3 rounded-full bg-card dark:bg-[#111] transition-all duration-300"
              >
                <Building2 className="h-4 w-4 text-primary" />
                {!isMobile && (
                  <span className="text-xs font-medium truncate max-w-[120px]">
                    {organization?.name || 'Organização'}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={12} className="w-64 bg-popover/95 backdrop-blur-md rounded-2xl p-1 border-border/50">
              <div className="px-3 py-2 border-b border-border/40">
                <p className="text-xs font-semibold text-muted-foreground">Trocar organização</p>
              </div>
              {userOrganizations.map((org) => (
                <DropdownMenuItem
                  key={org.organization_id}
                  onClick={() => handleSwitchOrg(org.organization_id)}
                  className="cursor-pointer rounded-xl m-1 px-3 py-2.5 gap-3"
                >
                  <Avatar className="h-8 w-8 rounded-lg border border-border/40">
                    <AvatarImage src={org.organization_logo || undefined} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-bold">
                      {org.organization_name?.charAt(0)?.toUpperCase() || 'O'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{org.organization_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {org.member_role === 'admin' ? 'Administrador' : 'Usuário'}
                    </p>
                  </div>
                  {organization?.id === org.organization_id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Theme toggle circle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} 
          className="h-10 w-10 rounded-full bg-card dark:bg-[#111] transition-all duration-300"
        >
          {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

{/* Notifications removed */}

        {/* User Capsule */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-12 gap-3 pl-1.5 pr-2 rounded-full bg-card dark:bg-[#111] transition-all duration-300 group"
            >
              <Avatar className="h-9 w-9 border border-border/40 dark:border-white/10 ring-2 ring-primary/10 group-hover:ring-primary/20 transition-all">
                <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {profile?.name ? getInitials(profile.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              {!isMobile && (
                <div className="flex flex-col items-start gap-0.5 pr-1 text-left">
                  <span className="text-xs font-bold text-foreground tracking-tight leading-none truncate max-w-[130px]">
                    {profile?.name || 'Usuário'}
                  </span>
                  <span className="text-[10px] text-muted-foreground/80 leading-none truncate max-w-[130px]">
                    {profile?.email || 'email@exemplo.com'}
                  </span>
                </div>
              )}
              <div className="h-7 w-7 rounded-full bg-secondary/80 dark:bg-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 flex-shrink-0">
                <ChevronDown className="h-3 w-3" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={12} collisionPadding={16} className="w-56 bg-popover/95 backdrop-blur-md rounded-2xl p-1 border-border/50">
            <div className="px-3 py-3 border-b border-border/40">
              <p className="text-sm font-bold truncate">{profile?.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{profile?.email}</p>
            </div>
            <div className="mt-1">
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer rounded-xl m-1 px-3 py-2 text-sm gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.dispatchEvent(new Event('setup-guide:open'))} className="cursor-pointer rounded-xl m-1 px-3 py-2 text-sm gap-2">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                Guia de configuração
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => navigate('/docs/api')} className="cursor-pointer rounded-xl m-1 px-3 py-2 text-sm gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Documentação de API
              </DropdownMenuItem>

              {hasModule('api') && (
                <DropdownMenuItem onClick={() => navigate('/settings?tab=api')} className="cursor-pointer rounded-xl m-1 px-3 py-2 text-sm gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  API Pública
                </DropdownMenuItem>
              )}
              {isSuperAdmin && (
                <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer rounded-xl m-1 px-3 py-2 text-sm gap-2 border-t border-border/20 mt-1">
                  <Shield className="h-4 w-4 text-primary" />
                  Super Admin
                </DropdownMenuItem>
              )}
            </div>
            <DropdownMenuSeparator className="my-1 border-border/40" />
            <DropdownMenuItem 
              onClick={async () => {
                try {
                  await signOut();
                } catch (error) {
                  console.error('Erro no logout:', error);
                }
                window.location.href = '/auth';
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:bg-destructive/90 cursor-pointer rounded-xl m-1 px-3 py-2 text-sm gap-2 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
});