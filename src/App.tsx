import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import FarmerDashboard from "./pages/farmer/Dashboard";
import FarmerListings from "./pages/farmer/Listings";
import FarmerOrders from "./pages/farmer/Orders";
import FarmerEarnings from "./pages/farmer/Earnings";
import FarmerCrops from "./pages/farmer/Crops";
import FarmerCropDiary from "./pages/farmer/CropDiary";
import FarmerFarmlands from "./pages/farmer/Farmlands";
import FarmerTransport from "./pages/farmer/Transport";
import FarmerNotifications from "./pages/farmer/Notifications";
import FarmerSettings from "./pages/farmer/Settings";
import AgentDashboard from "./pages/agent/Dashboard";
import AgentTasks from "./pages/agent/Tasks";
import AgentFarmers from "./pages/agent/Farmers";
import AgentMyFarmers from "./pages/agent/MyFarmers";
import AgentFarmerDetail from "./pages/agent/FarmerDetail";
import AgentTransport from "./pages/agent/Transport";
import AgentProfile from "./pages/agent/Profile";
import LogisticsDashboard from "./pages/logistics/Dashboard";
import LogisticsAvailableLoads from "./pages/logistics/AvailableLoads";
import LogisticsActiveTrips from "./pages/logistics/ActiveTrips";
import LogisticsCompletedTrips from "./pages/logistics/CompletedTrips";
import LogisticsVehicles from "./pages/logistics/Vehicles";
import LogisticsTripDetail from "./pages/logistics/TripDetail";
import LogisticsProfile from "./pages/logistics/Profile";
import MarketplaceDashboard from "./pages/marketplace/Dashboard";
import BrowseProducts from "./pages/marketplace/Browse";
import ProductDetail from "./pages/marketplace/ProductDetail";
import MarketplaceOrders from "./pages/marketplace/Orders";
import MarketplaceProfile from "./pages/marketplace/Profile";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminFarmers from "./pages/admin/Farmers";
import AdminAgents from "./pages/admin/Agents";
import AdminTransporters from "./pages/admin/Transporters";
import AdminBuyers from "./pages/admin/Buyers";
import AdminCrops from "./pages/admin/Crops";
import AdminTransport from "./pages/admin/Transport";
import AdminOrders from "./pages/admin/Orders";
import AIConsole from "./pages/admin/AIConsole";
import SeedData from "./pages/admin/SeedData";
import MysuruDemoSeed from "./pages/admin/MysruDemoSeed";
import DataHealth from "./pages/admin/DataHealth";
import PendingUpdates from "./pages/admin/PendingUpdates";
import CallbackHandler from "./pages/Auth/CallbackHandler";
import AccountSwitcher from "./pages/AccountSwitcher";
import DevConsole from "./components/DevConsole/DevConsole";
import RoleSelect from "./pages/Onboard/RoleSelect";
 import ListingTrace from "./pages/trace/ListingTrace";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<CallbackHandler />} />
            <Route path="/account/switch" element={<AccountSwitcher />} />
            <Route path="/dev-console" element={<DevConsole />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            
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
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
