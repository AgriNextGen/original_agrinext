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

const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminFarmers = lazy(() => import('@/pages/admin/Farmers'));
const AdminAgents = lazy(() => import('@/pages/admin/Agents'));
const AdminTransporters = lazy(() => import('@/pages/admin/Transporters'));
const AdminBuyers = lazy(() => import('@/pages/admin/Buyers'));
const AdminCrops = lazy(() => import('@/pages/admin/Crops'));
const AdminTransport = lazy(() => import('@/pages/admin/Transport'));
const AdminOrders = lazy(() => import('@/pages/admin/Orders'));
const AIConsole = lazy(() => import('@/pages/admin/AIConsole'));
const SeedData = lazy(() => import('@/pages/admin/SeedData'));
const MysuruDemoSeed = lazy(() => import('@/pages/admin/MysruDemoSeed'));
const DataHealth = lazy(() => import('@/pages/admin/DataHealth'));
const PendingUpdates = lazy(() => import('@/pages/admin/PendingUpdates'));
const AdminOpsInbox = lazy(() => import('@/pages/admin/OpsInbox'));
const AdminEntity360 = lazy(() => import('@/pages/admin/Entity360'));
const AdminTickets = lazy(() => import('@/pages/admin/Tickets'));
const AdminAiReview = lazy(() => import('@/pages/admin/AiReview'));
const AdminJobs = lazy(() => import('@/pages/admin/Jobs'));
const AdminFinance = lazy(() => import('@/pages/admin/Finance'));
const FinanceOps = lazy(() => import('@/pages/admin/FinanceOps'));
const Refunds = lazy(() => import('@/pages/admin/Refunds'));
const Payouts = lazy(() => import('@/pages/admin/Payouts'));
const AdminDisputes = lazy(() => import('@/pages/admin/Disputes'));
const SystemHealthPage = lazy(() => import('@/pages/admin/SystemHealth'));

export default function AdminRoutes() {
  return (
    <>
      <Route path={ROUTES.ADMIN.DASHBOARD} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AdminDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.FARMERS} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AdminFarmers /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.AGENTS} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AdminAgents /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.TRANSPORTERS} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AdminTransporters /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.BUYERS} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AdminBuyers /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.CROPS} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AdminCrops /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.TRANSPORT} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AdminTransport /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.ORDERS} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AdminOrders /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.AI_CONSOLE} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AIConsole /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.SEED_DATA} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><SeedData /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.DATA_HEALTH} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><DataHealth /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.MYSURU_DEMO} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><MysuruDemoSeed /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.PENDING_UPDATES} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><PendingUpdates /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.OPS_INBOX} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AdminOpsInbox /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/entity/:type/:id" element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AdminEntity360 /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.DISPUTES} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AdminDisputes /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.SYSTEM_HEALTH} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><SystemHealthPage /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.TICKETS} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AdminTickets /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.AI_REVIEW} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AdminAiReview /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.JOBS} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AdminJobs /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.FINANCE} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><AdminFinance /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.FINANCE_OPS} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><FinanceOps /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.REFUNDS} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><Refunds /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path={ROUTES.ADMIN.PAYOUTS} element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><Suspense fallback={<Fallback />}><Payouts /></Suspense></ErrorBoundary></ProtectedRoute>} />
    </>
  );
}
