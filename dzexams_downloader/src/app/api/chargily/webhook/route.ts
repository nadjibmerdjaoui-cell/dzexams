import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyChargilySignature, ChargilyWebhookEvent } from '@/lib/chargily/client';

// Use service role client for webhook (bypasses RLS)
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient(url, serviceKey);
}

const PLAN_LABELS: Record<string, string> = {
  pro: 'Pro',
  premium: 'Premium',
};

const PERIOD_LABELS: Record<string, string> = {
  monthly: 'شهري',
  annual: 'سنوي',
};

const DOWNLOAD_LIMITS: Record<string, number> = {
  pro: 200,
  premium: 500,
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-DZ', { day: '2-digit', month: 'long', year: 'numeric' });
}

function generateReceiptNumber(paymentId: string): string {
  const short = paymentId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `DZE-${short}`;
}

async function sendTransactionalEmail(
  type: string,
  to: string,
  data: Record<string, unknown>
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-email`;

  try {
    const res = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ type, to, data }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[send-email] Edge function error ${res.status}: ${errText}`);
    } else {
      console.log(`[send-email] Sent ${type} to ${to}`);
    }
  } catch (err) {
    console.error('[send-email] Failed to call edge function:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('signature') || '';

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify HMAC signature
    let isValid = false;
    try {
      isValid = verifyChargilySignature(rawBody, signature);
    } catch {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 403 });
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const event: ChargilyWebhookEvent = JSON.parse(rawBody);
    const checkout = event.data;
    const metadata = checkout.metadata || {};

    const supabase = getServiceClient();

    if (event.type === 'checkout.paid') {
      const userId = metadata.user_id;
      const subscriptionPlan = metadata.subscription_plan as 'pro' | 'premium';
      const period = metadata.period as 'monthly' | 'annual';

      if (!userId || !subscriptionPlan) {
        console.error('[Webhook] Missing metadata', metadata);
        return NextResponse.json({ received: true });
      }

      // Update payment record
      await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('chargily_checkout_id', checkout.id);

      // Calculate subscription expiry
      const now = new Date();
      const expiresAt = new Date(now);
      if (period === 'annual') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      // Update user subscription
      await supabase
        .from('user_subscriptions')
        .update({
          plan: subscriptionPlan,
          status: 'active',
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('user_id', userId);

      // Create invoice record
      const { data: payment } = await supabase
        .from('payments')
        .select('id, amount, currency')
        .eq('chargily_checkout_id', checkout.id)
        .single();

      if (payment) {
        await supabase.from('invoices').insert({
          user_id: userId,
          payment_id: payment.id,
          chargily_invoice_id: checkout.invoice_id || null,
          plan: subscriptionPlan,
          period,
          amount: payment.amount,
          currency: payment.currency,
          status: 'paid',
          issued_at: new Date().toISOString(),
        });
      }

      console.log(`[Webhook] Subscription activated: user=${userId} plan=${subscriptionPlan}`);

      // ── Send transactional emails via Resend ──────────────────────────────
      // Fetch user email from auth
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const userEmail = authUser?.user?.email;

      if (userEmail && payment) {
        const receiptNumber = generateReceiptNumber(payment.id);
        const paidAt = formatDate(now.toISOString());
        const renewalDate = formatDate(expiresAt.toISOString());
        const planLabel = PLAN_LABELS[subscriptionPlan] || subscriptionPlan;
        const periodLabel = PERIOD_LABELS[period] || period;
        const downloadLimit = DOWNLOAD_LIMITS[subscriptionPlan] || 200;

        const emailData = {
          receiptNumber,
          planLabel,
          periodLabel,
          amount: payment.amount,
          currency: payment.currency,
          paidAt,
          renewalDate,
          downloadLimit,
        };

        // Send payment receipt email
        await sendTransactionalEmail('payment_receipt', userEmail, emailData);

        // Send subscription confirmation email
        await sendTransactionalEmail('subscription_confirmation', userEmail, {
          planLabel,
          periodLabel,
          renewalDate,
          downloadLimit,
        });
      }
      // ─────────────────────────────────────────────────────────────────────
    } else if (event.type === 'checkout.failed' || event.type === 'checkout.canceled') {
      await supabase
        .from('payments')
        .update({
          status: event.type === 'checkout.failed' ? 'failed' : 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('chargily_checkout_id', checkout.id);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook error';
    console.error('[Chargily Webhook]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
