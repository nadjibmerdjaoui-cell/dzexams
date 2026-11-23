import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { data, error } = await supabase.rpc('admin_list_ccp_payments');
    if (error) {
      const forbidden = error.message.toLowerCase().includes('administrator access required');
      return NextResponse.json({ error: forbidden ? 'Administrator access required' : 'تعذر تحميل طلبات الدفع.' }, { status: forbidden ? 403 : 500 });
    }
    const payments = (data || []).map((p: any) => ({
      id: p.payment_id,
      user_id: p.user_id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      payment_reference: p.payment_reference,
      created_at: p.created_at,
      user_profiles: { email: p.email, full_name: p.full_name },
    }));
    return NextResponse.json({ payments });
  } catch (error) {
    console.error('[Admin payments] Load failed:', error);
    return NextResponse.json({ error: 'تعذر تحميل طلبات الدفع.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const body = await req.json();
    const paymentId = typeof body.paymentId === 'string' ? body.paymentId : '';
    const action = body.action;
    if (!paymentId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('admin_review_ccp_payment', {
      p_payment_id: paymentId,
      p_action: action,
    });
    if (error) {
      const message = error.message.toLowerCase();
      const forbidden = message.includes('administrator access required');
      const conflict = message.includes('already reviewed');
      return NextResponse.json({ error: forbidden ? 'Administrator access required' : conflict ? 'هذا الطلب تمت مراجعته مسبقاً.' : 'تعذر تحديث حالة الدفع.' }, { status: forbidden ? 403 : conflict ? 409 : 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Admin payments] Review failed:', error);
    return NextResponse.json({ error: 'تعذر تحديث حالة الدفع.' }, { status: 500 });
  }
}
