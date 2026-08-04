import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || 'https://dzexamsdo9691.builtwithrocket.new';

    // Get user profile for customer info
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    // Create Chargily customer
    let customerId: string | undefined;
    try {
      const customer = await createChargilyCustomer({
        name: profile?.full_name || user.email || 'DzExams User',
        email: profile?.email || user.email || '',
      });
      customerId = customer.id;
    } catch {
      // Customer creation is optional; proceed without it
    }

    // Determine plan name for subscription table
    const subscriptionPlan = planKey.startsWith('pro') ? 'pro' : 'premium';
    const period = planKey.endsWith('annual') ? 'annual' : 'monthly';

    // Create checkout
    const checkout = await createChargilyCheckout({
      amount: plan.amount,
      currency: plan.currency,
      success_url: `${siteUrl}/payment/success?plan=${planKey}`,
      failure_url: `${siteUrl}/pricing?status=failed`,
      webhook_endpoint: `${siteUrl}/api/chargily/webhook`,
      customer_id: customerId,
      description: `DzExams ${plan.nameAr} - ${plan.periodAr}`,
      locale: 'ar',
      chargily_pay_fees_allocation: 'customer',
      metadata: {
        user_id: user.id,
        plan_key: planKey,
        subscription_plan: subscriptionPlan,
        period,
      },
    });

    // Save pending payment to DB
    await supabase.from('payments').insert({
      user_id: user.id,
      chargily_checkout_id: checkout.id,
      plan: subscriptionPlan,
      period,
      amount: plan.amount,
      currency: plan.currency,
      status: 'pending',
      metadata: { plan_key: planKey, customer_id: customerId },
    });

    return NextResponse.json({ checkout_url: checkout.checkout_url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[Chargily Checkout]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
