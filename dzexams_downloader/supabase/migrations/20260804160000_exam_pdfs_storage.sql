-- ============================================================
-- Migration: exam_pdfs_storage
-- Creates pdf_catalog table + exam-pdfs storage bucket
-- ============================================================

-- 1. Create pdf_catalog table
CREATE TABLE IF NOT EXISTS public.pdf_catalog (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path  TEXT NOT NULL UNIQUE,
  public_url    TEXT NOT NULL,
  name          TEXT NOT NULL,
  subject       TEXT NOT NULL DEFAULT '',
  subject_fr    TEXT NOT NULL DEFAULT '',
  year          TEXT NOT NULL DEFAULT '',
  doc_type      TEXT NOT NULL DEFAULT '',
  size_bytes    BIGINT NOT NULL DEFAULT 0,
  size_label    TEXT NOT NULL DEFAULT '',
  source_url    TEXT NOT NULL DEFAULT '',
  added_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_pdf_catalog_year        ON public.pdf_catalog(year);
CREATE INDEX IF NOT EXISTS idx_pdf_catalog_subject     ON public.pdf_catalog(subject);
CREATE INDEX IF NOT EXISTS idx_pdf_catalog_doc_type    ON public.pdf_catalog(doc_type);
CREATE INDEX IF NOT EXISTS idx_pdf_catalog_storage_path ON public.pdf_catalog(storage_path);

-- 3. Enable RLS
ALTER TABLE public.pdf_catalog ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies — public read, service-role write
DROP POLICY IF EXISTS "public_read_pdf_catalog" ON public.pdf_catalog;
CREATE POLICY "public_read_pdf_catalog"
  ON public.pdf_catalog
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "service_insert_pdf_catalog" ON public.pdf_catalog;
CREATE POLICY "service_insert_pdf_catalog"
  ON public.pdf_catalog
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_update_pdf_catalog" ON public.pdf_catalog;
CREATE POLICY "service_update_pdf_catalog"
  ON public.pdf_catalog
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_delete_pdf_catalog" ON public.pdf_catalog;
CREATE POLICY "service_delete_pdf_catalog"
  ON public.pdf_catalog
  FOR DELETE
  TO service_role
  USING (true);

-- 5. Create exam-pdfs storage bucket (idempotent via INSERT ... ON CONFLICT)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exam-pdfs',
  'exam-pdfs',
  true,
  52428800,  -- 50 MB per file
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage RLS — public read
DROP POLICY IF EXISTS "public_read_exam_pdfs" ON storage.objects;
CREATE POLICY "public_read_exam_pdfs"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'exam-pdfs');

DROP POLICY IF EXISTS "service_write_exam_pdfs" ON storage.objects;
CREATE POLICY "service_write_exam_pdfs"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'exam-pdfs');

DROP POLICY IF EXISTS "service_update_exam_pdfs" ON storage.objects;
CREATE POLICY "service_update_exam_pdfs"
  ON storage.objects
  FOR UPDATE
  TO service_role
  USING (bucket_id = 'exam-pdfs');

DROP POLICY IF EXISTS "service_delete_exam_pdfs" ON storage.objects;
CREATE POLICY "service_delete_exam_pdfs"
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'exam-pdfs');
