import React, { useState, useMemo } from 'react';
import { LayoutDashboard, Kanban, Building2, Shuffle, Shield, Settings, HelpCircle, ChevronDown, ChevronLeft, ChevronRight, Users, MessageSquare, Calendar, DollarSign, FileText, Receipt, TrendingUp, BarChart3, Zap, Package, MapPin, UserCheck, Globe, PieChart } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { AnimatedIcon } from '@/components/icons/AnimatedIcon';
import GLOBE_JSON from '@/components/icons/globe-icon.json';
import AVATAR_JSON from '@/components/icons/avatar-icon.json';
import CALENDAR_JSON from '@/components/icons/calendar-icon.json';
import FINANCE_JSON from '@/components/icons/finance-icon.json';
import MANAGEMENT_JSON from '@/components/icons/management-icon.json';
import DASHBOARD_JSON from '@/components/icons/dashboard-icon.json';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useOrganizationModules } from '@/hooks/use-organization-modules';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useSidebar } from '@/contexts/SidebarContext';
import { useSystemSettings } from '@/hooks/use-system-settings';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
interface NavItem {
  icon: React.ElementType;
  labelKey: string;
  path: string;
  module?: string;
  permission?: string;
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
  icon: WhatsAppIcon,
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
  }, {
    icon: BarChart3,
    labelKey: 'dre',
    path: '/financeiro/dre'
  }]
},
// Imobiliária module with submenu
{
  icon: Building2,
  labelKey: 'properties',
  path: '/properties',
  module: 'properties',
  children: [{
    icon: Building2,
    labelKey: 'propertiesAll',
    path: '/properties'
  }, {
    icon: Building2,
    labelKey: 'propertiesRentals',
    path: '/properties/rentals'
  }, {
    icon: Building2,
    labelKey: 'propertiesCondos',
    path: '/properties/condominiums'
  }, {
    icon: MapPin,
    labelKey: 'propertiesLocations',
    path: '/properties/locations'
  }]
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
  module: 'automations'
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
}];

function SidebarIcon({ item, size = 20, className }: { item: NavItem; size?: number; className?: string }) {
  if (item.icon === WhatsAppIcon) {
    return <WhatsAppIcon size={size + 4} className={cn("flex-shrink-0", className)} trigger="hover" />;
  }
  if (item.icon === LayoutDashboard) {
    return <AnimatedIcon icon={DASHBOARD_JSON} size={size + 4} className={cn("flex-shrink-0", className)} trigger="hover" />;
  }
  if (item.icon === Users) {
    return <AnimatedIcon icon={AVATAR_JSON} size={size + 4} trigger="hover" className={cn("flex-shrink-0", className)} />;
  }
  if (item.icon === Calendar) {
    return <AnimatedIcon icon={CALENDAR_JSON} size={size + 4} className={cn("flex-shrink-0", className)} trigger="hover" />;
  }
  if (item.icon === DollarSign) {
    return <AnimatedIcon icon={FINANCE_JSON} size={size + 4} className={cn("flex-shrink-0", className)} trigger="hover" />;
  }
  if (item.icon === Shuffle) {
    return <AnimatedIcon icon={MANAGEMENT_JSON} size={size + 4} className={cn("flex-shrink-0", className)} trigger="hover" />;
  }
  if (item.labelKey === 'mySite') {
    return <AnimatedIcon icon={GLOBE_JSON} size={size + 6} trigger="hover" className={cn("flex-shrink-0", className)} />;
  }

  const Icon = item.icon;
  return <Icon className={cn(`h-${Math.round(size/4)} w-${Math.round(size/4)} flex-shrink-0`, className)} />;
}

export const AppSidebar = React.memo(function AppSidebar() {
  const location = useLocation();
...
  </aside>;
});