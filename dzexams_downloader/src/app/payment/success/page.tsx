'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import {
  CheckCircle,
  Crown,
  Download,
  Calendar,
  Receipt,
  ArrowRight,
  Loader2,
  Zap,
  Infinity,
  Mail,
} from 'lucide-react';

interface SubscriptionInfo {
  plan: string;
  expires_at: string | null;
  status: string;
}

interface PaymentInfo {
  id: string;
  amount: number;
  currency: string;
  plan: string;
  period: string;
  paid_at: string | null;
}

const PLAN_LABELS: Record<string, { ar: string; fr: string }> = {
  pro: { ar: 'برو', fr: 'Pro' },
  premium: { ar: 'بريميوم', fr: 'Premium' },
};

const PERIOD_LABELS: Record<string, { ar: string; fr: string }> = {
  monthly: { ar: 'شهري', fr: 'Mensuel' },
  annual: { ar: 'سنوي', fr: 'Annuel' },
};

const DOWNLOAD_LIMITS: Record<string, number> = {
  pro: 200,
  premium: 500,
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-DZ', { day: '2-digit', month: 'long', year: 'numeric' });
}

function generateReceiptNumber(paymentId: string): string {
  const short = paymentId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `DZE-${short}`;
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planKey = searchParams.get('plan') || '';

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailSent, setEmailSent] = useState(false);
  const emailSentRef = useRef(false);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      // Poll briefly to allow webhook to process
      let sub: SubscriptionInfo | null = null;
      for (let i = 0; i < 4; i++) {
        const { data } = await supabase
          .from('user_subscriptions')
          .select('plan, expires_at, status')
          .eq('user_id', user.id)
          .single();
        if (data && data.status === 'active') {
          sub = data;
          break;
        }
        if (i < 3) await new Promise((r) => setTimeout(r, 1500));
      }
      if (sub) setSubscription(sub);

      // Fetch latest paid payment
      const { data: pay } = await supabase
        .from('payments')
        .select('id, amount, currency, plan, period, paid_at')
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(1)
        .single();

      if (pay) setPayment(pay);

      setLoading(false);

      // Send download links email once (guard against double-send)
      if (!emailSentRef.current && user.email && pay) {
        emailSentRef.current = true;
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
          const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token || anonKey;

          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              type: 'download_links',
              to: user.email,
              data: {
                files: [
                  {
                    name: 'مدير التحميلات — DzExams',
                    url: 'https://dzexamsdo9691.builtwithrocket.new/download-manager',
                    subject: 'جميع المواد',
                    year: 'كل السنوات',
                  },
                  {
                    name: 'تصفح الامتحانات والوثائق',
                    url: 'https://dzexamsdo9691.builtwithrocket.new',
                    subject: 'باكالوريا / BEM',
                    year: '1AS / 2AS / 3AS',
                  },
                ],
              },
            }),
          });
          setEmailSent(true);
        } catch (err) {
          console.error('[PaymentSuccess] Failed to send download links email:', err);
        }
      }
    }

    fetchData();
  }, [router]);

  const activePlan = subscription?.plan || (planKey.startsWith('pro') ? 'pro' : 'premium');
  const planLabel = PLAN_LABELS[activePlan] || { ar: activePlan, fr: activePlan };
  const periodLabel = payment?.period ? PERIOD_LABELS[payment.period] : null;
  const downloadLimit = DOWNLOAD_LIMITS[activePlan] || 200;
  const receiptNumber = payment ? generateReceiptNumber(payment.id) : '—';
  const renewalDate = subscription?.expires_at ? formatDate(subscription.expires_at) : '—';
  const paidAt = payment?.paid_at ? formatDate(payment.paid_at) : formatDate(new Date().toISOString());

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {loading ? (
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm">جارٍ تحميل تفاصيل الطلب…</p>
        </div>
      ) : (
        <div className="w-full max-w-lg">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">تم الدفع بنجاح!</h1>
            <p className="text-muted-foreground text-sm">
              Paiement confirmé — شكراً لاشتراكك في DzExams
            </p>
            {emailSent && (
              <div className="mt-3 inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full px-4 py-1.5 text-xs font-medium">
                <Mail className="w-3.5 h-3.5" />
                تم إرسال الإيصال وروابط التحميل إلى بريدك الإلكتروني
              </div>
            )}
          </div>

          {/* Receipt Card */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg mb-6">
            {/* Plan Badge */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/5 border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الاشتراك المفعّل / Abonnement activé</p>
                  <p className="font-bold text-foreground text-lg">
                    {planLabel.fr}{' '}
                    {periodLabel && (
                      <span className="text-sm font-normal text-muted-foreground">
                        ({periodLabel.fr})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold bg-green-500/15 text-green-500 border border-green-500/30 rounded-full px-3 py-1">
                نشط / Actif
              </span>
            </div>

            {/* Receipt Details */}
            <div className="px-6 py-5 space-y-4">
              {/* Receipt Number */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Receipt className="w-4 h-4" />
                  <span className="text-sm">رقم الإيصال / N° reçu</span>
                </div>
                <span className="font-mono text-sm font-semibold text-foreground bg-muted px-3 py-1 rounded-lg">
                  {receiptNumber}
                </span>
              </div>

              {/* Payment Date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">تاريخ الدفع / Date de paiement</span>
                </div>
                <span className="text-sm font-medium text-foreground">{paidAt}</span>
              </div>

              {/* Renewal Date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">تاريخ التجديد / Date de renouvellement</span>
                </div>
                <span className="text-sm font-medium text-foreground">{renewalDate}</span>
              </div>

              {/* Amount */}
              {payment && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-sm">المبلغ المدفوع / Montant payé</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {payment.amount.toLocaleString()} {payment.currency.toUpperCase()}
                  </span>
                </div>
              )}

              <div className="border-t border-border" />

              {/* Download Limit Unlocked */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Download className="w-4 h-4" />
                  <span className="text-sm">حد التحميل / Limite de téléchargement</span>
                </div>
                <div className="flex items-center gap-1.5 text-primary font-semibold text-sm">
                  <Infinity className="w-4 h-4" />
                  <span>{downloadLimit} ملف/شهر</span>
                </div>
              </div>

              {/* AI Credits */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">رصيد الذكاء الاصطناعي / Crédits IA</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-sm">
                  <span>مفتوح / Illimité</span>
                </div>
              </div>
            </div>
          </div>

          {/* Unlocked Features */}
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <p className="text-sm font-semibold text-foreground mb-3">
              ✅ المزايا المفعّلة / Fonctionnalités débloquées
            </p>
            <ul className="space-y-2">
              {[
                `تحميل حتى ${downloadLimit} ملف شهرياً`,
                'الوصول لجميع السنوات الدراسية',
                'تحميل مجمّع (ZIP)',
                'مساعد الذكاء الاصطناعي بدون قيود',
                'أولوية في الدعم الفني',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push('/download-manager')}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-3 font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              ابدأ التحميل
            </button>
            <button
              onClick={() => router.push('/account')}
              className="flex-1 flex items-center justify-center gap-2 bg-card border border-border text-foreground rounded-xl px-5 py-3 font-semibold text-sm hover:bg-muted transition-colors"
            >
              حسابي
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <AppLayout activePath="/account">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        }
      >
        <PaymentSuccessContent />
      </Suspense>
    </AppLayout>
  );
}
