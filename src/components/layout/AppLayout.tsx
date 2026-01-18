import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, Users, Building2, FileText, Calendar, MessageSquare, Zap,
  DollarSign, BarChart3, Settings, HelpCircle, Bell, Menu, X, ChevronLeft,
  LogOut, User, Shield, Briefcase, Phone, Tags, Sparkles,
} from "lucide-react";

interface AppLayoutProps { children: ReactNode; }
interface NavItem { icon: ReactNode; label: string; href: string; badge?: number; }

export default function AppLayout({ children }: AppLayoutProps) {
  const { isOpen, isCollapsed, isMobile, toggle, close } = useSidebar();
  const { profile, organization, signOut, isSuperAdmin } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const mainNavItems: NavItem[] = [
    { icon: <LayoutDashboard className="h-5 w-5" />, label: t("nav.dashboard"), href: "/" },
    { icon: <Users className="h-5 w-5" />, label: t("nav.contacts"), href: "/contacts" },
    { icon: <Building2 className="h-5 w-5" />, label: t("nav.properties"), href: "/properties" },
    { icon: <FileText className="h-5 w-5" />, label: t("nav.contracts"), href: "/contracts" },
    { icon: <Calendar className="h-5 w-5" />, label: t("nav.agenda"), href: "/agenda" },
    { icon: <MessageSquare className="h-5 w-5" />, label: t("nav.conversations"), href: "/conversations" },
    { icon: <Zap className="h-5 w-5" />, label: t("nav.automations"), href: "/automations" },
  ];

  const secondaryNavItems: NavItem[] = [
    { icon: <DollarSign className="h-5 w-5" />, label: t("nav.financial"), href: "/financial" },
    { icon: <BarChart3 className="h-5 w-5" />, label: "Performance", href: "/performance" },
    { icon: <Phone className="h-5 w-5" />, label: "Telefonia", href: "/telephony" },
    { icon: <Tags className="h-5 w-5" />, label: t("nav.crm"), href: "/crm" },
  ];

  const isActive = (href: string) => href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const content = (
      <Link
        to={item.href}
        onClick={() => isMobile && close()}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          isCollapsed && !isMobile && "justify-center px-2"
        )}
      >
        <span className={cn("transition-transform duration-200", !active && "group-hover:scale-110")}>
          {item.icon}
        </span>
        {(!isCollapsed || isMobile) && <span>{item.label}</span>}
        {item.badge && (!isCollapsed || isMobile) && (
          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold">
            {item.badge}
          </span>
        )}
      </Link>
    );

    if (isCollapsed && !isMobile) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
        </Tooltip>
      );
    }
    return content;
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn("flex h-16 items-center border-b border-sidebar-border px-4", isCollapsed && !isMobile && "justify-center px-2")}>
        <Link to="/" className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight">Vimob</span>
              <span className="text-[10px] text-muted-foreground -mt-0.5">CRM Imobiliário</span>
            </div>
          )}
        </Link>
        {isMobile && (
          <Button variant="ghost" size="icon" className="ml-auto rounded-xl" onClick={close}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <div className="my-4 px-3">
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        <div className="space-y-1">
          {secondaryNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {isSuperAdmin && (
          <>
            <div className="my-4 px-3">
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
            <NavLink
              item={{ icon: <Shield className="h-5 w-5" />, label: t("nav.admin"), href: "/admin" }}
            />
          </>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <NavLink item={{ icon: <Settings className="h-5 w-5" />, label: t("nav.settings"), href: "/settings" }} />
        <NavLink item={{ icon: <HelpCircle className="h-5 w-5" />, label: t("nav.help"), href: "/help" }} />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Backdrop for mobile */}
      {isMobile && isOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={close} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
          isMobile ? (isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64") : isCollapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className={cn("flex flex-1 flex-col transition-all duration-300", !isMobile && (isCollapsed ? "ml-16" : "ml-64"))}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-xl">
          <Button variant="ghost" size="icon" onClick={toggle} className="rounded-xl hover:bg-accent">
            {isMobile ? <Menu className="h-5 w-5" /> : <ChevronLeft className={cn("h-5 w-5 transition-transform duration-300", isCollapsed && "rotate-180")} />}
          </Button>

          {organization && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{organization.name}</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild className="rounded-xl hover:bg-accent">
              <Link to="/notifications"><Bell className="h-5 w-5" /></Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-xl hover:bg-accent">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-xl" align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold">{profile?.name}</p>
                    <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                  <Link to="/settings"><User className="mr-2 h-4 w-4" />{t("nav.profile")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                  <Link to="/settings"><Settings className="mr-2 h-4 w-4" />{t("nav.settings")}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="rounded-lg cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />{t("auth.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
