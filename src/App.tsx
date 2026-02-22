import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SuperAdminRoute } from "@/components/guards/SuperAdminRoute";
import { AdminRoute } from "@/components/guards/AdminRoute";
import { PermissionGuard } from "@/components/guards/PermissionGuard";
import { ImpersonateBanner } from "@/components/admin/ImpersonateBanner";
import { AnnouncementBanner } from "@/components/announcements/AnnouncementBanner";
import { useForceRefreshListener } from "@/hooks/use-force-refresh";


import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Pipelines from "./pages/Pipelines";
import Contacts from "./pages/Contacts";
import Properties from "./pages/Properties";
import PropertyRentals from "./pages/PropertyRentals";
import PropertyLocations from "./pages/PropertyLocations";
import CRMManagement from "./pages/CRMManagement";
import Settings from "./pages/Settings";
import SiteSettings from "./pages/SiteSettings";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import Conversations from "./pages/Conversations";
import Agenda from "./pages/Agenda";
import FinancialDashboard from "./pages/FinancialDashboard";
import FinancialEntries from "./pages/FinancialEntries";
import Contracts from "./pages/Contracts";
import Commissions from "./pages/Commissions";
import FinancialReports from "./pages/FinancialReports";
import FinancialDRE from "./pages/FinancialDRE";

import MetaSettings from "./pages/MetaSettings";
import Automations from "./pages/Automations";

// Telecom pages
import ServicePlans from "./pages/ServicePlans";
import CoverageAreas from "./pages/CoverageAreas";
import TelecomCustomers from "./pages/TelecomCustomers";
import TelecomBilling from "./pages/TelecomBilling";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminOrganizationDetail from "./pages/admin/AdminOrganizationDetail";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminHelpEditor from "./pages/admin/AdminHelpEditor";
import AdminDatabase from "./pages/admin/AdminDatabase";

import { TrialExpiredModal } from "./components/admin/TrialExpiredModal";
import Notifications from "./pages/Notifications";

// Public site pages
import PublicSiteLayout from "./pages/public/PublicSiteLayout";
import PublicHome from "./pages/public/PublicHome";
import PublicProperties from "./pages/public/PublicProperties";
import PublicPropertyDetail from "./pages/public/PublicPropertyDetail";
import PublicAbout from "./pages/public/PublicAbout";
import PublicContact from "./pages/public/PublicContact";
import PreviewSiteWrapper from "./pages/public/PreviewSiteWrapper";
import PublishedSiteWrapper from "./pages/public/PublishedSiteWrapper";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PublicSiteProvider } from "@/contexts/PublicSiteContext";
import PublicFavorites from "./pages/public/PublicFavorites";

function isCustomDomain(): boolean {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  // If accessing /sites/ routes, it's the published site wrapper, not custom domain
  if (pathname.startsWith('/sites/')) return false;
  
  return (
    hostname !== 'localhost' &&
    !hostname.includes('lovable.app') &&
    !hostname.includes('lovable.dev') &&
    !hostname.includes('lovableproject.com')
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile, isSuperAdmin, impersonating, organization } = useAuth();
  
  // Ainda carregando autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }
  
  // Não autenticado
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // User existe mas profile ainda não carregou - aguardar
  if (!profile && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando perfil...</div>
      </div>
    );
  }

  // Super admin NEVER goes to onboarding - always to admin panel when no org
  if (isSuperAdmin && !impersonating && !organization) {
    return <Navigate to="/admin" replace />;
  }

  // Usuário regular sem organização -> onboarding (never super admin)
  if (!isSuperAdmin && profile && !profile.organization_id) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading, profile, isSuperAdmin, impersonating } = useAuth();
  
  // Listen for force refresh broadcasts from admin
  useForceRefreshListener();

  // Determine default redirect for authenticated users
  const getDefaultRedirect = () => {
    if (isSuperAdmin && !impersonating) {
      return "/admin";
    }
    return "/dashboard";
  };

  // Renderiza elemento para rota /auth
  const renderAuthRoute = () => {
    // Se está carregando, mostra loading
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      );
    }
    
    // Se user existe
    if (user) {
      // Se profile ainda não carregou e não é super admin, aguarda
      if (!profile && !isSuperAdmin) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-pulse text-muted-foreground">Carregando perfil...</div>
          </div>
        );
      }
      // Profile carregou ou é super admin, redireciona
      return <Navigate to={getDefaultRedirect()} replace />;
    }
    
    // Não autenticado, mostra login
    return <Auth />;
  };

  // Renderiza elemento para rota /onboarding
  const renderOnboardingRoute = () => {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      );
    }
    
    // User autenticado, com profile carregado, sem org, não é super admin
    if (user && profile && !profile.organization_id && !isSuperAdmin) {
      return <Onboarding />;
    }
    
    return <Navigate to={getDefaultRedirect()} replace />;
  };

  return (
    <>
      {/* Show announcement banner at very top */}
      <AnnouncementBanner />
      
      {/* Show impersonate banner when super admin is viewing as another org */}
      <ImpersonateBanner />
      
      {/* Trial expired modal */}
      <TrialExpiredModal />
      
      <ScrollToTop />
      <div className={impersonating ? "pt-12" : ""}>
        <Routes>
          <Route path="/auth" element={renderAuthRoute()} />
          <Route path="/onboarding" element={renderOnboardingRoute()} />
          
          {/* Super Admin Routes */}
          <Route path="/admin" element={<SuperAdminRoute><AdminDashboard /></SuperAdminRoute>} />
          <Route path="/admin/organizations" element={<SuperAdminRoute><AdminOrganizations /></SuperAdminRoute>} />
          <Route path="/admin/organizations/:id" element={<SuperAdminRoute><AdminOrganizationDetail /></SuperAdminRoute>} />
          <Route path="/admin/users" element={<SuperAdminRoute><AdminUsers /></SuperAdminRoute>} />
          <Route path="/admin/plans" element={<SuperAdminRoute><AdminPlans /></SuperAdminRoute>} />
          <Route path="/admin/announcements" element={<SuperAdminRoute><AdminAnnouncements /></SuperAdminRoute>} />
          <Route path="/admin/help-editor" element={<SuperAdminRoute><AdminHelpEditor /></SuperAdminRoute>} />
          <Route path="/admin/database" element={<SuperAdminRoute><AdminDatabase /></SuperAdminRoute>} />
          <Route path="/admin/settings" element={<SuperAdminRoute><AdminSettings /></SuperAdminRoute>} />
          <Route path="/admin/requests" element={<SuperAdminRoute><AdminRequests /></SuperAdminRoute>} />
          <Route path="/admin/audit" element={<SuperAdminRoute><AdminAudit /></SuperAdminRoute>} />
          
          
          {/* Regular Routes */}
          <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/crm/pipelines" element={<ProtectedRoute><Pipelines /></ProtectedRoute>} />
          <Route path="/crm/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
          <Route path="/crm/management" element={<ProtectedRoute><AdminRoute><CRMManagement /></AdminRoute></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
          <Route path="/properties" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
          <Route path="/properties/rentals" element={<ProtectedRoute><PropertyRentals /></ProtectedRoute>} />
          <Route path="/properties/condominiums" element={<ProtectedRoute><PropertyLocations /></ProtectedRoute>} />
          <Route path="/properties/locations" element={<ProtectedRoute><PropertyLocations /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/settings/site" element={<ProtectedRoute><AdminRoute><SiteSettings /></AdminRoute></ProtectedRoute>} />
          <Route path="/settings/integrations/meta" element={<ProtectedRoute><MetaSettings /></ProtectedRoute>} />
          <Route path="/crm/conversas" element={<ProtectedRoute><Conversations /></ProtectedRoute>} />
          <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
          
          {/* Financial Module - Admin Only */}
          <Route path="/financeiro" element={<ProtectedRoute><AdminRoute><FinancialDashboard /></AdminRoute></ProtectedRoute>} />
          <Route path="/financeiro/contas" element={<ProtectedRoute><AdminRoute><FinancialEntries /></AdminRoute></ProtectedRoute>} />
          <Route path="/financeiro/contratos" element={<ProtectedRoute><AdminRoute><Contracts /></AdminRoute></ProtectedRoute>} />
          <Route path="/financeiro/comissoes" element={<ProtectedRoute><AdminRoute><Commissions /></AdminRoute></ProtectedRoute>} />
          <Route path="/financeiro/relatorios" element={<ProtectedRoute><AdminRoute><FinancialReports /></AdminRoute></ProtectedRoute>} />
          <Route path="/financeiro/dre" element={<ProtectedRoute><AdminRoute><FinancialDRE /></AdminRoute></ProtectedRoute>} />
          
          
          {/* Telecom Module */}
          <Route path="/plans" element={<ProtectedRoute><ServicePlans /></ProtectedRoute>} />
          <Route path="/coverage" element={<ProtectedRoute><CoverageAreas /></ProtectedRoute>} />
          <Route path="/telecom/customers" element={<ProtectedRoute><TelecomCustomers /></ProtectedRoute>} />
          <Route path="/telecom/billing" element={<ProtectedRoute><TelecomBilling /></ProtectedRoute>} />
          
          {/* Automations */}
          <Route path="/automations" element={<ProtectedRoute><AdminRoute><Automations /></AdminRoute></ProtectedRoute>} />
          
          {/* Public Site Preview */}
          <Route path="/site/preview/*" element={<PreviewSiteWrapper />} />
          {/* Legacy route with special characters - redirect to new route */}
          <Route path="/site/previsualização/*" element={<PreviewSiteWrapper />} />
          
          {/* Published Sites - accessible via slug */}
          <Route path="/sites/:slug/*" element={<PublishedSiteWrapper />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  );
}

function CustomDomainRoutes() {
  return (
    <PublicSiteProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<PublicSiteLayout />}>
          <Route index element={<PublicHome />} />
          <Route path="imoveis" element={<PublicProperties />} />
          <Route path="imoveis/:codigo" element={<PublicPropertyDetail />} />
          <Route path="imovel/:code" element={<PublicPropertyDetail />} />
          <Route path="sobre" element={<PublicAbout />} />
          <Route path="contato" element={<PublicContact />} />
          <Route path="favoritos" element={<PublicFavorites />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PublicSiteProvider>
  );
}

const App = () => {
  const customDomain = isCustomDomain();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {customDomain ? (
              <LanguageProvider>
                <CustomDomainRoutes />
              </LanguageProvider>
            ) : (
              <AuthProvider>
                <LanguageProvider>
                  <AppRoutes />
                </LanguageProvider>
              </AuthProvider>
            )}
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
