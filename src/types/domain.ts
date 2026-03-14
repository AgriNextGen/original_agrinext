/**
 * Domain types for AgriNext Gen.
 *
 * These are app-level enums and types — NOT auto-generated from Supabase schema.
 * For DB column types, use `src/integrations/supabase/types.ts` (auto-generated).
 *
 * Import pattern:
 *   import type { AppRole, CropStatus, TripStatus } from '@/types/domain';
 */

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/** The 6 user roles in AgriNext. Stored in `public.user_roles` table. */
export type AppRole = 'farmer' | 'agent' | 'logistics' | 'buyer' | 'admin' | 'vendor';

export const APP_ROLES: AppRole[] = ['farmer', 'agent', 'logistics', 'buyer', 'admin', 'vendor'];

// ---------------------------------------------------------------------------
// Crop Status
// ---------------------------------------------------------------------------

/** Crop life cycle stages. Stored in `crops.health_status`. */
export type CropHealthStatus = 'normal' | 'good' | 'warning' | 'critical';

/** Growth stages. Stored in `crops.growth_stage`. */
export type CropGrowthStage =
  | 'seedling'
  | 'vegetative'
  | 'flowering'
  | 'fruiting'
  | 'ready'
  | 'harvested';

// ---------------------------------------------------------------------------
// Transport & Trip Status
// ---------------------------------------------------------------------------

/** Transport request lifecycle states. */
export type TransportRequestStatus =
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'CANCELLED'
  | 'EXPIRED';

/** Trip execution state machine. Transitions enforced server-side by RPC. */
export type TripStatus =
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CLOSED'
  | 'CANCELLED';

// ---------------------------------------------------------------------------
// Order Status
// ---------------------------------------------------------------------------

/** Marketplace order lifecycle. */
export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

// ---------------------------------------------------------------------------
// Listing Status
// ---------------------------------------------------------------------------

export type ListingStatus = 'draft' | 'active' | 'sold' | 'expired' | 'cancelled';

// ---------------------------------------------------------------------------
// Agent Task Status
// ---------------------------------------------------------------------------

export type AgentTaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

// ---------------------------------------------------------------------------
// Job Status (background jobs)
// ---------------------------------------------------------------------------

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------

export type AppLanguage = 'en' | 'kn';
