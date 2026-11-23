-- Lock subscription and payment state behind trusted server-side operations.
-- Authenticated users may read their own records, but cannot grant themselves a paid plan.

DROP POLICY IF EXISTS "users_manage_own_subscriptions" ON public.user_subscriptions;
CREATE POLICY "users_view_own_subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_manage_own_payments" ON public.payments;
CREATE POLICY "users_view_own_payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Explicitly remove direct write privileges from ordinary authenticated users.
REVOKE INSERT, UPDATE, DELETE ON public.user_subscriptions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM anon, authenticated;

-- Keep invoice history read-only for its owner.
REVOKE INSERT, UPDATE, DELETE ON public.invoices FROM anon, authenticated;
