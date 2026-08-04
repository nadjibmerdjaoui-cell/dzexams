-- ============================================================
-- DzExams: Personal Download History
-- ============================================================

-- 1. TYPES
DROP TYPE IF EXISTS public.download_status CASCADE;
CREATE TYPE public.download_status AS ENUM ('completed', 'partial', 'failed');

-- 2. TABLE
CREATE TABLE IF NOT EXISTS public.download_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    year TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL DEFAULT '',
    doc_type TEXT NOT NULL DEFAULT '',
    file_count INTEGER NOT NULL DEFAULT 0,
    total_size TEXT NOT NULL DEFAULT '0 MB',
    status public.download_status NOT NULL DEFAULT 'completed'::public.download_status,
    completed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_download_history_user_id ON public.download_history(user_id);
CREATE INDEX IF NOT EXISTS idx_download_history_completed_at ON public.download_history(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_download_history_status ON public.download_history(status);

-- 4. FUNCTIONS
CREATE OR REPLACE FUNCTION public.set_download_history_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 5. ENABLE RLS
ALTER TABLE public.download_history ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES
DROP POLICY IF EXISTS "users_manage_own_download_history" ON public.download_history;
CREATE POLICY "users_manage_own_download_history"
ON public.download_history
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 7. TRIGGERS
DROP TRIGGER IF EXISTS set_download_history_updated_at ON public.download_history;
CREATE TRIGGER set_download_history_updated_at
    BEFORE UPDATE ON public.download_history
    FOR EACH ROW EXECUTE FUNCTION public.set_download_history_updated_at();

-- 8. MOCK DATA
DO $$
DECLARE
    existing_user_id UUID;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_profiles'
    ) THEN
        SELECT id INTO existing_user_id FROM public.user_profiles LIMIT 1;

        IF existing_user_id IS NOT NULL THEN
            INSERT INTO public.download_history (id, user_id, name, year, subject, doc_type, file_count, total_size, status, completed_at)
            VALUES
                (gen_random_uuid(), existing_user_id, 'رياضيات 3AS — تصحيحات البكالوريا', '3AS', 'رياضيات', 'تصحيحات', 12, '28.4 MB', 'completed'::public.download_status, NOW() - INTERVAL '1 hour'),
                (gen_random_uuid(), existing_user_id, 'فيزياء 1AS — الكل', '1AS', 'الفيزياء', 'الكل', 31, '67.2 MB', 'completed'::public.download_status, NOW() - INTERVAL '15 hours'),
                (gen_random_uuid(), existing_user_id, 'اللغة العربية 2AS — دروس', '2AS', 'اللغة العربية', 'دروس', 8, '12.1 MB', 'completed'::public.download_status, NOW() - INTERVAL '19 hours'),
                (gen_random_uuid(), existing_user_id, 'الفرنسية 3AS — تمارين واختبارات', '3AS', 'الفرنسية', 'تمارين + اختبارات', 19, '41.8 MB', 'partial'::public.download_status, NOW() - INTERVAL '2 days'),
                (gen_random_uuid(), existing_user_id, 'التاريخ والجغرافيا 2AS', '2AS', 'التاريخ والجغرافيا', 'الكل', 22, '58.3 MB', 'completed'::public.download_status, NOW() - INTERVAL '2 days'),
                (gen_random_uuid(), existing_user_id, 'العلوم الطبيعية 1AS', '1AS', 'العلوم الطبيعية', 'دروس', 14, '29.6 MB', 'completed'::public.download_status, NOW() - INTERVAL '3 days'),
                (gen_random_uuid(), existing_user_id, 'الإعلام الآلي 3AS — كل الملفات', '3AS', 'الإعلام الآلي', 'الكل', 37, '89.1 MB', 'completed'::public.download_status, NOW() - INTERVAL '4 days'),
                (gen_random_uuid(), existing_user_id, 'التكنولوجيا 2AS', '2AS', 'التكنولوجيا', 'دروس + تمارين', 11, '48.2 MB', 'failed'::public.download_status, NOW() - INTERVAL '5 days')
            ON CONFLICT (id) DO NOTHING;
        ELSE
            RAISE NOTICE 'No existing users found. Skipping download_history mock data.';
        END IF;
    ELSE
        RAISE NOTICE 'Table user_profiles does not exist. Skipping download_history mock data.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
