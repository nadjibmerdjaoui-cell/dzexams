import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/require-admin';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Admin database access is not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('payments')
      .select('id,user_id,plan,period,amount,currency,status,payment_reference,created_at,user_profiles(email,full_name)')
      .eq('metadata->>channel', 'ccp_manual')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ payments: data || [] });
  } catch (error) {
    console.error('[Admin payments] Load failed:', error);
    return NextResponse.json({ error: 'تعذر تحميل طلبات الدفع.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await req.json();
    const paymentId = typeof body.paymentId === 'string' ? body.paymentId : '';
    const action = body.action;
    if (!paymentId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data: payment, error: lookupError } = await admin
      .from('payments')
      .select('id,user_id,plan,period,amount,currency,status,metadata')
      .eq('id', paymentId)
      .eq('metadata->>channel', 'ccp_manual')
      .maybeSingle();

    if (lookupError || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.status !== 'pending') {
      return NextResponse.json({ error: 'هذا الطلب تمت مراجعته مسبقاً.' }, { status: 409 });
    }

    const { data: { user: adminUser } } = await (await import('@/lib/supabase/server')).createClient()
      .then(client => client.auth.getUser());

    if (action === 'reject') {
      const { error } = await admin.from('payments')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: adminUser?.id || null })
        .eq('id', paymentId).eq('status', 'pending');
      if (error) throw error;
      return NextResponse.json({ success: true, status: 'rejected' });
    }

    const now = new Date();
    const { data: currentSub, error: subLookupError } = await admin
      .from('user_subscriptions')
      .select('id,expires_at,status')
      .eq('user_id', payment.user_id)
      .maybeSingle();
    if (subLookupError) throw subLookupError;

    const currentExpiry = currentSub?.expires_at ? new Date(currentSub.expires_at) : null;
    const base = currentSub?.status === 'active' && currentExpiry && currentExpiry > now ? currentExpiry : now;
    const expiresAt = new Date(base);
    if (payment.period === 'annual') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    else expiresAt.setMonth(expiresAt.getMonth() + 1);

    const subscriptionValues = {
      plan: payment.plan,
      status: 'active',
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      updated_at: now.toISOString(),
    };
    if (currentSub) {
      const { error } = await admin.from('user_subscriptions').update(subscriptionValues).eq('id', currentSub.id);
      if (error) throw error;
    } else {
      const { error } = await admin.from('user_subscriptions').insert({ user_id: payment.user_id, ...subscriptionValues });
      if (error) throw error;
    }

    const { error: paidError } = await admin.from('payments')
      .update({ status: 'paid', paid_at: now.toISOString(), reviewed_at: now.toISOString(), reviewed_by: adminUser?.id || null })
      .eq('id', paymentId).eq('status', 'pending');
    if (paidError) throw paidError;

    await admin.from('invoices').insert({
      user_id: payment.user_id,
      payment_id: payment.id,
      plan: payment.plan,
      period: payment.period,
      amount: payment.amount,
      currency: payment.currency,
      status: 'paid',
      issued_at: now.toISOString(),
    });

    return NextResponse.json({ success: true, status: 'paid', expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error('[Admin payments] Review failed:', error);
    return NextResponse.json({ error: 'تعذر تحديث حالة الدفع.' }, { status: 500 });
  }
}
