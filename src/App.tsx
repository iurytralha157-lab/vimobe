import { lazy, Suspense, useEffect } from "react";
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
import { useSystemBranding } from "@/hooks/use-system-branding";
import { SetupGuideDialog } from "@/components/setup-guide/SetupGuideDialog";
import { MetricsPanel } from "@/components/MetricsPanel";

// Public site root — separate bundle, no CRM providers
const PublicAppRoot = lazy(() => import("./PublicAppRoot"));

// Lazy imports - critical routes
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy imports - heavy pages
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Signup = lazy(() => import("./pages/Signup"));
const SelectOrganization = lazy(() => import("./pages/SelectOrganization"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CampaignDashboard = lazy(() => import("./pages/CampaignDashboard"));
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
const ContractDetails = lazy(() => import("./pages/ContractDetails"));
const Commissions = lazy(() => import("./pages/Commissions"));
const BrokerFinancialPanel = lazy(() => import("./pages/BrokerFinancialPanel"));
const FinancialReports = lazy(() => import("./pages/FinancialReports"));
const FinancialDRE = lazy(() => import("./pages/FinancialDRE"));
const MetaSettings = lazy(() => import("./pages/MetaSettings"));
const Automations = lazy(() => import("./pages/Automations"));
const Notifications = lazy(() => import("./pages/Notifications"));
const GamificationLayout = lazy(() => import("./pages/gamification/GamificationLayout"));
const GamificationDashboard = lazy(() => import("./pages/gamification/GamificationDashboard"));
const GamificationRanking = lazy(() => import("./pages/gamification/GamificationRanking"));
const GamificationAdmin = lazy(() => import("./pages/gamification/GamificationAdmin"));
const GamificationHistory = lazy(() => import("./pages/gamification/GamificationHistory"));

// Engineering pages
const ConstructionProjects = lazy(() => import("./pages/engineering/ConstructionProjects"));
const ConstructionProjectDetail = lazy(() => import("./pages/engineering/ConstructionProjectDetail"));
const ConstructionProjectForm = lazy(() => import("./pages/engineering/ConstructionProjectForm"));

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
// Subscription page is now part of Settings tab

// Public site preview (used inside CRM)
const PreviewSiteWrapper = lazy(() => import("./pages/public/PreviewSiteWrapper"));
const APIDocs = lazy(() => import("./pages/public/APIDocs"));
const OperationalDashboard = lazy(() => import("./pages/OperationalDashboard"));
const StageOperationalManagement = lazy(() => import("./pages/StageOperationalManagement"));
const ExecutiveDRE = lazy(() => import("./pages/financial/ExecutiveDRE"));


// Trial expired modal
const TrialExpiredModal = lazy(() => import("./components/admin/TrialExpiredModal").then(m => ({ default: m.TrialExpiredModal })));

function preloadCoreCrmPages() {
  void import("./pages/Dashboard");
  void import("./pages/Pipelines");
  void import("./pages/Contacts");
  void import("./pages/Conversations");
}

function getPublicSiteMode(): "custom-domain" | "slug" | null {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  // Slug-based published sites accessed on the main app domain
  if (pathname.startsWith('/sites/')) return "slug";

  // Lovable preview/dev hosts → CRM
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.lovable.dev') ||
    hostname.endsWith('.lovableproject.com') ||
    hostname === 'vimobe.lovable.app' ||
    hostname.startsWith('id-preview--')
  ) {
    return null;
  }

  // Main CRM domain
  if (hostname === 'vimob.vettercompany.com.br') return null;

  // Anything else (custom domain or *.vimob.vettercompany.com.br) → public site
  return "custom-domain";
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // Reduzido de 5 min para 30 segundos
      gcTime: 1000 * 60 * 15,
      refetchOnWindowFocus: true, // Habilitado para atualizar ao voltar para a aba
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
      const timer = setTimeout(preloadCoreCrmPages, 3000);
      return () => clearTimeout(timer);
    }
  }, [user, loading]);

  const getDefaultRedirect = () => {
    if (needsOrgSelection && !impersonating) return "/select-organization";
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
        {isSuperAdmin && <MetricsPanel />}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/auth" element={renderAuthRoute()} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/signup" element={<Suspense fallback={<PageLoader />}><Signup /></Suspense>} />
            <Route path="/onboarding" element={renderOnboardingRoute()} />
            <Route path="/checkout/:token" element={<Suspense fallback={<PageLoader />}><Checkout /></Suspense>} />
            <Route path="/assinatura" element={<Navigate to="/settings?tab=subscription" replace />} />
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
            <Route path="/dashboard/campaigns" element={<ProtectedRoute><PermissionGuard permission="module_campaigns"><CampaignDashboard /></PermissionGuard></ProtectedRoute>} />
            <Route path="/crm/pipelines" element={<ProtectedRoute><Pipelines /></ProtectedRoute>} />
            <Route path="/crm/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
            <Route path="/crm/management" element={<ProtectedRoute><AdminRoute><CRMManagement /></AdminRoute></ProtectedRoute>} />
            <Route path="/crm/management/operacional" element={<ProtectedRoute><AdminRoute><StageOperationalManagement /></AdminRoute></ProtectedRoute>} />
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
            <Route path="/financeiro/contratos/:id" element={<ProtectedRoute><AdminRoute><ContractDetails /></AdminRoute></ProtectedRoute>} />
            <Route path="/financeiro/comissoes" element={<ProtectedRoute><AdminRoute><Commissions /></AdminRoute></ProtectedRoute>} />
            <Route path="/financeiro/corretor" element={<ProtectedRoute><BrokerFinancialPanel /></ProtectedRoute>} />
            <Route path="/financeiro/relatorios" element={<ProtectedRoute><AdminRoute><FinancialReports /></AdminRoute></ProtectedRoute>} />
            <Route path="/financeiro/dre" element={<ProtectedRoute><AdminRoute><FinancialDRE /></AdminRoute></ProtectedRoute>} />
            <Route path="/financeiro/dre-executivo" element={<ProtectedRoute><AdminRoute><ExecutiveDRE /></AdminRoute></ProtectedRoute>} />

            {/* Engineering Module */}
            <Route path="/engenharia/obras" element={<ProtectedRoute><PermissionGuard permission="module_engineering"><ConstructionProjects /></PermissionGuard></ProtectedRoute>} />
            <Route path="/engenharia/obras/nova" element={<ProtectedRoute><PermissionGuard permission="module_engineering"><ConstructionProjectForm /></PermissionGuard></ProtectedRoute>} />
            <Route path="/engenharia/obras/:id" element={<ProtectedRoute><PermissionGuard permission="module_engineering"><ConstructionProjectDetail /></PermissionGuard></ProtectedRoute>} />
            <Route path="/engenharia/obras/:id/editar" element={<ProtectedRoute><PermissionGuard permission="module_engineering"><ConstructionProjectForm /></PermissionGuard></ProtectedRoute>} />
            <Route path="/engenharia/cockpit" element={<ProtectedRoute><OperationalDashboard /></ProtectedRoute>} />

            {/* Telecom Module */}
            <Route path="/plans" element={<ProtectedRoute><ServicePlans /></ProtectedRoute>} />
            <Route path="/coverage" element={<ProtectedRoute><CoverageAreas /></ProtectedRoute>} />
            <Route path="/telecom/customers" element={<ProtectedRoute><TelecomCustomers /></ProtectedRoute>} />
            <Route path="/telecom/billing" element={<ProtectedRoute><TelecomBilling /></ProtectedRoute>} />
            
            {/* Gamification Module */}
            <Route path="/gamificacao" element={<ProtectedRoute><PermissionGuard permission="module_gamification"><GamificationLayout /></PermissionGuard></ProtectedRoute>}>
              <Route index element={<GamificationRanking />} />
              <Route path="dashboard" element={<GamificationDashboard />} />
              <Route path="historico" element={<GamificationHistory />} />
              <Route path="configuracoes" element={<AdminRoute><GamificationAdmin /></AdminRoute>} />
            </Route>

            {/* Automations */}
            <Route path="/automations" element={<ProtectedRoute><PermissionGuard permission="automations_view"><Automations /></PermissionGuard></ProtectedRoute>} />
            
            {/* Public Site Preview (rendered inside CRM, with auth) */}
            <Route path="/site/preview/*" element={<PreviewSiteWrapper />} />
            <Route path="/site/previsualização/*" element={<PreviewSiteWrapper />} />
            <Route path="/docs/api" element={<Suspense fallback={<PageLoader />}><APIDocs /></Suspense>} />


            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </>
  );
}

const BrandingAndPwa = () => {
  useSystemBranding();
  return null;
};

const App = () => {
  const publicMode = getPublicSiteMode();

  // PUBLIC SITE MODE: completely separate from CRM (no AuthProvider, no CRM overlays)
  if (publicMode) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <TooltipProvider>
            <BrowserRouter>
              <Suspense fallback={null}>
                <PublicAppRoot mode={publicMode} />
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  // CRM MODE
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <BrandingAndPwa />
          <Toaster />
          <Sonner />
          {/* PWA features disabled */}
          <BrowserRouter>
            <AuthProvider>
              <LanguageProvider>
                <AppRoutes />
              </LanguageProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
