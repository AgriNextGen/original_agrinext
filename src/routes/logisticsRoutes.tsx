import { lazy, Suspense } from 'react';
import { Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
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
const LogisticsProfile = lazy(() => import('@/pages/logistics/Profile'));
const LogisticsServiceArea = lazy(() => import('@/pages/logistics/ServiceArea'));

export default function LogisticsRoutes() {
  return (
    <>
      <Route path={ROUTES.LOGISTICS.ROOT} element={<Navigate to={ROUTES.LOGISTICS.DASHBOARD} replace />} />
      <Route path={ROUTES.LOGISTICS.DASHBOARD} element={<ProtectedRoute allowedRoles={["logistics"]}><ErrorBoundary><Suspense fallback={<Fallback />}><LogisticsDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.LOGISTICS.AVAILABLE_LOADS} element={<ProtectedRoute allowedRoles={["logistics"]}><ErrorBoundary><Suspense fallback={<Fallback />}><LogisticsAvailableLoads /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.LOGISTICS.ACTIVE_TRIPS} element={<ProtectedRoute allowedRoles={["logistics"]}><ErrorBoundary><Suspense fallback={<Fallback />}><LogisticsActiveTrips /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.LOGISTICS.COMPLETED_TRIPS} element={<ProtectedRoute allowedRoles={["logistics"]}><ErrorBoundary><Suspense fallback={<Fallback />}><LogisticsCompletedTrips /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.LOGISTICS.VEHICLES} element={<ProtectedRoute allowedRoles={["logistics"]}><ErrorBoundary><Suspense fallback={<Fallback />}><LogisticsVehicles /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path="/logistics/trip/:id" element={<ProtectedRoute allowedRoles={["logistics"]}><ErrorBoundary><Suspense fallback={<Fallback />}><LogisticsTripDetail /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.LOGISTICS.PROFILE} element={<ProtectedRoute allowedRoles={["logistics"]}><ErrorBoundary><Suspense fallback={<Fallback />}><LogisticsProfile /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.LOGISTICS.SERVICE_AREA} element={<ProtectedRoute allowedRoles={["logistics"]}><ErrorBoundary><Suspense fallback={<Fallback />}><LogisticsServiceArea /></Suspense></ErrorBoundary></ProtectedRoute>} />
    </>
  );
}
