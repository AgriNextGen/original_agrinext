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

const MarketplaceDashboard = lazy(() => import('@/pages/marketplace/Dashboard'));
const BrowseProducts = lazy(() => import('@/pages/marketplace/Browse'));
const ProductDetail = lazy(() => import('@/pages/marketplace/ProductDetail'));
const MarketplaceOrders = lazy(() => import('@/pages/marketplace/Orders'));
const MarketplaceProfile = lazy(() => import('@/pages/marketplace/Profile'));

export default function MarketplaceRoutes() {
  return (
    <>
      <Route path={ROUTES.MARKETPLACE.DASHBOARD} element={<ProtectedRoute allowedRoles={["buyer"]}><ErrorBoundary><Suspense fallback={<Fallback />}><MarketplaceDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.MARKETPLACE.BROWSE} element={<ProtectedRoute allowedRoles={["buyer"]}><ErrorBoundary><Suspense fallback={<Fallback />}><BrowseProducts /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path="/marketplace/product/:id" element={<ProtectedRoute allowedRoles={["buyer"]}><ErrorBoundary><Suspense fallback={<Fallback />}><ProductDetail /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.MARKETPLACE.ORDERS} element={<ProtectedRoute allowedRoles={["buyer"]}><ErrorBoundary><Suspense fallback={<Fallback />}><MarketplaceOrders /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.MARKETPLACE.PROFILE} element={<ProtectedRoute allowedRoles={["buyer"]}><ErrorBoundary><Suspense fallback={<Fallback />}><MarketplaceProfile /></Suspense></ErrorBoundary></ProtectedRoute>} />
    </>
  );
}
