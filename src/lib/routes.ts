/**
 * Type-safe route constants for AgriNext Gen.
 *
 * Always use these constants instead of hardcoded route strings.
 * This prevents typos and makes route refactoring safe across 100+ routes.
 *
 * Usage:
 *   import { ROUTES } from '@/lib/routes';
 *   navigate(ROUTES.FARMER.DASHBOARD);
 *   <Link to={ROUTES.AGENT.TASKS}>Tasks</Link>
 *
 * For dynamic routes with params:
 *   navigate(ROUTES.FARMER.CROP_DIARY(cropId));
 *   navigate(ROUTES.ADMIN.ENTITY_360('farmer', farmerId));
 */

export const ROUTES = {
  // ---------------------------------------------------------------------------
  // Public
  // ---------------------------------------------------------------------------
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  ABOUT: '/about',
  CONTACT: '/contact',
  AUTH_CALLBACK: '/auth/callback',
  ACCOUNT_SWITCH: '/account/switch',
  ONBOARD_ROLE_SELECT: '/onboard/role-select',
  DEV_CONSOLE: '/dev-console',

  // Public trace (no auth)
  LISTING_TRACE: (traceCode: string) => `/trace/listing/${traceCode}`,

  // ---------------------------------------------------------------------------
  // Farmer
  // ---------------------------------------------------------------------------
  FARMER: {
    ROOT: '/farmer',
    DASHBOARD: '/farmer/dashboard',
    MY_DAY: '/farmer/my-day',
    CROPS: '/farmer/crops',
    CROP_DIARY: (cropId: string) => `/farmer/crops/${cropId}`,
    FARMLANDS: '/farmer/farmlands',
    TRANSPORT: '/farmer/transport',
    LISTINGS: '/farmer/listings',
    ORDERS: '/farmer/orders',
    EARNINGS: '/farmer/earnings',
    NOTIFICATIONS: '/farmer/notifications',
    SETTINGS: '/farmer/settings',
  },

  // ---------------------------------------------------------------------------
  // Agent
  // ---------------------------------------------------------------------------
  AGENT: {
    ROOT: '/agent',
    DASHBOARD: '/agent/dashboard',
    TODAY: '/agent/today',
    TASKS: '/agent/tasks',
    FARMERS: '/agent/farmers',
    MY_FARMERS: '/agent/my-farmers',
    FARMER_DETAIL: (farmerId: string) => `/agent/farmer/${farmerId}`,
    TRANSPORT: '/agent/transport',
    PROFILE: '/agent/profile',
    SERVICE_AREA: '/agent/service-area',
  },

  // ---------------------------------------------------------------------------
  // Logistics
  // ---------------------------------------------------------------------------
  LOGISTICS: {
    ROOT: '/logistics',
    DASHBOARD: '/logistics/dashboard',
    AVAILABLE_LOADS: '/logistics/loads',
    ACTIVE_TRIPS: '/logistics/trips',
    COMPLETED_TRIPS: '/logistics/completed',
    TRIP_DETAIL: (tripId: string) => `/logistics/trip/${tripId}`,
    VEHICLES: '/logistics/vehicles',
    PROFILE: '/logistics/profile',
    SERVICE_AREA: '/logistics/service-area',
  },

  // ---------------------------------------------------------------------------
  // Marketplace (Buyer)
  // ---------------------------------------------------------------------------
  MARKETPLACE: {
    ROOT: '/marketplace',
    DASHBOARD: '/marketplace/dashboard',
    BROWSE: '/marketplace/browse',
    PRODUCT_DETAIL: (listingId: string) => `/marketplace/product/${listingId}`,
    ORDERS: '/marketplace/orders',
    PROFILE: '/marketplace/profile',
  },

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------
  ADMIN: {
    ROOT: '/admin',
    DASHBOARD: '/admin/dashboard',
    FARMERS: '/admin/farmers',
    AGENTS: '/admin/agents',
    TRANSPORTERS: '/admin/transporters',
    BUYERS: '/admin/buyers',
    CROPS: '/admin/crops',
    TRANSPORT: '/admin/transport',
    ORDERS: '/admin/orders',
    AI_CONSOLE: '/admin/ai-console',
    SEED_DATA: '/admin/seed-data',
    MYSURU_DEMO: '/admin/mysuru-demo',
    DATA_HEALTH: '/admin/data-health',
    PENDING_UPDATES: '/admin/pending-updates',
    OPS_INBOX: '/admin/ops',
    ENTITY_360: (type: string, id: string) => `/admin/entity/${type}/${id}`,
    TICKETS: '/admin/tickets',
    AI_REVIEW: '/admin/ai-review',
    JOBS: '/admin/jobs',
    FINANCE: '/admin/finance',
    FINANCE_OPS: '/admin/finance/ops',
    REFUNDS: '/admin/finance/refunds',
    PAYOUTS: '/admin/finance/payouts',
    DISPUTES: '/admin/disputes',
    SYSTEM_HEALTH: '/admin/system-health',
  },

  // ---------------------------------------------------------------------------
  // Common (shared across roles)
  // ---------------------------------------------------------------------------
  COMMON: {
    PENDING_SYNC: '/pending-sync',
    UPLOADS_MANAGER: '/uploads-manager',
  },
} as const;

export const ROLE_DASHBOARD_ROUTES: Record<string, string> = {
  farmer: ROUTES.FARMER.DASHBOARD,
  buyer: ROUTES.MARKETPLACE.DASHBOARD,
  agent: ROUTES.AGENT.DASHBOARD,
  logistics: ROUTES.LOGISTICS.DASHBOARD,
  admin: ROUTES.ADMIN.DASHBOARD,
};
