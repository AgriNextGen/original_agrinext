import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
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
      <Route path={ROUTES.FARMER.MY_DAY} element={<ProtectedRoute allowedRoles={["farmer"]}><ErrorBoundary><Suspense fallback={<Fallback />}><FarmerMyDay /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.DASHBOARD} element={<ProtectedRoute allowedRoles={["farmer"]}><ErrorBoundary><Suspense fallback={<Fallback />}><FarmerDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.CROPS} element={<ProtectedRoute allowedRoles={["farmer"]}><ErrorBoundary><Suspense fallback={<Fallback />}><FarmerCrops /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path="/farmer/crops/:cropId" element={<ProtectedRoute allowedRoles={["farmer"]}><ErrorBoundary><Suspense fallback={<Fallback />}><FarmerCropDiary /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.FARMLANDS} element={<ProtectedRoute allowedRoles={["farmer"]}><ErrorBoundary><Suspense fallback={<Fallback />}><FarmerFarmlands /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.TRANSPORT} element={<ProtectedRoute allowedRoles={["farmer"]}><ErrorBoundary><Suspense fallback={<Fallback />}><FarmerTransport /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.LISTINGS} element={<ProtectedRoute allowedRoles={["farmer"]}><ErrorBoundary><Suspense fallback={<Fallback />}><FarmerListings /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.ORDERS} element={<ProtectedRoute allowedRoles={["farmer"]}><ErrorBoundary><Suspense fallback={<Fallback />}><FarmerOrders /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.EARNINGS} element={<ProtectedRoute allowedRoles={["farmer"]}><ErrorBoundary><Suspense fallback={<Fallback />}><FarmerEarnings /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.NOTIFICATIONS} element={<ProtectedRoute allowedRoles={["farmer"]}><ErrorBoundary><Suspense fallback={<Fallback />}><FarmerNotifications /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.FARMER.SETTINGS} element={<ProtectedRoute allowedRoles={["farmer"]}><ErrorBoundary><Suspense fallback={<Fallback />}><FarmerSettings /></Suspense></ErrorBoundary></ProtectedRoute>} />
    </>
  );
}
