import { lazy, Suspense } from 'react';
import { Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import RouteErrorBoundary from '@/components/shared/RouteErrorBoundary';
import { ROUTES } from '@/lib/routes';
import { Loader2 } from 'lucide-react';

const Fallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const LogisticsDashboard = lazy(() => import('@/pages/logistics/Dashboard'));
const LogisticsAvailableLoads = lazy(() => import('@/pages/logistics/AvailableLoads'));
const LogisticsActiveTrips = lazy(() => import('@/pages/logistics/ActiveTrips'));
const LogisticsCompletedTrips = lazy(() => import('@/pages/logistics/CompletedTrips'));
const LogisticsVehicles = lazy(() => import('@/pages/logistics/Vehicles'));
const LogisticsTripDetail = lazy(() => import('@/pages/logistics/TripDetail'));
const LogisticsForwardTrips = lazy(() => import('@/pages/logistics/ForwardTrips'));
const LogisticsReverseLoads = lazy(() => import('@/pages/logistics/ReverseLoads'));
const LogisticsUnifiedTripDetail = lazy(() => import('@/pages/logistics/UnifiedTripDetail'));
const LogisticsCapacityView = lazy(() => import('@/pages/logistics/CapacityView'));
const LogisticsEarningsView = lazy(() => import('@/pages/logistics/EarningsView'));
const LogisticsRecommendations = lazy(() => import('@/pages/logistics/Recommendations'));
const LogisticsProfile = lazy(() => import('@/pages/logistics/Profile'));
const LogisticsServiceArea = lazy(() => import('@/pages/logistics/ServiceArea'));

export default function LogisticsRoutes() {
  return (
    <>
      <Route path={ROUTES.LOGISTICS.ROOT} element={<Navigate to={ROUTES.LOGISTICS.DASHBOARD} replace />} />
      <Route path={ROUTES.LOGISTICS.DASHBOARD} element={<ProtectedRoute allowedRoles={["logistics"]}><RouteErrorBoundary dashboardPath="/logistics/dashboard"><Suspense fallback={<Fallback />}><LogisticsDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.LOGISTICS.AVAILABLE_LOADS} element={<ProtectedRoute allowedRoles={["logistics"]}><RouteErrorBoundary dashboardPath="/logistics/dashboard"><Suspense fallback={<Fallback />}><LogisticsAvailableLoads /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.LOGISTICS.ACTIVE_TRIPS} element={<ProtectedRoute allowedRoles={["logistics"]}><RouteErrorBoundary dashboardPath="/logistics/dashboard"><Suspense fallback={<Fallback />}><LogisticsActiveTrips /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.LOGISTICS.COMPLETED_TRIPS} element={<ProtectedRoute allowedRoles={["logistics"]}><RouteErrorBoundary dashboardPath="/logistics/dashboard"><Suspense fallback={<Fallback />}><LogisticsCompletedTrips /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.LOGISTICS.VEHICLES} element={<ProtectedRoute allowedRoles={["logistics"]}><RouteErrorBoundary dashboardPath="/logistics/dashboard"><Suspense fallback={<Fallback />}><LogisticsVehicles /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path="/logistics/trip/:id" element={<ProtectedRoute allowedRoles={["logistics"]}><RouteErrorBoundary dashboardPath="/logistics/dashboard"><Suspense fallback={<Fallback />}><LogisticsTripDetail /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.LOGISTICS.FORWARD_TRIPS} element={<ProtectedRoute allowedRoles={["logistics"]}><RouteErrorBoundary dashboardPath="/logistics/dashboard"><Suspense fallback={<Fallback />}><LogisticsForwardTrips /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.LOGISTICS.REVERSE_LOADS} element={<ProtectedRoute allowedRoles={["logistics"]}><RouteErrorBoundary dashboardPath="/logistics/dashboard"><Suspense fallback={<Fallback />}><LogisticsReverseLoads /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path="/logistics/unified-trip/:id" element={<ProtectedRoute allowedRoles={["logistics"]}><RouteErrorBoundary dashboardPath="/logistics/dashboard"><Suspense fallback={<Fallback />}><LogisticsUnifiedTripDetail /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.LOGISTICS.CAPACITY} element={<ProtectedRoute allowedRoles={["logistics"]}><RouteErrorBoundary dashboardPath="/logistics/dashboard"><Suspense fallback={<Fallback />}><LogisticsCapacityView /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.LOGISTICS.EARNINGS} element={<ProtectedRoute allowedRoles={["logistics"]}><RouteErrorBoundary dashboardPath="/logistics/dashboard"><Suspense fallback={<Fallback />}><LogisticsEarningsView /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.LOGISTICS.RECOMMENDATIONS} element={<ProtectedRoute allowedRoles={["logistics"]}><RouteErrorBoundary dashboardPath="/logistics/dashboard"><Suspense fallback={<Fallback />}><LogisticsRecommendations /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.LOGISTICS.PROFILE} element={<ProtectedRoute allowedRoles={["logistics"]}><RouteErrorBoundary dashboardPath="/logistics/dashboard"><Suspense fallback={<Fallback />}><LogisticsProfile /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.LOGISTICS.SERVICE_AREA} element={<ProtectedRoute allowedRoles={["logistics"]}><RouteErrorBoundary dashboardPath="/logistics/dashboard"><Suspense fallback={<Fallback />}><LogisticsServiceArea /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    </>
  );
}
