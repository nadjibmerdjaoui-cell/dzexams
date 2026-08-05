
-- Ensure exam-pdfs storage bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exam-pdfs',
  'exam-pdfs',
  true,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Ensure pdf_catalog table exists
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

CREATE INDEX IF NOT EXISTS idx_pdf_catalog_year        ON public.pdf_catalog(year);
CREATE INDEX IF NOT EXISTS idx_pdf_catalog_subject     ON public.pdf_catalog(subject);
CREATE INDEX IF NOT EXISTS idx_pdf_catalog_doc_type    ON public.pdf_catalog(doc_type);
CREATE INDEX IF NOT EXISTS idx_pdf_catalog_storage_path ON public.pdf_catalog(storage_path);

ALTER TABLE public.pdf_catalog ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pdf_catalog' AND policyname = 'public_read_pdf_catalog'
  ) THEN
    EXECUTE 'CREATE POLICY "public_read_pdf_catalog" ON public.pdf_catalog FOR SELECT TO public USING (true)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pdf_catalog' AND policyname = 'service_insert_pdf_catalog'
  ) THEN
    EXECUTE 'CREATE POLICY "service_insert_pdf_catalog" ON public.pdf_catalog FOR INSERT TO service_role WITH CHECK (true)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pdf_catalog' AND policyname = 'service_update_pdf_catalog'
  ) THEN
    EXECUTE 'CREATE POLICY "service_update_pdf_catalog" ON public.pdf_catalog FOR UPDATE TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pdf_catalog' AND policyname = 'service_delete_pdf_catalog'
  ) THEN
    EXECUTE 'CREATE POLICY "service_delete_pdf_catalog" ON public.pdf_catalog FOR DELETE TO service_role USING (true)';
  END IF;
END $$;

-- Storage policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'public_read_exam_pdfs'
  ) THEN
    EXECUTE 'CREATE POLICY "public_read_exam_pdfs" ON storage.objects FOR SELECT TO public USING (bucket_id = ''exam-pdfs'')';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'service_write_exam_pdfs'
  ) THEN
    EXECUTE 'CREATE POLICY "service_write_exam_pdfs" ON storage.objects FOR INSERT TO service_role WITH CHECK (bucket_id = ''exam-pdfs'')';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'service_update_exam_pdfs'
  ) THEN
    EXECUTE 'CREATE POLICY "service_update_exam_pdfs" ON storage.objects FOR UPDATE TO service_role USING (bucket_id = ''exam-pdfs'')';
  END IF;
END $$;
