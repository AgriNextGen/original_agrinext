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

const VendorDashboard = lazy(() => import('@/pages/vendor/VendorDashboard'));
const VendorCreateShipment = lazy(() => import('@/pages/vendor/CreateShipment'));
const VendorActiveShipments = lazy(() => import('@/pages/vendor/ActiveShipments'));
const VendorShipmentHistory = lazy(() => import('@/pages/vendor/ShipmentHistory'));
const VendorShipmentDetail = lazy(() => import('@/pages/vendor/ShipmentDetail'));
const VendorLogisticsRequests = lazy(() => import('@/pages/vendor/LogisticsRequests'));
const VendorReverseLogistics = lazy(() => import('@/pages/vendor/ReverseLogistics'));
const VendorProfile = lazy(() => import('@/pages/vendor/VendorProfile'));

export default function VendorRoutes() {
  return (
    <>
      <Route path={ROUTES.VENDOR.ROOT} element={<Navigate to={ROUTES.VENDOR.DASHBOARD} replace />} />
      <Route path={ROUTES.VENDOR.DASHBOARD} element={<ProtectedRoute allowedRoles={["vendor"]}><RouteErrorBoundary dashboardPath="/vendor/dashboard"><Suspense fallback={<Fallback />}><VendorDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.VENDOR.CREATE_SHIPMENT} element={<ProtectedRoute allowedRoles={["vendor"]}><RouteErrorBoundary dashboardPath="/vendor/dashboard"><Suspense fallback={<Fallback />}><VendorCreateShipment /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.VENDOR.ACTIVE_SHIPMENTS} element={<ProtectedRoute allowedRoles={["vendor"]}><RouteErrorBoundary dashboardPath="/vendor/dashboard"><Suspense fallback={<Fallback />}><VendorActiveShipments /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.VENDOR.SHIPMENT_HISTORY} element={<ProtectedRoute allowedRoles={["vendor"]}><RouteErrorBoundary dashboardPath="/vendor/dashboard"><Suspense fallback={<Fallback />}><VendorShipmentHistory /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path="/vendor/shipments/:id" element={<ProtectedRoute allowedRoles={["vendor"]}><RouteErrorBoundary dashboardPath="/vendor/dashboard"><Suspense fallback={<Fallback />}><VendorShipmentDetail /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.VENDOR.LOGISTICS_REQUESTS} element={<ProtectedRoute allowedRoles={["vendor"]}><RouteErrorBoundary dashboardPath="/vendor/dashboard"><Suspense fallback={<Fallback />}><VendorLogisticsRequests /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.VENDOR.REVERSE_LOGISTICS} element={<ProtectedRoute allowedRoles={["vendor"]}><RouteErrorBoundary dashboardPath="/vendor/dashboard"><Suspense fallback={<Fallback />}><VendorReverseLogistics /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.VENDOR.PROFILE} element={<ProtectedRoute allowedRoles={["vendor"]}><RouteErrorBoundary dashboardPath="/vendor/dashboard"><Suspense fallback={<Fallback />}><VendorProfile /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    </>
  );
}
