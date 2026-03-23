import { lazy, Suspense } from "react";
import logoWhite from "@/assets/logo-white.png";
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
import { ImpersonateBanner } from "@/components/admin/ImpersonateBanner";
import { AnnouncementBanner } from "@/components/announcements/AnnouncementBanner";
import { useForceRefreshListener } from "@/hooks/use-force-refresh";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PublicSiteProvider } from "@/contexts/PublicSiteContext";

// Eager imports - lightweight/critical
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy imports - heavy pages
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Pipelines = lazy(() => import("./pages/Pipelines"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Properties = lazy(() => import("./pages/Properties"));
const PropertyForm = lazy(() => import("./pages/PropertyForm"));
const PropertyRentals = lazy(() => import("./pages/PropertyRentals"));
const PropertyLocations = lazy(() => import("./pages/PropertyLocations"));
const CRMManagement = lazy(() => import("./pages/CRMManagement"));
const Settings = lazy(() => import("./pages/Settings"));
const SiteSettings = lazy(() => import("./pages/SiteSettings"));
const Help = lazy(() => import("./pages/Help"));
const Conversations = lazy(() => import("./pages/Conversations"));
const Agenda = lazy(() => import("./pages/Agenda"));
const FinancialDashboard = lazy(() => import("./pages/FinancialDashboard"));
const FinancialEntries = lazy(() => import("./pages/FinancialEntries"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Commissions = lazy(() => import("./pages/Commissions"));
const FinancialReports = lazy(() => import("./pages/FinancialReports"));
const FinancialDRE = lazy(() => import("./pages/FinancialDRE"));
const MetaSettings = lazy(() => import("./pages/MetaSettings"));
const Automations = lazy(() => import("./pages/Automations"));
const Notifications = lazy(() => import("./pages/Notifications"));

// Telecom pages
const ServicePlans = lazy(() => import("./pages/ServicePlans"));
const CoverageAreas = lazy(() => import("./pages/CoverageAreas"));
const TelecomCustomers = lazy(() => import("./pages/TelecomCustomers"));
const TelecomBilling = lazy(() => import("./pages/TelecomBilling"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminOrganizations = lazy(() => import("./pages/admin/AdminOrganizations"));
const AdminOrganizationDetail = lazy(() => import("./pages/admin/AdminOrganizationDetail"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminAudit = lazy(() => import("./pages/admin/AdminAudit"));
const AdminRequests = lazy(() => import("./pages/admin/AdminRequests"));
const AdminPlans = lazy(() => import("./pages/admin/AdminPlans"));
const AdminAnnouncements = lazy(() => import("./pages/admin/AdminAnnouncements"));
const AdminHelpEditor = lazy(() => import("./pages/admin/AdminHelpEditor"));
const AdminDatabase = lazy(() => import("./pages/admin/AdminDatabase"));

// Public site pages
const PublicSiteLayout = lazy(() => import("./pages/public/PublicSiteLayout"));
const PublicHome = lazy(() => import("./pages/public/PublicHome"));
const PublicProperties = lazy(() => import("./pages/public/PublicProperties"));
const PublicPropertyDetail = lazy(() => import("./pages/public/PublicPropertyDetail"));
const PublicAbout = lazy(() => import("./pages/public/PublicAbout"));
const PublicContact = lazy(() => import("./pages/public/PublicContact"));
const PublicFavorites = lazy(() => import("./pages/public/PublicFavorites"));
const PreviewSiteWrapper = lazy(() => import("./pages/public/PreviewSiteWrapper"));
const PublishedSiteWrapper = lazy(() => import("./pages/public/PublishedSiteWrapper"));

// Trial expired modal
const TrialExpiredModal = lazy(() => import("./components/admin/TrialExpiredModal").then(m => ({ default: m.TrialExpiredModal })));

function isCustomDomain(): boolean {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  if (pathname.startsWith('/sites/')) return false;
  
  return (
    hostname !== 'localhost' &&
    !hostname.includes('lovable.app') &&
    !hostname.includes('lovable.dev') &&
    !hostname.includes('lovableproject.com') &&
    !hostname.includes('vettercompany.com.br')
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

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      {/* Animated logo/spinner */}
      <div className="relative w-14 h-14">
        <div
          className="absolute inset-0 rounded-xl bg-primary/20"
          style={{
            animation: 'loader-pulse 1.8s cubic-bezier(0.4,0,0.6,1) infinite',
          }}
        />
        <div
          className="absolute inset-1 rounded-lg bg-primary/30"
          style={{
            animation: 'loader-pulse 1.8s cubic-bezier(0.4,0,0.6,1) infinite 0.2s',
          }}
        />
        <div
          className="absolute inset-2 rounded-md bg-primary flex items-center justify-center"
          style={{
            animation: 'loader-pulse 1.8s cubic-bezier(0.4,0,0.6,1) infinite 0.4s',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
      </div>
      {/* Animated dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary/60"
            style={{
              animation: 'loader-bounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
    <style>{`
      @keyframes loader-pulse {
        0%, 100% { opacity: 0.4; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.08); }
      }
      @keyframes loader-bounce {
        0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
        40% { opacity: 1; transform: scale(1.3); }
      }
    `}</style>
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile, isSuperAdmin, impersonating, organization } = useAuth();
  
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile && !isSuperAdmin) return <PageLoader />;
  if (isSuperAdmin && !impersonating && !organization) return <Navigate to="/admin" replace />;
  if (!isSuperAdmin && profile && !profile.organization_id) return <Navigate to="/onboarding" replace />;
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading, profile, isSuperAdmin, impersonating } = useAuth();
  
  useForceRefreshListener();

  const getDefaultRedirect = () => {
    if (isSuperAdmin && !impersonating) return "/admin";
    return "/dashboard";
  };

  const renderAuthRoute = () => {
    if (loading) return <PageLoader />;
    if (user) {
      if (!profile && !isSuperAdmin) return <PageLoader />;
      return <Navigate to={getDefaultRedirect()} replace />;
    }
    return <Auth />;
  };

  const renderOnboardingRoute = () => {
    if (loading) return <PageLoader />;
    if (user && profile && !profile.organization_id && !isSuperAdmin) {
      return <Suspense fallback={<PageLoader />}><Onboarding /></Suspense>;
    }
    return <Navigate to={getDefaultRedirect()} replace />;
  };

  return (
    <>
      <AnnouncementBanner />
      <ImpersonateBanner />
      <Suspense fallback={null}><TrialExpiredModal /></Suspense>
      <ScrollToTop />
      <div className={impersonating ? "pt-12" : ""}>
        <Suspense fallback={<PageLoader />}>
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
            <Route path="/properties/new" element={<ProtectedRoute><PropertyForm /></ProtectedRoute>} />
            <Route path="/properties/:id/edit" element={<ProtectedRoute><PropertyForm /></ProtectedRoute>} />
            <Route path="/properties/rentals" element={<ProtectedRoute><PropertyRentals /></ProtectedRoute>} />
            <Route path="/properties/condominiums" element={<ProtectedRoute><PropertyLocations /></ProtectedRoute>} />
            <Route path="/properties/locations" element={<ProtectedRoute><PropertyLocations /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/settings/site" element={<ProtectedRoute><AdminRoute><SiteSettings /></AdminRoute></ProtectedRoute>} />
            <Route path="/settings/integrations/meta" element={<ProtectedRoute><MetaSettings /></ProtectedRoute>} />
            <Route path="/crm/conversas" element={<ProtectedRoute><Conversations /></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
            
            {/* Financial Module */}
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
            <Route path="/site/previsualização/*" element={<PreviewSiteWrapper />} />
            
            {/* Published Sites */}
            <Route path="/sites/:slug/*" element={<PublishedSiteWrapper />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </>
  );
}

function CustomDomainRoutes() {
  return (
    <PublicSiteProvider>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
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
