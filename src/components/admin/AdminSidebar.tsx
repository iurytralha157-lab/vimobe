import { 
  LayoutDashboard, 
  Building2, 
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useMemo } from 'react';
import { useSystemSettings } from '@/hooks/use-system-settings';
import { useTheme } from 'next-themes';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Building2, label: 'Organizações', path: '/admin/organizations' },
  { icon: Users, label: 'Usuários', path: '/admin/users' },
  { icon: Settings, label: 'Configurações', path: '/admin/settings' },
];

export function AdminSidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const { data: systemSettings } = useSystemSettings();
  const { resolvedTheme } = useTheme();

  const logoUrl = useMemo(() => {
    if (!systemSettings) return null;
    const preferredUrl = resolvedTheme === 'dark' 
      ? systemSettings.logo_url_dark 
      : systemSettings.logo_url_light;
    // Fallback to the other theme's logo if preferred is not set
    return preferredUrl || systemSettings.logo_url_light || systemSettings.logo_url_dark;
  }, [systemSettings, resolvedTheme]);

  const logoWidth = systemSettings?.logo_width || 140;
  const logoHeight = systemSettings?.logo_height || 40;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <aside 
      className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 fixed top-0 left-0 z-40",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                style={{ maxWidth: Math.min(logoWidth, 160), maxHeight: Math.min(logoHeight, 40) }}
                className="object-contain"
              />
            ) : (
              <>
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-sidebar-foreground">Super Admin</span>
              </>
            )}
          </div>
        )}
        {collapsed && logoUrl && (
          <img 
            src={logoUrl} 
            alt="Logo" 
            className="h-8 w-8 object-contain"
          />
        )}
        {collapsed && !logoUrl && (
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground flex-shrink-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/admin'}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  isActive && "bg-sidebar-accent text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User section */}
      {profile && !collapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{profile.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
