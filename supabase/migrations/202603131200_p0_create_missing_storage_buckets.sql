-- P0: Create missing storage buckets referenced in src/lib/constants.ts
-- kyc-docs, profile-photos, and listings were referenced but never created.

INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-docs', 'kyc-docs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('listings', 'listings', false)
ON CONFLICT (id) DO NOTHING;
