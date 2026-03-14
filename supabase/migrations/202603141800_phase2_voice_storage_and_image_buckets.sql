-- Phase 2: Voice responses table and new storage buckets
-- Migration: 202603141800_phase2_voice_storage_and_image_buckets.sql

-- ============================================================
-- 1. Storage buckets for voice responses and image uploads
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('voice-responses', 'voice-responses', false, 10485760, ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']),
  ('crop-images', 'crop-images', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('disease-images', 'disease-images', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. voice_responses — metadata for stored TTS audio
-- ============================================================
CREATE TABLE IF NOT EXISTS public.voice_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  file_path text NOT NULL,
  bucket text NOT NULL DEFAULT 'voice-responses',
  duration_ms int,
  voice_id text,
  language_code text,
  text_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_responses_user_id ON public.voice_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_responses_session_id ON public.voice_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_responses_created_at ON public.voice_responses(created_at DESC);

ALTER TABLE public.voice_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voice responses"
  ON public.voice_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice responses"
  ON public.voice_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role has full access to voice responses"
  ON public.voice_responses FOR ALL
  USING (current_setting('role', true) = 'service_role');

-- ============================================================
-- 3. Storage object policies for new buckets
-- ============================================================

-- voice-responses: service_role writes, user reads own files
CREATE POLICY "voice_responses_select_own"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-responses' AND auth.uid()::text = (storage.foldername(name))[1]);

-- crop-images: service_role writes, user reads own files
CREATE POLICY "crop_images_select_own"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'crop-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- disease-images: service_role writes, user reads own files
CREATE POLICY "disease_images_select_own"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'disease-images' AND auth.uid()::text = (storage.foldername(name))[1]);
