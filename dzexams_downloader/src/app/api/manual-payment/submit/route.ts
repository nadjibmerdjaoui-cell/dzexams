import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Payment service is not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'يرجى تسجيل الدخول أولاً' }, { status: 401 });

    const body = await req.json();
    const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    if (reference.length < 5 || reference.length > 100) {
      return NextResponse.json({ error: 'أدخل رقم أو مرجع التحويل الصحيح (5 أحرف على الأقل).' }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data: existing } = await admin
      .from('payments')
      .select('id')
      .eq('payment_reference', reference)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'رقم التحويل هذا مسجل من قبل.' }, { status: 409 });
    }

    const { error } = await admin.from('payments').insert({
      user_id: user.id,
      chargily_checkout_id: null,
      plan: 'pro',
      period: 'monthly',
      amount: 200,
      currency: 'dzd',
      status: 'pending',
      payment_reference: reference,
      metadata: { channel: 'ccp_manual', submitted_by_email: user.email || null },
    });
    if (error) {
      console.error('[Manual CCP] Could not save payment:', error.message);
      return NextResponse.json({ error: 'تعذر تسجيل طلب الدفع. حاول مرة أخرى.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'تم إرسال طلبك. سيتم تفعيل الاشتراك بعد التحقق من وصول المبلغ.' });
  } catch (error) {
    console.error('[Manual CCP] Submission failed:', error);
    return NextResponse.json({ error: 'خدمة الدفع غير متاحة حالياً.' }, { status: 503 });
  }
}
