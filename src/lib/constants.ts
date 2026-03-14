/**
 * App-wide constants for AgriNext Gen.
 *
 * Centralises magic strings, configuration values, and shared keys.
 * Import from here instead of hardcoding strings in components/hooks.
 *
 * Usage:
 *   import { ROLES, STORAGE_KEYS, SUPABASE_BUCKETS } from '@/lib/constants';
 */

// ---------------------------------------------------------------------------
// User roles (must match AppRole in src/types/domain.ts)
// ---------------------------------------------------------------------------

export const ROLES = {
  FARMER: 'farmer',
  AGENT: 'agent',
  LOGISTICS: 'logistics',
  BUYER: 'buyer',
  ADMIN: 'admin',
  VENDOR: 'vendor',
} as const;

export type RoleKey = keyof typeof ROLES;

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------

export const STORAGE_KEYS = {
  /** Authenticated user language preference ('en' | 'kn') — scoped to logged-in user */
  LANGUAGE: 'agrinext_language',
  /** Public/unauthenticated page language preference — isolated from dashboard language */
  PUBLIC_LANGUAGE: 'agrinext_public_language',
  /** Active profile ID for multi-profile accounts */
  ACTIVE_PROFILE_ID: 'agrinext_active_profile_id',
  /** Recently accessed accounts list */
  RECENT_ACCOUNTS: 'agrinext_recent_accounts',
  /** Dev role override (from dev-switch-role Edge Function) */
  DEV_ROLE_OVERRIDE: 'agrinext_dev_role',
} as const;

/** Legacy localStorage keys that may exist from older versions. Used for one-time migration. */
export const LEGACY_LANGUAGE_KEYS = [
  'agri-mitra-language',
  'agrinext-language',
] as const;

// ---------------------------------------------------------------------------
// Supabase Storage buckets
// ---------------------------------------------------------------------------

/** Private storage buckets. Always upload via storage-sign-upload-v1 Edge Function. */
export const SUPABASE_BUCKETS = {
  /** Farmer crop photos and evidence media */
  CROP_MEDIA: 'crop-media',
  /** Trip pickup/delivery proof photos */
  TRIP_PROOFS: 'trip-proofs',
  /** Agent soil report documents */
  SOIL_REPORTS: 'soil-reports',
  /** KYC documents (Tier-4, secure schema only) */
  KYC_DOCS: 'kyc-docs',
  /** Profile photos */
  PROFILE_PHOTOS: 'profile-photos',
} as const;

// ---------------------------------------------------------------------------
// Phone / Auth
// ---------------------------------------------------------------------------

/** India phone prefix used for synthetic Supabase Auth emails */
export const PHONE_PREFIX = '91';
/** Synthetic email domain used by signup-by-phone Edge Function */
export const SYNTHETIC_EMAIL_DOMAIN = 'agrinext.local';

// ---------------------------------------------------------------------------
// Pagination defaults
// ---------------------------------------------------------------------------

export const PAGE_SIZE = {
  DEFAULT: 20,
  ADMIN_TABLE: 50,
  NOTIFICATIONS: 10,
} as const;

// ---------------------------------------------------------------------------
// React Query cache times (ms)
// ---------------------------------------------------------------------------

export const CACHE_TIME = {
  /** Fast-changing data: market prices, notifications */
  SHORT: 30_000,        // 30 seconds
  /** Normal app data: crops, trips, listings */
  MEDIUM: 5 * 60_000,  // 5 minutes
  /** Slow-changing data: profiles, districts, config */
  LONG: 30 * 60_000,   // 30 minutes
} as const;

// ---------------------------------------------------------------------------
// Trip status ordered sequence (for progress display)
// ---------------------------------------------------------------------------

export const TRIP_STATUS_ORDER = [
  'ASSIGNED',
  'EN_ROUTE',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CLOSED',
] as const;

// ---------------------------------------------------------------------------
// Transport status badge colours (shared across Farmer, Logistics, Agent)
// ---------------------------------------------------------------------------

export const TRANSPORT_STATUS_COLORS: Record<string, string> = {
  open: 'bg-gray-100 text-gray-800',
  created: 'bg-gray-100 text-gray-800',
  requested: 'bg-blue-100 text-blue-800',
  assigned: 'bg-purple-100 text-purple-800',
  accepted: 'bg-indigo-100 text-indigo-800',
  en_route: 'bg-cyan-100 text-cyan-800',
  pickup_done: 'bg-indigo-100 text-indigo-800',
  picked_up: 'bg-primary/10 text-primary',
  in_transit: 'bg-cyan-100 text-cyan-800',
  in_progress: 'bg-amber-100 text-amber-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-destructive/10 text-destructive',
};

// ---------------------------------------------------------------------------
// Crop status colors — consistent palette across dashboard and pages
// ---------------------------------------------------------------------------
export const CROP_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  growing: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  vegetative: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  flowering: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  harvest_ready: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  ready: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  harvested: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  diseased: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  dormant: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
};

// ---------------------------------------------------------------------------
// Karnataka districts (top-level — full list in useKarnatakaDistricts hook)
// ---------------------------------------------------------------------------

/** Region label shown to users */
export const DEFAULT_REGION = 'Karnataka';
export const DEFAULT_DISTRICT = 'Mysuru';
