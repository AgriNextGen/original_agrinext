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

const AgentToday = lazy(() => import('@/pages/agent/Today'));
const AgentDashboard = lazy(() => import('@/pages/agent/Dashboard'));
const AgentTasks = lazy(() => import('@/pages/agent/Tasks'));
const AgentFarmers = lazy(() => import('@/pages/agent/Farmers'));
const AgentMyFarmers = lazy(() => import('@/pages/agent/MyFarmers'));
const AgentFarmerDetail = lazy(() => import('@/pages/agent/FarmerDetail'));
const AgentTransport = lazy(() => import('@/pages/agent/Transport'));
const AgentProfile = lazy(() => import('@/pages/agent/Profile'));
const AgentServiceArea = lazy(() => import('@/pages/agent/ServiceArea'));

export default function AgentRoutes() {
  return (
    <>
      <Route path={ROUTES.AGENT.TODAY} element={<ProtectedRoute allowedRoles={["agent"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AgentToday /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.AGENT.DASHBOARD} element={<ProtectedRoute allowedRoles={["agent"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AgentDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.AGENT.TASKS} element={<ProtectedRoute allowedRoles={["agent"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AgentTasks /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.AGENT.FARMERS} element={<ProtectedRoute allowedRoles={["agent"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AgentFarmers /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.AGENT.MY_FARMERS} element={<ProtectedRoute allowedRoles={["agent"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AgentMyFarmers /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path="/agent/farmer/:farmerId" element={<ProtectedRoute allowedRoles={["agent"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AgentFarmerDetail /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.AGENT.TRANSPORT} element={<ProtectedRoute allowedRoles={["agent"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AgentTransport /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.AGENT.PROFILE} element={<ProtectedRoute allowedRoles={["agent"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AgentProfile /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.AGENT.SERVICE_AREA} element={<ProtectedRoute allowedRoles={["agent"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AgentServiceArea /></Suspense></ErrorBoundary></ProtectedRoute>} />
    </>
  );
}
