-- ============================================================
-- DzExams: Chargily Payments + Invoices
-- ============================================================

-- 1. TYPES
DROP TYPE IF EXISTS public.payment_status CASCADE;
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'canceled');

DROP TYPE IF EXISTS public.payment_period CASCADE;
CREATE TYPE public.payment_period AS ENUM ('monthly', 'annual');

-- 2. TABLES
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    chargily_checkout_id TEXT NOT NULL UNIQUE,
    plan public.subscription_plan NOT NULL DEFAULT 'free'::public.subscription_plan,
    period public.payment_period NOT NULL DEFAULT 'monthly'::public.payment_period,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'dzd',
    status public.payment_status NOT NULL DEFAULT 'pending'::public.payment_status,
    metadata JSONB DEFAULT '{}'::jsonb,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    chargily_invoice_id TEXT,
    plan public.subscription_plan NOT NULL DEFAULT 'free'::public.subscription_plan,
    period public.payment_period NOT NULL DEFAULT 'monthly'::public.payment_period,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'dzd',
    status public.payment_status NOT NULL DEFAULT 'pending'::public.payment_status,
    issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_chargily_checkout_id ON public.payments(chargily_checkout_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_id ON public.invoices(payment_id);

-- 4. FUNCTIONS
CREATE OR REPLACE FUNCTION public.set_payment_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 5. ENABLE RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES
DROP POLICY IF EXISTS "users_manage_own_payments" ON public.payments;
CREATE POLICY "users_manage_own_payments"
ON public.payments
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Service role can insert/update payments (for webhook handler)
DROP POLICY IF EXISTS "service_role_manage_payments" ON public.payments;
CREATE POLICY "service_role_manage_payments"
ON public.payments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "users_view_own_invoices" ON public.invoices;
CREATE POLICY "users_view_own_invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "service_role_manage_invoices" ON public.invoices;
CREATE POLICY "service_role_manage_invoices"
ON public.invoices
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 7. TRIGGERS
DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.set_payment_updated_at();

DROP TRIGGER IF EXISTS set_invoices_updated_at ON public.invoices;
CREATE TRIGGER set_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.set_payment_updated_at();
