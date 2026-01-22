import { LayoutDashboard, Kanban, Building2, Shuffle, Shield, Settings, HelpCircle, ChevronLeft, ChevronRight, ChevronDown, Users, MessageSquare, Calendar, DollarSign, FileText, Receipt, TrendingUp, BarChart3, Zap } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useOrganizationModules } from '@/hooks/use-organization-modules';
import { useSystemSettings } from '@/hooks/use-system-settings';
import { useTheme } from 'next-themes';
import { useSidebar } from '@/contexts/SidebarContext';
interface NavItem {
  icon: React.ElementType;
  labelKey: string;
  path: string;
  module?: string;
  adminOnly?: boolean;
  children?: NavItem[];
}
const allNavItems: NavItem[] = [{
  icon: LayoutDashboard,
  labelKey: 'dashboard',
  path: '/dashboard'
}, {
  icon: Kanban,
  labelKey: 'pipelines',
  path: '/crm/pipelines',
  module: 'crm'
}, {
  icon: MessageSquare,
  labelKey: 'conversations',
  path: '/crm/conversas',
  module: 'whatsapp'
}, {
  icon: Users,
  labelKey: 'contacts',
  path: '/crm/contacts',
  module: 'crm'
}, {
  icon: DollarSign,
  labelKey: 'financial',
  path: '/financeiro',
  module: 'financial',
  children: [{
    icon: TrendingUp,
    labelKey: 'financialDashboard',
    path: '/financeiro'
  }, {
    icon: Receipt,
    labelKey: 'entries',
    path: '/financeiro/contas'
  }, {
    icon: FileText,
    labelKey: 'contracts',
    path: '/financeiro/contratos'
  }, {
    icon: DollarSign,
    labelKey: 'commissions',
    path: '/financeiro/comissoes'
  }, {
    icon: BarChart3,
    labelKey: 'reports',
    path: '/financeiro/relatorios'
  }]
}, {
  icon: Building2,
  labelKey: 'properties',
  path: '/properties',
  module: 'properties'
}, {
  icon: BarChart3,
  labelKey: 'performance',
  path: '/reports/performance',
  module: 'crm',
  adminOnly: true
}, {
  icon: Shuffle,
  labelKey: 'crmManagement',
  path: '/crm/management',
  module: 'crm',
  adminOnly: true
}, {
  icon: Calendar,
  labelKey: 'schedule',
  path: '/agenda',
  module: 'agenda'
}, {
  icon: Zap,
  labelKey: 'automations',
  path: '/automations',
  module: 'crm',
  adminOnly: true
}];
const bottomItems: NavItem[] = [{
  icon: Settings,
  labelKey: 'settings',
  path: '/settings'
}, {
  icon: HelpCircle,
  labelKey: 'help',
  path: '/help'
}];
export function AppSidebar() {
  const location = useLocation();
  const {
    profile,
    organization,
    signOut,
    isSuperAdmin
  } = useAuth();
  const {
    t
  } = useLanguage();
  const {
    hasModule
  } = useOrganizationModules();
  const {
    data: systemSettings
  } = useSystemSettings();
  const {
    resolvedTheme
  } = useTheme();
  const {
    collapsed,
    toggleCollapsed
  } = useSidebar();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  // Get the appropriate logo based on theme
  const logoUrl = useMemo(() => {
    if (resolvedTheme === 'dark' && systemSettings?.logo_url_dark) {
      return systemSettings.logo_url_dark;
    }
    if (systemSettings?.logo_url_light) {
      return systemSettings.logo_url_light;
    }
    return null;
  }, [resolvedTheme, systemSettings]);

  // Filter nav items based on enabled modules and user role
  const navItems = useMemo(() => {
    return allNavItems.filter(item => {
      // Items without module requirement are always visible
      if (item.module && !hasModule(item.module as any)) return false;

      // Check admin-only items
      if (item.adminOnly && profile?.role !== 'admin' && !isSuperAdmin) return false;
      return true;
    });
  }, [hasModule, profile?.role, isSuperAdmin]);

  // Add Super Admin link for super admins
  const computedBottomItems = useMemo(() => {
    const items = [...bottomItems];
    if (isSuperAdmin) {
      items.unshift({
        icon: Shield,
        labelKey: 'superAdmin',
        path: '/admin'
      });
    }
    return items;
  }, [isSuperAdmin]);

  // Helper to get label from translation
  const getLabel = (labelKey: string): string => {
    return (t.nav as Record<string, string>)[labelKey] || labelKey;
  };
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  const toggleMenu = (path: string) => {
    setOpenMenus(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]);
  };
  const isMenuOpen = (path: string) => openMenus.includes(path);
  const isActiveParent = (item: NavItem) => {
    if (item.children) {
      return item.children.some(child => location.pathname === child.path);
    }
    return location.pathname.startsWith(item.path);
  };
  return <aside className={cn("h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 fixed top-0 left-0 z-40", collapsed ? "w-16" : "w-64")}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border bg-primary-foreground">
        {!collapsed && <div className="flex items-center flex-1">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="rounded-lg object-contain" style={{
          maxWidth: systemSettings?.logo_width || 140,
          maxHeight: systemSettings?.logo_height || 40
        }} /> : <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">V</span>
              </div>}
          </div>}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground" onClick={toggleCollapsed}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto scrollbar-thin bg-primary-foreground">
        <ul className="space-y-1">
          {navItems.map(item => <li key={item.path}>
              {item.children && !collapsed ? <Collapsible open={isMenuOpen(item.path) || isActiveParent(item)} onOpenChange={() => toggleMenu(item.path)}>
                  <CollapsibleTrigger asChild>
                    <button className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-orange-100 dark:hover:bg-orange-900/30", isActiveParent(item) && "text-sidebar-foreground bg-orange-100 dark:bg-orange-900/30")}>
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="flex-1 text-left">{getLabel(item.labelKey)}</span>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", (isMenuOpen(item.path) || isActiveParent(item)) && "rotate-180")} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 mt-1 space-y-1">
                    {item.children.map(child => <NavLink key={child.path} to={child.path} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors", "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-orange-100 dark:hover:bg-orange-900/30", location.pathname === child.path && "text-sidebar-foreground bg-orange-100 dark:bg-orange-900/30")}>
                        <child.icon className="h-4 w-4 flex-shrink-0" />
                        <span>{getLabel(child.labelKey)}</span>
                      </NavLink>)}
                  </CollapsibleContent>
                </Collapsible> : <NavLink to={item.children ? item.children[0].path : item.path} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-orange-100 dark:hover:bg-orange-900/30 font-sans font-normal", (item.children ? isActiveParent(item) : location.pathname.startsWith(item.path)) && "text-sidebar-foreground bg-orange-100 dark:bg-orange-900/30")}>
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{getLabel(item.labelKey)}</span>}
                </NavLink>}
            </li>)}
        </ul>
      </nav>

      {/* Bottom items */}
      <div className="py-4 px-2 border-t border-sidebar-border bg-primary-foreground">
        <ul className="space-y-1">
          {computedBottomItems.map(item => <li key={item.path}>
              <NavLink to={item.path} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-orange-100 dark:hover:bg-orange-900/30", location.pathname === item.path && "text-sidebar-foreground bg-orange-100 dark:bg-orange-900/30")}>
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{getLabel(item.labelKey)}</span>}
              </NavLink>
            </li>)}
        </ul>
      </div>
    </aside>;
}