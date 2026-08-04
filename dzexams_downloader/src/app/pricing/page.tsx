'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, XCircle, Loader2, FileText, Zap, Lock, ArrowLeft, Star } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Subscription {
  plan: string;
  status: string;
  expires_at: string | null;
}

const FREE_LIMITS = [
  { label: '3 تحميلات يومياً فقط', locked: true },
  { label: 'الوصول لـ 3AS فقط', locked: true },
  { label: 'لا يوجد تحميل ZIP', locked: true },
  { label: 'مدرّس ذكي محدود (5 رسائل/يوم)', locked: true },
];

const PRO_FEATURES = [
  'تحميل غير محدود يومياً',
  'الوصول لجميع المستويات: 1AS, 2AS, 3AS',
  'تحميل ZIP منظّم (حسب المادة والسنة)',
  'مدرّس ذكي بدون حدود',
  'دعم ذو أولوية',
];

function PricingContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [loadingPlan, setLoadingPlan] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUserData = useCallback(async () => {
    if (!user) { setLoadingData(false); return; }
    setLoadingData(true);
    try {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('plan, status, expires_at')
        .eq('user_id', user.id)
        .single();
      if (data) setSubscription(data);
    } catch {
      // ignore
    } finally {
      setLoadingData(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    const status = searchParams.get('status');
    const plan = searchParams.get('plan');
    if (status === 'success' && plan) {
      setStatusMessage({ type: 'success', text: 'تم الدفع بنجاح! سيتم تفعيل اشتراكك خلال لحظات.' });
      fetchUserData();
    } else if (status === 'failed') {
      setStatusMessage({ type: 'error', text: 'فشل الدفع. يرجى المحاولة مرة أخرى.' });
    }
  }, [searchParams, fetchUserData]);

  const handleSubscribe = async () => {
    if (!user) { router.push('/login'); return; }
    setLoadingPlan(true);
    try {
      const res = await fetch('/api/chargily/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey: 'pro_monthly' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إنشاء جلسة الدفع');
      window.location.href = data.checkout_url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ';
      setStatusMessage({ type: 'error', text: msg });
      setLoadingPlan(false);
    }
  };

  const isActive = subscription?.plan !== 'free' && subscription?.status === 'active';

  return (
    <div className="flex-1 overflow-y-auto" dir="rtl">
      {/* Hero banner */}
      <div className="relative overflow-hidden bg-gradient-to-bl from-primary/20 via-background to-secondary/10 border-b border-border px-6 py-10 text-center">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(var(--primary)) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(var(--secondary)) 0%, transparent 50%)' }} />
        <div className="relative z-10 max-w-xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-2">
            <Star size={12} className="fill-primary" />
            اشتراك شامل بسعر واحد
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            كل ما تحتاجه للبكالوريا
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            تحميل غير محدود لجميع المستويات، مدرّس ذكي، وتنظيم تلقائي — كل هذا بـ
            <span className="text-primary font-bold"> 200 دج فقط </span>
            في الشهر
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Status message */}
        {statusMessage && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            statusMessage.type === 'success' ?'bg-green-500/10 border-green-500/30 text-green-600' :'bg-red-500/10 border-red-500/30 text-red-600'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
            <span className="text-sm font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* Active subscription badge */}
        {isActive && (
          <div className="flex items-center justify-between p-4 rounded-xl border border-primary/30 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">اشتراكك الكامل نشط ✓</p>
                {subscription?.expires_at && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ينتهي في: {new Date(subscription.expires_at).toLocaleDateString('ar-DZ')}
                  </p>
                )}
              </div>
            </div>
            <span className="text-xs bg-primary/20 text-primary px-2.5 py-1 rounded-full font-medium">نشط</span>
          </div>
        )}

        {/* Two-column comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Free plan */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <FileText size={20} className="text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">مجاني</h3>
                <p className="text-xs text-muted-foreground">وصول محدود</p>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-foreground">0</span>
              <span className="text-muted-foreground text-sm">دج/شهر</span>
            </div>
            <ul className="space-y-2.5">
              {FREE_LIMITS.map((item) => (
                <li key={item.label} className="flex items-center gap-2.5 text-sm">
                  <Lock size={13} className="text-muted-foreground/60 shrink-0" />
                  <span className="text-muted-foreground">{item.label}</span>
                </li>
              ))}
            </ul>
            <button
              disabled
              className="w-full py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed"
            >
              خطتك الحالية
            </button>
          </div>

          {/* Pro plan — 200 DZA */}
          <div className="rounded-2xl border-2 border-primary bg-gradient-to-b from-primary/5 to-background p-6 space-y-5 relative shadow-lg shadow-primary/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full shadow">
                الأفضل للطلاب
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">الاشتراك الكامل</h3>
                <p className="text-xs text-muted-foreground">كل شيء مفتوح</p>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-primary">200</span>
              <span className="text-muted-foreground text-sm">دج/شهر</span>
            </div>
            <ul className="space-y-2.5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle size={14} className="text-primary shrink-0" />
                  <span className="text-foreground">{f}</span>
                </li>
              ))}
            </ul>
            {isActive ? (
              <button
                disabled
                className="w-full py-2.5 rounded-xl bg-primary/20 text-primary text-sm font-bold cursor-not-allowed"
              >
                ✓ مشترك حالياً
              </button>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={loadingPlan || loadingData}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-primary/30"
              >
                {loadingPlan ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <span>اشترك الآن — 200 دج</span>
                    <ArrowLeft size={15} />
                  </>
                )}
              </button>
            )}
            <p className="text-center text-xs text-muted-foreground">
              الدفع عبر Edahabia أو CIB · Chargily Pay
            </p>
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-foreground text-sm">مقارنة الخطط</h2>
          </div>
          <div className="divide-y divide-border">
            {[
              { feature: 'التحميلات اليومية', free: '3 ملفات', pro: 'غير محدود' },
              { feature: 'المستويات المتاحة', free: '3AS فقط', pro: '1AS + 2AS + 3AS' },
              { feature: 'تحميل ZIP', free: '—', pro: '✓ منظّم تلقائياً' },
              { feature: 'المدرّس الذكي', free: '5 رسائل/يوم', pro: 'غير محدود' },
              { feature: 'الدعم', free: 'عادي', pro: 'ذو أولوية' },
            ].map((row) => (
              <div key={row.feature} className="grid grid-cols-3 px-5 py-3 text-sm">
                <span className="text-muted-foreground">{row.feature}</span>
                <span className="text-center text-muted-foreground/70">{row.free}</span>
                <span className="text-center text-primary font-medium">{row.pro}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 px-5 py-2 bg-muted/20 text-xs text-muted-foreground border-t border-border">
            <span />
            <span className="text-center font-medium">مجاني</span>
            <span className="text-center font-bold text-primary">200 دج/شهر</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <AppLayout activePath="/pricing">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={24} /></div>}>
        <PricingContent />
      </Suspense>
    </AppLayout>
  );
}
