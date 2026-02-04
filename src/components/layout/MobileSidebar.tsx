import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganizationModules } from '@/hooks/use-organization-modules';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useSystemSettings } from '@/hooks/use-system-settings';
import {
  Menu,
  LayoutDashboard,
  Kanban,
  Users,
  Calendar,
  Building2,
  DollarSign,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Shuffle,
  MessageSquare,
  TrendingUp,
  Receipt,
  FileText,
  Zap,
  Package,
  MapPin,
  UserCheck,
  Globe,
  Settings,
  HelpCircle,
} from 'lucide-react';

interface NavItem {
  icon: any;
  labelKey: string;
  path: string;
  module?: string;
  permission?: string;
  adminOnly?: boolean;
  children?: NavItem[];
}

// Exact same nav items as AppSidebar (desktop)
const allNavItems: NavItem[] = [
  { icon: LayoutDashboard, labelKey: 'dashboard', path: '/dashboard' },
  { icon: Kanban, labelKey: 'pipelines', path: '/crm/pipelines', module: 'crm' },
  { icon: MessageSquare, labelKey: 'conversations', path: '/crm/conversas', module: 'whatsapp' },
  { icon: Users, labelKey: 'contacts', path: '/crm/contacts', module: 'crm' },
  { 
    icon: DollarSign, 
    labelKey: 'financial', 
    path: '/financeiro',
    module: 'financial',
    adminOnly: true,
    children: [
      { icon: TrendingUp, labelKey: 'financialDashboard', path: '/financeiro' },
      { icon: Receipt, labelKey: 'entries', path: '/financeiro/contas' },
      { icon: FileText, labelKey: 'contracts', path: '/financeiro/contratos' },
      { icon: DollarSign, labelKey: 'commissions', path: '/financeiro/comissoes' },
      { icon: BarChart3, labelKey: 'reports', path: '/financeiro/relatorios' },
    ]
  },
  // Imobiliária module
  { icon: Building2, labelKey: 'properties', path: '/properties', module: 'properties' },
  // Telecom modules
  { icon: Package, labelKey: 'plans', path: '/plans', module: 'plans' },
  { icon: MapPin, labelKey: 'coverage', path: '/coverage', module: 'coverage' },
  { icon: UserCheck, labelKey: 'telecomCustomers', path: '/telecom/customers', module: 'telecom' },
  // Admin modules
  { icon: BarChart3, labelKey: 'performance', path: '/reports/performance', module: 'performance' },
  { icon: Shuffle, labelKey: 'crmManagement', path: '/crm/management', module: 'crm', adminOnly: true },
  { icon: Calendar, labelKey: 'schedule', path: '/agenda', module: 'agenda' },
  { icon: Zap, labelKey: 'automations', path: '/automations', module: 'automations', adminOnly: true },
];

const bottomItems: NavItem[] = [
  { icon: Globe, labelKey: 'mySite', path: '/settings/site', adminOnly: true, module: 'site' },
  { icon: Settings, labelKey: 'settings', path: '/settings' },
  { icon: HelpCircle, labelKey: 'help', path: '/help' },
];
export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, isSuperAdmin, organization } = useAuth();
  const { t } = useLanguage();
  const { hasModule, isLoading: modulesLoading } = useOrganizationModules();
  const { hasPermission } = useUserPermissions();
  const { data: systemSettings } = useSystemSettings();
  const { resolvedTheme } = useTheme();

  // Theme-based logo logic (same as desktop)
  const logoUrl = useMemo(() => {
    if (resolvedTheme === 'dark' && systemSettings?.logo_url_dark) {
      return systemSettings.logo_url_dark;
    }
    if (systemSettings?.logo_url_light) {
      return systemSettings.logo_url_light;
    }
    return null;
  }, [resolvedTheme, systemSettings]);

  // Filter nav items based on enabled modules, user role, permissions, and organization segment
  // While modules are loading, only show items without module requirement to prevent flash
  const navItems = useMemo(() => {
    return allNavItems.filter(item => {
      // If modules are still loading and this item requires a module, hide it to prevent flash
      if (modulesLoading && item.module) return false;
      if (item.module && !hasModule(item.module as any)) return false;
      if (item.adminOnly && profile?.role !== 'admin' && !isSuperAdmin) return false;
      // Check permission-based access
      if (item.permission && !hasPermission(item.permission)) return false;
      // Hide Contacts menu for telecom segment
      if (item.path === '/crm/contacts' && organization?.segment === 'telecom') return false;
      // Hide Performance for non-admins in imobiliário segment (keep visible for telecom)
      if (item.path === '/reports/performance' && organization?.segment !== 'telecom' && profile?.role !== 'admin' && !isSuperAdmin) return false;
      return true;
    });
  }, [hasModule, hasPermission, profile?.role, isSuperAdmin, organization?.segment, modulesLoading]);

  // Filter bottom items based on user role and modules
  // While modules are loading, hide module-dependent items to prevent flash
  const computedBottomItems = useMemo(() => {
    return bottomItems.filter(item => {
      if (item.adminOnly && profile?.role !== 'admin' && !isSuperAdmin) return false;
      // If modules are still loading and this item requires a module, hide it
      if (modulesLoading && item.module) return false;
      if (item.module && !hasModule(item.module as any)) return false;
      return true;
    });
  }, [profile?.role, isSuperAdmin, hasModule, modulesLoading]);

  // Helper to get label from translation
  const getLabel = (labelKey: string): string => {
    return (t.nav as Record<string, string>)[labelKey] || labelKey;
  };

  const toggleMenu = (path: string) => {
    setOpenMenus(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  const isMenuOpen = (path: string) => openMenus.includes(path);

  const isActiveParent = (item: NavItem) => {
    if (item.children) {
      return item.children.some(child => location.pathname === child.path);
    }
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
        {/* Logo header */}
        <div className="p-4 pr-12 border-b border-border">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="object-contain"
              style={{
                maxWidth: systemSettings?.logo_width || 160,
                maxHeight: systemSettings?.logo_height || 48
              }}
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">V</span>
            </div>
          )}
        </div>
        
        {/* Navigation - main scrollable area */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isOpen = isMenuOpen(item.path) || isActiveParent(item);
              
              if (item.children) {
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => toggleMenu(item.path)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                        isActiveParent(item)
                          ? "bg-accent text-accent-foreground" 
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <span>{getLabel(item.labelKey)}</span>
                      </div>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {isOpen && (
                      <ul className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                        {item.children.map((child) => (
                          <li key={child.path}>
                            <button
                              onClick={() => handleNavigation(child.path)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                                location.pathname === child.path
                                  ? "bg-accent text-accent-foreground font-medium"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              )}
                            >
                              <child.icon className="h-4 w-4" />
                              <span>{getLabel(child.labelKey)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }

              return (
                <li key={item.path}>
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActiveParent(item)
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{getLabel(item.labelKey)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom items */}
        <div className="py-3 px-3 border-t border-border">
          <ul className="space-y-1">
            {computedBottomItems.map(item => (
              <li key={item.path}>
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                    location.pathname === item.path
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{getLabel(item.labelKey)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
