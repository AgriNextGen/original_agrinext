-- Phase D: add file_id links to entity tables
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS pickup_proof_file_id uuid REFERENCES public.files(id);
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS delivery_proof_file_id uuid REFERENCES public.files(id);

ALTER TABLE public.transport_status_events ADD COLUMN IF NOT EXISTS proof_file_id uuid REFERENCES public.files(id);

ALTER TABLE public.crop_media ADD COLUMN IF NOT EXISTS file_id uuid REFERENCES public.files(id);
ALTER TABLE public.crop_media ADD COLUMN IF NOT EXISTS uploaded_by uuid;

ALTER TABLE public.agent_voice_notes ADD COLUMN IF NOT EXISTS file_id uuid REFERENCES public.files(id);

ALTER TABLE public.soil_test_reports ADD COLUMN IF NOT EXISTS report_file_id uuid REFERENCES public.files(id);

ALTER TABLE public.trace_attachments ADD COLUMN IF NOT EXISTS file_id uuid REFERENCES public.files(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trips_pickup_proof_file_id ON public.trips(pickup_proof_file_id);
CREATE INDEX IF NOT EXISTS idx_trips_delivery_proof_file_id ON public.trips(delivery_proof_file_id);

