import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { ROUTES } from "@/lib/routes";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import PendingSync from "./pages/common/PendingSync";
import UploadsManager from "./pages/common/UploadsManager";
import CallbackHandler from "./pages/Auth/CallbackHandler";
import AccountSwitcher from "./pages/AccountSwitcher";
import DevConsole from "./components/DevConsole/DevConsole";
import RoleSelect from "./pages/Onboard/RoleSelect";
import ListingTrace from "./pages/trace/ListingTrace";
import FarmerRoutes from "./routes/farmerRoutes";
import AgentRoutes from "./routes/agentRoutes";
import LogisticsRoutes from "./routes/logisticsRoutes";
import MarketplaceRoutes from "./routes/marketplaceRoutes";
import AdminRoutes from "./routes/adminRoutes";
import VendorRoutes from "./routes/vendorRoutes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,        // 2 min — reduce refetches on 2G
      gcTime: 10 * 60 * 1000,           // 10 min cache
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15000),
      refetchOnWindowFocus: false,       // Avoid refetch on every tab switch
    },
  },
});
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

let persistTimer: any = null;
queryClient.getQueryCache().subscribe(() => {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => persister.persist(queryClient), 2000);
});
// Dev-mode: validate translation key parity between en/kn on startup
if (import.meta.env.DEV) {
  import('@/i18n').then(({ validateTranslations }) => {
    const { missing, extra } = validateTranslations();
    if (missing.length > 0 || extra.length > 0) {
      console.groupCollapsed(`[i18n] Translation audit: ${missing.length} missing in kn, ${extra.length} extra in kn`);
      if (missing.length > 0) console.table(missing.slice(0, 30).map(k => ({ key: k, status: 'missing in kn.ts' })));
      if (extra.length > 0) console.table(extra.slice(0, 30).map(k => ({ key: k, status: 'extra in kn.ts' })));
      console.groupEnd();
    }
  });
}

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
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
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
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            
             <Route path="/trace/listing/:traceCode" element={<ListingTrace />} />
             
            <Route path="/marketplace" element={<Navigate to={ROUTES.MARKETPLACE.DASHBOARD} replace />} />
            
            <Route path="/farmer" element={<Navigate to={ROUTES.FARMER.DASHBOARD} replace />} />
            <Route path="/buyer" element={<Navigate to={ROUTES.MARKETPLACE.DASHBOARD} replace />} />
            <Route path="/agent" element={<Navigate to={ROUTES.AGENT.DASHBOARD} replace />} />
            <Route path="/admin" element={<Navigate to={ROUTES.ADMIN.DASHBOARD} replace />} />
            <Route path="/vendor" element={<Navigate to={ROUTES.VENDOR.DASHBOARD} replace />} />
            
            {FarmerRoutes()}
            {AgentRoutes()}
            {LogisticsRoutes()}
            {MarketplaceRoutes()}
            {VendorRoutes()}

            <Route
              path="/onboard/role-select"
              element={
                <ProtectedRoute>
                  <RoleSelect />
                </ProtectedRoute>
              }
            />
            
            {AdminRoutes()}
            <Route
              path="/pending-sync"
              element={
                <ProtectedRoute allowedRoles={["agent","farmer","buyer","logistics","vendor"]}>
                  <PendingSync />
                </ProtectedRoute>
              }
            />
            <Route
              path="/uploads-manager"
              element={
                <ProtectedRoute allowedRoles={["agent","farmer","buyer","logistics","vendor"]}>
                  <UploadsManager />
                </ProtectedRoute>
              }
            />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
        </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
