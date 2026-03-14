import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import RouteErrorBoundary from '@/components/shared/RouteErrorBoundary';
import { ROUTES } from '@/lib/routes';
import { Loader2 } from 'lucide-react';

const Fallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const FarmerMyDay = lazy(() => import('@/pages/farmer/MyDay'));
const FarmerDashboard = lazy(() => import('@/pages/farmer/Dashboard'));
const FarmerCrops = lazy(() => import('@/pages/farmer/Crops'));
const FarmerCropDiary = lazy(() => import('@/pages/farmer/CropDiary'));
const FarmerFarmlands = lazy(() => import('@/pages/farmer/Farmlands'));
const FarmerTransport = lazy(() => import('@/pages/farmer/Transport'));
const FarmerListings = lazy(() => import('@/pages/farmer/Listings'));
const FarmerOrders = lazy(() => import('@/pages/farmer/Orders'));
const FarmerEarnings = lazy(() => import('@/pages/farmer/Earnings'));
const FarmerNotifications = lazy(() => import('@/pages/farmer/Notifications'));
const FarmerSettings = lazy(() => import('@/pages/farmer/Settings'));

export default function FarmerRoutes() {
  return (
    <>
      <Route path={ROUTES.FARMER.MY_DAY} element={<ProtectedRoute allowedRoles={["farmer"]}><RouteErrorBoundary dashboardPath="/farmer/dashboard"><Suspense fallback={<Fallback />}><FarmerMyDay /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.DASHBOARD} element={<ProtectedRoute allowedRoles={["farmer"]}><RouteErrorBoundary dashboardPath="/farmer/dashboard"><Suspense fallback={<Fallback />}><FarmerDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.CROPS} element={<ProtectedRoute allowedRoles={["farmer"]}><RouteErrorBoundary dashboardPath="/farmer/dashboard"><Suspense fallback={<Fallback />}><FarmerCrops /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path="/farmer/crops/:cropId" element={<ProtectedRoute allowedRoles={["farmer"]}><RouteErrorBoundary dashboardPath="/farmer/dashboard"><Suspense fallback={<Fallback />}><FarmerCropDiary /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.FARMLANDS} element={<ProtectedRoute allowedRoles={["farmer"]}><RouteErrorBoundary dashboardPath="/farmer/dashboard"><Suspense fallback={<Fallback />}><FarmerFarmlands /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.TRANSPORT} element={<ProtectedRoute allowedRoles={["farmer"]}><RouteErrorBoundary dashboardPath="/farmer/dashboard"><Suspense fallback={<Fallback />}><FarmerTransport /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.LISTINGS} element={<ProtectedRoute allowedRoles={["farmer"]}><RouteErrorBoundary dashboardPath="/farmer/dashboard"><Suspense fallback={<Fallback />}><FarmerListings /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.ORDERS} element={<ProtectedRoute allowedRoles={["farmer"]}><RouteErrorBoundary dashboardPath="/farmer/dashboard"><Suspense fallback={<Fallback />}><FarmerOrders /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.EARNINGS} element={<ProtectedRoute allowedRoles={["farmer"]}><RouteErrorBoundary dashboardPath="/farmer/dashboard"><Suspense fallback={<Fallback />}><FarmerEarnings /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.NOTIFICATIONS} element={<ProtectedRoute allowedRoles={["farmer"]}><RouteErrorBoundary dashboardPath="/farmer/dashboard"><Suspense fallback={<Fallback />}><FarmerNotifications /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.SETTINGS} element={<ProtectedRoute allowedRoles={["farmer"]}><RouteErrorBoundary dashboardPath="/farmer/dashboard"><Suspense fallback={<Fallback />}><FarmerSettings /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    </>
  );
}
