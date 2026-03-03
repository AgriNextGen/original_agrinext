import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PageLoader } from "@/components/shared/PageLoader";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import CallbackHandler from "./pages/Auth/CallbackHandler";
import AccountSwitcher from "./pages/AccountSwitcher";
import RoleSelect from "./pages/Onboard/RoleSelect";

const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const FarmerDashboard = lazy(() => import("./pages/farmer/Dashboard"));
const FarmerListings = lazy(() => import("./pages/farmer/Listings"));
const FarmerOrders = lazy(() => import("./pages/farmer/Orders"));
const FarmerEarnings = lazy(() => import("./pages/farmer/Earnings"));
const FarmerCrops = lazy(() => import("./pages/farmer/Crops"));
const FarmerCropDiary = lazy(() => import("./pages/farmer/CropDiary"));
const FarmerFarmlands = lazy(() => import("./pages/farmer/Farmlands"));
const FarmerTransport = lazy(() => import("./pages/farmer/Transport"));
const FarmerNotifications = lazy(() => import("./pages/farmer/Notifications"));
const FarmerSettings = lazy(() => import("./pages/farmer/Settings"));
const FarmerMyDay = lazy(() => import("./pages/farmer/MyDay"));
const AgentDashboard = lazy(() => import("./pages/agent/Dashboard"));
const AgentTasks = lazy(() => import("./pages/agent/Tasks"));
const AgentFarmers = lazy(() => import("./pages/agent/Farmers"));
const AgentMyFarmers = lazy(() => import("./pages/agent/MyFarmers"));
const AgentFarmerDetail = lazy(() => import("./pages/agent/FarmerDetail"));
const AgentTransport = lazy(() => import("./pages/agent/Transport"));
const AgentProfile = lazy(() => import("./pages/agent/Profile"));
const AgentServiceArea = lazy(() => import("./pages/agent/ServiceArea"));
const AgentToday = lazy(() => import("./pages/agent/Today"));
const LogisticsDashboard = lazy(() => import("./pages/logistics/Dashboard"));
const LogisticsAvailableLoads = lazy(() => import("./pages/logistics/AvailableLoads"));
const LogisticsActiveTrips = lazy(() => import("./pages/logistics/ActiveTrips"));
const LogisticsCompletedTrips = lazy(() => import("./pages/logistics/CompletedTrips"));
const LogisticsVehicles = lazy(() => import("./pages/logistics/Vehicles"));
const LogisticsTripDetail = lazy(() => import("./pages/logistics/TripDetail"));
const LogisticsProfile = lazy(() => import("./pages/logistics/Profile"));
const LogisticsServiceArea = lazy(() => import("./pages/logistics/ServiceArea"));
const MarketplaceDashboard = lazy(() => import("./pages/marketplace/Dashboard"));
const BrowseProducts = lazy(() => import("./pages/marketplace/Browse"));
const ProductDetail = lazy(() => import("./pages/marketplace/ProductDetail"));
const MarketplaceOrders = lazy(() => import("./pages/marketplace/Orders"));
const MarketplaceProfile = lazy(() => import("./pages/marketplace/Profile"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminFarmers = lazy(() => import("./pages/admin/Farmers"));
const AdminAgents = lazy(() => import("./pages/admin/Agents"));
const AdminTransporters = lazy(() => import("./pages/admin/Transporters"));
const AdminBuyers = lazy(() => import("./pages/admin/Buyers"));
const AdminCrops = lazy(() => import("./pages/admin/Crops"));
const AdminTransport = lazy(() => import("./pages/admin/Transport"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AIConsole = lazy(() => import("./pages/admin/AIConsole"));
const SeedData = lazy(() => import("./pages/admin/SeedData"));
const MysuruDemoSeed = lazy(() => import("./pages/admin/MysruDemoSeed"));
const DataHealth = lazy(() => import("./pages/admin/DataHealth"));
const PendingUpdates = lazy(() => import("./pages/admin/PendingUpdates"));
const AdminOpsInbox = lazy(() => import("./pages/admin/OpsInbox"));
const AdminEntity360 = lazy(() => import("./pages/admin/Entity360"));
const AdminTickets = lazy(() => import("./pages/admin/Tickets"));
const AdminAiReview = lazy(() => import("./pages/admin/AiReview"));
const AdminJobs = lazy(() => import("./pages/admin/Jobs"));
const AdminFinance = lazy(() => import("./pages/admin/Finance"));
const FinanceOps = lazy(() => import("./pages/admin/FinanceOps"));
const Refunds = lazy(() => import("./pages/admin/Refunds"));
const Payouts = lazy(() => import("./pages/admin/Payouts"));
const AdminDisputes = lazy(() => import("./pages/admin/Disputes"));
const SystemHealthPage = lazy(() => import("./pages/admin/SystemHealth"));
const PendingSync = lazy(() => import("./pages/common/PendingSync"));
const UploadsManager = lazy(() => import("./pages/common/UploadsManager"));
const DevConsole = lazy(() => import("./components/DevConsole/DevConsole"));
const ListingTrace = lazy(() => import("./pages/trace/ListingTrace"));
const queryClient = new QueryClient();
// Restore persisted simple query cache on startup (best-effort)
import persister from '@/offline/queryPersister';
(async function restoreQueries(){
  try {
    const restored = await persister.restore();
    if (restored?.length) {
      restored.forEach(({ key, state }: any) => {
        try { queryClient.setQueryData(key, state); } catch(_) {}
      });
    }
  } catch(_) {}
})();

// Persist on change (debounced)
let persistTimer: any = null;
queryClient.getQueryCache().subscribe(() => {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => persister.persist(queryClient), 2000);
});
const enableDevConsoleRoute =
  import.meta.env.MODE !== "production" &&
  import.meta.env.VITE_DEV_TOOLS_ENABLED === "true";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
        <BrowserRouter>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:m-2 focus:top-0 focus:left-0"
          >
            Skip to main content
          </a>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/auth/callback" element={<CallbackHandler />} />
            <Route path="/account/switch" element={<AccountSwitcher />} />
            {enableDevConsoleRoute ? (
              <Route
                path="/dev-console"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <DevConsole />
                  </ProtectedRoute>
                }
              />
            ) : null}
            
             {/* Public trace routes - no auth required */}
             <Route path="/trace/listing/:traceCode" element={<ListingTrace />} />
             
            {/* Marketplace redirect for unauthenticated users */}
            <Route path="/marketplace" element={<Navigate to="/login" replace />} />
            
            {/* Role-based redirects */}
            <Route path="/farmer" element={<Navigate to="/farmer/dashboard" replace />} />
            <Route path="/buyer" element={<Navigate to="/marketplace/dashboard" replace />} />
            <Route path="/agent" element={<Navigate to="/agent/dashboard" replace />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            
            {/* Protected Farmer Routes */}
            <Route
              path="/farmer/my-day"
              element={
                <ProtectedRoute allowedRoles={["farmer"]}>
                  <FarmerMyDay />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/dashboard"
              element={
                <ProtectedRoute allowedRoles={["farmer"]}>
                  <FarmerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/crops"
              element={
                <ProtectedRoute allowedRoles={["farmer"]}>
                  <FarmerCrops />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/crops/:cropId"
              element={
                <ProtectedRoute allowedRoles={["farmer"]}>
                  <FarmerCropDiary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/farmlands"
              element={
                <ProtectedRoute allowedRoles={["farmer"]}>
                  <FarmerFarmlands />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/transport"
              element={
                <ProtectedRoute allowedRoles={["farmer"]}>
                  <FarmerTransport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/listings"
              element={
                <ProtectedRoute allowedRoles={["farmer"]}>
                  <FarmerListings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/orders"
              element={
                <ProtectedRoute allowedRoles={["farmer"]}>
                  <FarmerOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/earnings"
              element={
                <ProtectedRoute allowedRoles={["farmer"]}>
                  <FarmerEarnings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/notifications"
              element={
                <ProtectedRoute allowedRoles={["farmer"]}>
                  <FarmerNotifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/settings"
              element={
                <ProtectedRoute allowedRoles={["farmer"]}>
                  <FarmerSettings />
                </ProtectedRoute>
              }
            />
            
            {/* Protected Agent Routes */}
            <Route
              path="/agent/today"
              element={
                <ProtectedRoute allowedRoles={["agent"]}>
                  <AgentToday />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/dashboard"
              element={
                <ProtectedRoute allowedRoles={["agent"]}>
                  <AgentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/tasks"
              element={
                <ProtectedRoute allowedRoles={["agent"]}>
                  <AgentTasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/farmers"
              element={
                <ProtectedRoute allowedRoles={["agent"]}>
                  <AgentFarmers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/my-farmers"
              element={
                <ProtectedRoute allowedRoles={["agent"]}>
                  <AgentMyFarmers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/farmer/:farmerId"
              element={
                <ProtectedRoute allowedRoles={["agent"]}>
                  <AgentFarmerDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/transport"
              element={
                <ProtectedRoute allowedRoles={["agent"]}>
                  <AgentTransport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/profile"
              element={
                <ProtectedRoute allowedRoles={["agent"]}>
                  <AgentProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/service-area"
              element={
                <ProtectedRoute allowedRoles={["agent"]}>
                  <AgentServiceArea />
                </ProtectedRoute>
              }
            />
            
            {/* Protected Logistics Routes */}
            <Route path="/logistics" element={<Navigate to="/logistics/dashboard" replace />} />
            <Route
              path="/logistics/dashboard"
              element={
                <ProtectedRoute allowedRoles={["logistics"]}>
                  <LogisticsDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/logistics/loads"
              element={
                <ProtectedRoute allowedRoles={["logistics"]}>
                  <LogisticsAvailableLoads />
                </ProtectedRoute>
              }
            />
            <Route
              path="/logistics/trips"
              element={
                <ProtectedRoute allowedRoles={["logistics"]}>
                  <LogisticsActiveTrips />
                </ProtectedRoute>
              }
            />
            <Route
              path="/logistics/completed"
              element={
                <ProtectedRoute allowedRoles={["logistics"]}>
                  <LogisticsCompletedTrips />
                </ProtectedRoute>
              }
            />
            <Route
              path="/logistics/vehicles"
              element={
                <ProtectedRoute allowedRoles={["logistics"]}>
                  <LogisticsVehicles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/logistics/trip/:id"
              element={
                <ProtectedRoute allowedRoles={["logistics"]}>
                  <LogisticsTripDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/logistics/profile"
              element={
                <ProtectedRoute allowedRoles={["logistics"]}>
                  <LogisticsProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/logistics/service-area"
              element={
                <ProtectedRoute allowedRoles={["logistics"]}>
                  <LogisticsServiceArea />
                </ProtectedRoute>
              }
            />
            
            {/* Protected Buyer/Marketplace Routes */}
            <Route
              path="/marketplace/dashboard"
              element={
                <ProtectedRoute allowedRoles={["buyer"]}>
                  <MarketplaceDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/marketplace/browse"
              element={
                <ProtectedRoute allowedRoles={["buyer"]}>
                  <BrowseProducts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/marketplace/product/:id"
              element={
                <ProtectedRoute allowedRoles={["buyer"]}>
                  <ProductDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/marketplace/orders"
              element={
                <ProtectedRoute allowedRoles={["buyer"]}>
                  <MarketplaceOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/marketplace/profile"
              element={
                <ProtectedRoute allowedRoles={["buyer"]}>
                  <MarketplaceProfile />
                </ProtectedRoute>
              }
            />
            <Route path="/onboard/role-select" element={<RoleSelect />} />
            
            {/* Protected Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/farmers"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminFarmers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/agents"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminAgents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/transporters"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminTransporters />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/buyers"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminBuyers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/crops"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminCrops />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/transport"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminTransport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ai-console"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AIConsole />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/seed-data"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <SeedData />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/data-health"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <DataHealth />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/mysuru-demo"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <MysuruDemoSeed />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pending-updates"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <PendingUpdates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ops"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminOpsInbox />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/entity/:type/:id"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminEntity360 />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/disputes"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDisputes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/system-health"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <SystemHealthPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pending-sync"
              element={
                <ProtectedRoute allowedRoles={["agent","farmer","buyer","logistics"]}>
                  <PendingSync />
                </ProtectedRoute>
              }
            />
            <Route
              path="/uploads-manager"
              element={
                <ProtectedRoute allowedRoles={["agent","farmer","buyer","logistics"]}>
                  <UploadsManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tickets"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminTickets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ai-review"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminAiReview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/jobs"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminJobs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/finance"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminFinance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/finance/ops"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <FinanceOps />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/finance/refunds"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Refunds />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/finance/payouts"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Payouts />
                </ProtectedRoute>
              }
            />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <OfflineBanner />
        </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
