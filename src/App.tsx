import { lazy, Suspense, useEffect } from "react"; // refreshed
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SuperAdminRoute } from "@/components/guards/SuperAdminRoute";
import { AdminRoute } from "@/components/guards/AdminRoute";
import { PermissionGuard } from "@/components/guards/PermissionGuard";
import { ImpersonateBanner } from "@/components/admin/ImpersonateBanner";
import { AnnouncementBanner } from "@/components/announcements/AnnouncementBanner";
import { useForceRefreshListener } from "@/hooks/use-force-refresh";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PublicSiteProvider } from "@/contexts/PublicSiteContext";
import { SetupGuideDialog } from "@/components/setup-guide/SetupGuideDialog";

// Lazy imports - critical routes
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy imports - heavy pages
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Signup = lazy(() => import("./pages/Signup"));
const SelectOrganization = lazy(() => import("./pages/SelectOrganization"));
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
const AdminOnboarding = lazy(() => import("./pages/admin/AdminOnboarding"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Subscription = lazy(() => import("./pages/Subscription"));

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

const APIDocs = lazy(() => import("./pages/public/APIDocs"));

// Trial expired modal
const TrialExpiredModal = lazy(() => import("./components/admin/TrialExpiredModal").then(m => ({ default: m.TrialExpiredModal })));

function preloadCoreCrmPages() {
  void import("./pages/Dashboard");
  void import("./pages/Pipelines");
  void import("./pages/Contacts");
  void import("./pages/Conversations");
}

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
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 15,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse text-muted-foreground">Carregando...</div>
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile, isSuperAdmin, impersonating, organization, needsOrgSelection } = useAuth();
  
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile && !isSuperAdmin) return <PageLoader />;
  if (needsOrgSelection && !impersonating) return <Navigate to="/select-organization" replace />;
  if (isSuperAdmin && !impersonating && !organization) return <Navigate to="/admin" replace />;
  if (!isSuperAdmin && profile && !profile.organization_id) return <Navigate to="/onboarding" replace />;
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading, profile, isSuperAdmin, impersonating, needsOrgSelection } = useAuth();
  
  useForceRefreshListener();

  useEffect(() => {
    if (user && !loading) {
      // Delay preloading slightly to prioritize current page render
      const timer = setTimeout(preloadCoreCrmPages, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, loading]);

  const getDefaultRedirect = () => {
    if (needsOrgSelection && !impersonating) return "/select-organization";
    if (isSuperAdmin && !impersonating) return "/admin";
    return "/crm/conversas";
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
    // If user is logged in and already has an org, redirect
    if (user && profile && profile.organization_id) {
      return <Navigate to={getDefaultRedirect()} replace />;
    }
    // Otherwise show onboarding (works for both logged-in users without org AND public visitors)
    return <Suspense fallback={<PageLoader />}><Onboarding /></Suspense>;
  };

  const location = useLocation();
  const isResetPasswordRoute = location.pathname === '/reset-password';

  return (
    <>
      {!isResetPasswordRoute && <AnnouncementBanner />}
      {!isResetPasswordRoute && <ImpersonateBanner />}
      {!isResetPasswordRoute && <Suspense fallback={null}><TrialExpiredModal /></Suspense>}
      {!isResetPasswordRoute && user && profile && profile.organization_id && <SetupGuideDialog />}
      <ScrollToTop />
      <div className={impersonating ? "pt-12" : ""}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/auth" element={renderAuthRoute()} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/signup" element={<Suspense fallback={<PageLoader />}><Signup /></Suspense>} />
            <Route path="/onboarding" element={renderOnboardingRoute()} />
            <Route path="/checkout/:token" element={<Suspense fallback={<PageLoader />}><Checkout /></Suspense>} />
            <Route path="/assinatura" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
            <Route path="/select-organization" element={
              loading ? <PageLoader /> : !user ? <Navigate to="/auth" replace /> : 
              <Suspense fallback={<PageLoader />}><SelectOrganization /></Suspense>
            } />
            
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
            <Route path="/admin/onboarding" element={<SuperAdminRoute><AdminOnboarding /></SuperAdminRoute>} />
            
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
            <Route path="/automations" element={<ProtectedRoute><PermissionGuard permission="automations_view"><Automations /></PermissionGuard></ProtectedRoute>} />
            
            {/* Public Site Preview */}
            <Route path="/site/preview/*" element={<PreviewSiteWrapper />} />
            <Route path="/site/previsualização/*" element={<PreviewSiteWrapper />} />
            
            {/* Published Sites */}
            <Route path="/sites/:slug/*" element={<PublishedSiteWrapper />} />
            
            {/* Public API Documentation */}
            <Route path="/docs/api" element={<APIDocs />} />
            
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
