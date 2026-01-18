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
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Calendar,
  MessageSquare,
  Zap,
  DollarSign,
  BarChart3,
  Settings,
  HelpCircle,
  Bell,
  Menu,
  X,
  ChevronLeft,
  LogOut,
  User,
  Shield,
  Briefcase,
  Phone,
  Tags,
} from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  icon: ReactNode;
  label: string;
  href: string;
  badge?: number;
}

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

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const content = (
      <Link
        to={item.href}
        onClick={() => isMobile && close()}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          isCollapsed && !isMobile && "justify-center px-2"
        )}
      >
        {item.icon}
        {(!isCollapsed || isMobile) && <span>{item.label}</span>}
        {item.badge && (!isCollapsed || isMobile) && (
          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-xs">
            {item.badge}
          </span>
        )}
      </Link>
    );

    if (isCollapsed && !isMobile) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn("flex h-16 items-center border-b px-4", isCollapsed && !isMobile && "justify-center px-2")}>
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          {(!isCollapsed || isMobile) && (
            <span className="text-xl font-bold">Vimob</span>
          )}
        </Link>
        {isMobile && (
          <Button variant="ghost" size="icon" className="ml-auto" onClick={close}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        <div className="my-4 border-t" />

        <nav className="space-y-1">
          {secondaryNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {isSuperAdmin && (
          <>
            <div className="my-4 border-t" />
            <nav className="space-y-1">
              <NavLink
                item={{
                  icon: <Shield className="h-5 w-5" />,
                  label: t("nav.admin"),
                  href: "/admin",
                }}
              />
            </nav>
          </>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-3 space-y-1">
        <NavLink
          item={{
            icon: <Settings className="h-5 w-5" />,
            label: t("nav.settings"),
            href: "/settings",
          }}
        />
        <NavLink
          item={{
            icon: <HelpCircle className="h-5 w-5" />,
            label: t("nav.help"),
            href: "/help",
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Backdrop for mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-300",
          isMobile
            ? isOpen
              ? "translate-x-0 w-64"
              : "-translate-x-full w-64"
            : isCollapsed
            ? "w-16"
            : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300",
          !isMobile && (isCollapsed ? "ml-16" : "ml-64")
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Button variant="ghost" size="icon" onClick={toggle}>
            {isMobile ? (
              <Menu className="h-5 w-5" />
            ) : (
              <ChevronLeft
                className={cn(
                  "h-5 w-5 transition-transform",
                  isCollapsed && "rotate-180"
                )}
              />
            )}
          </Button>

          {/* Organization name */}
          {organization && (
            <div className="hidden sm:flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{organization.name}</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Notifications */}
            <Button variant="ghost" size="icon" asChild>
              <Link to="/notifications">
                <Bell className="h-5 w-5" />
              </Link>
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{profile?.name}</p>
                    <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <User className="mr-2 h-4 w-4" />
                    {t("nav.profile")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    {t("nav.settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("auth.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
