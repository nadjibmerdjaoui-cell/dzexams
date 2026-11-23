import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'يرجى تسجيل الدخول أولاً' }, { status: 401 });

    const body = await req.json();
    const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    if (reference.length < 5 || reference.length > 100) {
      return NextResponse.json({ error: 'أدخل رقم أو مرجع التحويل الصحيح (5 أحرف على الأقل).' }, { status: 400 });
    }

    const { error } = await supabase.rpc('submit_manual_ccp_payment', { p_reference: reference });
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'رقم التحويل هذا مسجل من قبل.' }, { status: 409 });
      console.error('[Manual CCP] Submission failed:', error.message);
      return NextResponse.json({ error: 'تعذر تسجيل طلب الدفع. حاول مرة أخرى.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'تم إرسال طلبك. سيتم تفعيل الاشتراك بعد التحقق من وصول المبلغ.' });
  } catch (error) {
    console.error('[Manual CCP] Submission failed:', error);
    return NextResponse.json({ error: 'خدمة الدفع غير متاحة حالياً.' }, { status: 503 });
  }
}
