import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  createChargilyCheckout,
  createChargilyCustomer,
  PLANS,
  PlanKey,
} from '@/lib/chargily/client';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { planKey } = body as { planKey: PlanKey };

    if (!planKey || !PLANS[planKey]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const plan = PLANS[planKey];
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      return NextResponse.json({ error: 'Site URL is not configured' }, { status: 503 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    let customerId: string | undefined;
    try {
      const customer = await createChargilyCustomer({
        name: profile?.full_name || user.email || 'Easy School User',
        email: profile?.email || user.email || '',
      });
      customerId = customer.id;
    } catch {
      // Chargily customer records are optional.
    }

    const subscriptionPlan = planKey.startsWith('pro') ? 'pro' : 'premium';
    const period = planKey.endsWith('annual') ? 'annual' : 'monthly';

    const checkout = await createChargilyCheckout({
      amount: plan.amount,
      currency: plan.currency,
      success_url: `${siteUrl}/payment/success?plan=${planKey}`,
      failure_url: `${siteUrl}/pricing?status=failed`,
      webhook_endpoint: `${siteUrl}/api/chargily/webhook`,
      customer_id: customerId,
      description: `Easy School ${plan.nameAr} - ${plan.periodAr}`,
      locale: 'ar',
      chargily_pay_fees_allocation: 'customer',
      metadata: {
        user_id: user.id,
        plan_key: planKey,
        subscription_plan: subscriptionPlan,
        period,
      },
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Chargily Checkout] Supabase service role is not configured');
      return NextResponse.json({ error: 'Payment service is not configured' }, { status: 503 });
    }

    const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: paymentInsertError } = await admin.from('payments').insert({
      user_id: user.id,
      chargily_checkout_id: checkout.id,
      plan: subscriptionPlan,
      period,
      amount: plan.amount,
      currency: plan.currency,
      status: 'pending',
      metadata: { plan_key: planKey, customer_id: customerId },
    });

    if (paymentInsertError) {
      console.error('[Chargily Checkout] Could not save pending payment:', paymentInsertError.message);
      return NextResponse.json({ error: 'Could not initialize payment record' }, { status: 500 });
    }

    return NextResponse.json({ checkout_url: checkout.checkout_url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[Chargily Checkout]', message);
    return NextResponse.json({ error: 'Unable to create checkout' }, { status: 500 });
  }
}
