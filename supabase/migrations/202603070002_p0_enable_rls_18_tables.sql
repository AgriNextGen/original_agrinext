-- P0 SECURITY: Enable RLS on tables with inert policies
-- Verified missing by two-pass audit, March 2026
-- All policies already exist in prior migrations — this activates them

ALTER TABLE public.user_roles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmlands                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_farmer_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_data                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_activity_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_visits               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_voice_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_test_reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trace_attachments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_media                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_activity_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_sources            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_segments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_fetch_logs             ENABLE ROW LEVEL SECURITY;
