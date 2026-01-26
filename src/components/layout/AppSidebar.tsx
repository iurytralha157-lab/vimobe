import { LayoutDashboard, Kanban, Building2, Shuffle, Shield, Settings, HelpCircle, ChevronDown, ChevronLeft, ChevronRight, Users, MessageSquare, Calendar, DollarSign, FileText, Receipt, TrendingUp, BarChart3, Zap, Package, MapPin, UserCheck, Globe } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useOrganizationModules } from '@/hooks/use-organization-modules';
import { useSidebar } from '@/contexts/SidebarContext';
import { useSystemSettings } from '@/hooks/use-system-settings';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
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
  adminOnly: true,
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
},
// Imobiliária module
{
  icon: Building2,
  labelKey: 'properties',
  path: '/properties',
  module: 'properties'
},
// Telecom modules
{
  icon: Package,
  labelKey: 'plans',
  path: '/plans',
  module: 'plans'
}, {
  icon: MapPin,
  labelKey: 'coverage',
  path: '/coverage',
  module: 'coverage'
}, {
  icon: UserCheck,
  labelKey: 'telecomCustomers',
  path: '/telecom/customers',
  module: 'telecom'
},
// Admin modules
{
  icon: BarChart3,
  labelKey: 'performance',
  path: '/reports/performance',
  module: 'performance'
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
  module: 'automations',
  adminOnly: true
}];
const bottomItems: NavItem[] = [{
  icon: Globe,
  labelKey: 'mySite',
  path: '/settings/site',
  adminOnly: true,
  module: 'site'
}, {
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
    isSuperAdmin,
    organization
  } = useAuth();
  const {
    t
  } = useLanguage();
  const {
    hasModule
  } = useOrganizationModules();
  const {
    collapsed,
    toggleCollapsed
  } = useSidebar();
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const {
    data: systemSettings
  } = useSystemSettings();
  const {
    resolvedTheme
  } = useTheme();

  // Get the appropriate logo/favicon based on theme
  const logoUrl = useMemo(() => {
    if (!systemSettings) return null;
    return resolvedTheme === 'dark' ? systemSettings.logo_url_dark || systemSettings.logo_url_light : systemSettings.logo_url_light || systemSettings.logo_url_dark;
  }, [systemSettings, resolvedTheme]);
  const faviconUrl = useMemo(() => {
    if (!systemSettings) return null;
    return resolvedTheme === 'dark' ? systemSettings.favicon_url_dark || systemSettings.favicon_url_light : systemSettings.favicon_url_light || systemSettings.favicon_url_dark;
  }, [systemSettings, resolvedTheme]);
  const logoWidth = systemSettings?.logo_width || 140;
  const logoHeight = systemSettings?.logo_height || 40;

  // Filter nav items based on enabled modules, user role, and organization segment
  const navItems = useMemo(() => {
    return allNavItems.filter(item => {
      if (item.module && !hasModule(item.module as any)) return false;
      if (item.adminOnly && profile?.role !== 'admin' && !isSuperAdmin) return false;
      // Hide Contacts menu for telecom segment
      if (item.path === '/crm/contacts' && organization?.segment === 'telecom') return false;
      // Hide Performance for non-admins in imobiliário segment (keep visible for telecom)
      if (item.path === '/reports/performance' && organization?.segment !== 'telecom' && profile?.role !== 'admin' && !isSuperAdmin) return false;
      return true;
    });
  }, [hasModule, profile?.role, isSuperAdmin, organization?.segment]);

  // Filter bottom items based on user role and modules
  const computedBottomItems = useMemo(() => {
    let items = bottomItems.filter(item => {
      if (item.adminOnly && profile?.role !== 'admin' && !isSuperAdmin) return false;
      if (item.module && !hasModule(item.module as any)) return false;
      return true;
    });
    if (isSuperAdmin) {
      items = [{
        icon: Shield,
        labelKey: 'superAdmin',
        path: '/admin'
      }, ...items];
    }
    return items;
  }, [isSuperAdmin, profile?.role, hasModule]);
  const getLabel = (labelKey: string): string => {
    return (t.nav as Record<string, string>)[labelKey] || labelKey;
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
  return <aside className={cn("h-[calc(100%-24px)] bg-card rounded-xl shadow-sm relative flex flex-col transition-all duration-300 m-3 flex-shrink-0 border-0", collapsed ? "w-16" : "w-56")}>
      {/* Header with Logo and Toggle */}
      <div className={cn("flex items-center px-3 py-3", collapsed ? "justify-center" : "justify-between")}>
        {collapsed ?
      // Collapsed: Show favicon only
      <div className="h-8 w-8 flex items-center justify-center">
            {faviconUrl ? <img src={faviconUrl} alt="Icon" className="h-8 w-8 object-contain" /> : <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                V
              </div>}
          </div> :
      // Expanded: Show full logo + toggle button
      <>
            <div className="flex items-center">
              {logoUrl ? <img src={logoUrl} alt="Logo" style={{
            maxWidth: logoWidth,
            maxHeight: logoHeight
          }} className="object-contain" /> : <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                  V
                </div>}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={toggleCollapsed}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>}
      </div>

      {/* Floating toggle button when collapsed */}
      {collapsed && <Button variant="outline" size="icon" className="absolute -right-3 top-14 z-50 h-6 w-6 rounded-full bg-card border shadow-md flex items-center justify-center" onClick={toggleCollapsed}>
          <ChevronRight className="h-3 w-3" />
        </Button>}

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1">
          {navItems.map(item => <li key={item.path}>
              {item.children && !collapsed ? <Collapsible open={isMenuOpen(item.path) || isActiveParent(item)} onOpenChange={() => toggleMenu(item.path)}>
                  <CollapsibleTrigger asChild>
                    <button className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors", "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-orange-100 dark:hover:bg-orange-900/30", isActiveParent(item) && "text-sidebar-foreground bg-orange-100 dark:bg-orange-900/30")}>
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
                </Collapsible> : <NavLink to={item.children ? item.children[0].path : item.path} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors", "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-orange-100 dark:hover:bg-orange-900/30", (item.children ? isActiveParent(item) : location.pathname.startsWith(item.path)) && "text-sidebar-foreground bg-orange-100 dark:bg-orange-900/30", collapsed && "justify-center")}>
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{getLabel(item.labelKey)}</span>}
                </NavLink>}
            </li>)}
        </ul>
      </nav>

      {/* Bottom items */}
      <div className="py-3 px-2">
        <ul className="space-y-1">
          {computedBottomItems.map(item => <li key={item.path}>
              <NavLink to={item.path} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors", "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-orange-100 dark:hover:bg-orange-900/30", location.pathname === item.path && "text-sidebar-foreground bg-orange-100 dark:bg-orange-900/30", collapsed && "justify-center")}>
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{getLabel(item.labelKey)}</span>}
              </NavLink>
            </li>)}
        </ul>
      </div>
    </aside>;
}