-- Migration: download_jobs table
-- Tracks active/queued/paused download jobs per user

DROP TYPE IF EXISTS public.job_status CASCADE;
CREATE TYPE public.job_status AS ENUM ('downloading', 'paused', 'queued', 'completed', 'cancelled', 'failed');

CREATE TABLE IF NOT EXISTS public.download_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  year TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  file_count INTEGER NOT NULL DEFAULT 0,
  total_size TEXT NOT NULL DEFAULT '0 MB',
  progress INTEGER NOT NULL DEFAULT 0,
  speed TEXT NOT NULL DEFAULT '—',
  eta TEXT NOT NULL DEFAULT '—',
  status public.job_status NOT NULL DEFAULT 'queued'::public.job_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_download_jobs_user_id ON public.download_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_download_jobs_status ON public.download_jobs(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_download_jobs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_download_jobs_updated_at ON public.download_jobs;
CREATE TRIGGER trg_download_jobs_updated_at
  BEFORE UPDATE ON public.download_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_download_jobs_updated_at();

ALTER TABLE public.download_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_download_jobs" ON public.download_jobs;
CREATE POLICY "users_manage_own_download_jobs"
  ON public.download_jobs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
