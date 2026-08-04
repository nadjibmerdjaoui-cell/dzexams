'use client';

import React, { useState, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useUserDashboard } from '@/lib/hooks/useUserDashboard';
import {
  User,
  Crown,
  Download,
  Zap,
  CreditCard,
  CheckCircle,
  ArrowLeft,
  Loader2,
  FolderOpen,
  History,
  AlertCircle,
  RefreshCw,
  Lock,
  Star,
  LogOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

function ProgressRing({ used, total, size = 80 }: { used: number; total: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const offset = circumference - (pct / 100) * circumference;
  const isHigh = pct >= 80;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={6} className="stroke-border" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={6}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={`transition-all duration-700 ${isHigh ? 'stroke-red-400' : 'stroke-primary'}`}
      />
    </svg>
  );
}

function QuotaCard({
  icon,
  label,
  labelFr,
  used,
  total,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  labelFr: string;
  used: number;
  total: number;
  color: string;
}) {
  const isUnlimited = total === -1;
  const pct = isUnlimited ? 0 : Math.min((used / total) * 100, 100);
  const isHigh = pct >= 80;

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={color}>{icon}</span>
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{labelFr}</p>
          </div>
        </div>
        {isUnlimited ? (
          <span className="text-2xl font-bold text-primary">∞</span>
        ) : (
          <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
            <ProgressRing used={used} total={total} size={64} />
            <span className="absolute text-xs font-bold text-foreground">{Math.round(pct)}%</span>
          </div>
        )}
      </div>
      {!isUnlimited && (
        <div className="space-y-1.5">
          <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isHigh ? 'bg-red-400' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground font-tabular">
            <span>{used} مستخدم</span>
            <span>{total - used} متبقي / {total}</span>
          </div>
        </div>
      )}
      {isUnlimited && (
        <p className="text-xs text-muted-foreground">{used} مستخدم · غير محدود</p>
      )}
    </div>
  );
}

const statusConfig = {
  completed: { label: 'مكتمل', color: 'bg-primary/20 text-primary border-primary/30' },
  partial: { label: 'جزئي', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  failed: { label: 'فشل', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export default function AccountPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const dashboard = useUserDashboard();
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'partial' | 'failed'>('all');

  const plan = dashboard.subscription?.plan || 'free';
  const isPro = plan !== 'free' && dashboard.subscription?.status === 'active';

  const handleUpgrade = useCallback(async () => {
    if (!user) { router.push('/login'); return; }
    setUpgrading(true);
    setUpgradeError(null);
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
      setUpgradeError(err instanceof Error ? err.message : 'حدث خطأ');
      setUpgrading(false);
    }
  }, [user, router]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const filteredHistory = dashboard.downloadHistory.filter(
    (h) => historyFilter === 'all' || h.status === historyFilter
  );

  const expiresAt = dashboard.subscription?.expires_at
    ? new Date(dashboard.subscription.expires_at).toLocaleDateString('ar-DZ')
    : null;

  return (
    <AppLayout activePath="/account">
      <div className="flex-1 overflow-y-auto" dir="rtl">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-bl from-primary/15 via-background to-secondary/10 border-b border-border px-6 py-8">
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage:
                'radial-gradient(circle at 15% 50%, hsl(var(--primary)) 0%, transparent 50%), radial-gradient(circle at 85% 20%, hsl(var(--secondary)) 0%, transparent 50%)',
            }}
          />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <User size={26} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">
                {user?.email || 'حسابي'}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {isPro ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/25">
                    <Crown size={11} />
                    الاشتراك الكامل · Pro
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                    مجاني · Gratuit
                  </span>
                )}
                {dashboard.subscription?.status === 'active' && (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot" />
                    نشط
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-all duration-150 text-sm shrink-0"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Upgrade error */}
          {upgradeError && (
            <div className="flex items-center gap-3 p-4 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400">
              <AlertCircle size={16} />
              <span className="text-sm">{upgradeError}</span>
            </div>
          )}

          {/* ── Subscription tier card ── */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              الاشتراك · Abonnement
            </h2>
            <div
              className={`rounded-2xl border p-5 ${
                isPro
                  ? 'border-primary/30 bg-gradient-to-bl from-primary/8 to-background' :'border-border bg-card'
              }`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      isPro ? 'bg-primary/10' : 'bg-muted'
                    }`}
                  >
                    {isPro ? (
                      <Crown size={20} className="text-primary" />
                    ) : (
                      <Lock size={20} className="text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-base">
                      {isPro ? 'الاشتراك الكامل' : 'الخطة المجانية'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isPro
                        ? expiresAt
                          ? `ينتهي في: ${expiresAt}`
                          : 'لا تاريخ انتهاء' :'وصول محدود — 3AS فقط'}
                    </p>
                  </div>
                </div>

                {!isPro && (
                  <button
                    onClick={handleUpgrade}
                    disabled={upgrading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all duration-150 shadow-md shadow-primary/25 shrink-0"
                  >
                    {upgrading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <>
                        <Star size={14} className="fill-primary-foreground" />
                        <span>ترقية — 200 دج/شهر</span>
                        <ArrowLeft size={14} />
                      </>
                    )}
                  </button>
                )}

                {isPro && (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <CheckCircle size={16} />
                    مشترك حالياً
                  </span>
                )}
              </div>

              {!isPro && (
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    'تحميل غير محدود',
                    'جميع المستويات',
                    'تحميل ZIP',
                    'مدرّس ذكي بلا حدود',
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle size={12} className="text-primary shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── Quota usage ── */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              استخدام الحصة · Quota
            </h2>
            {dashboard.loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-muted rounded-lg" />
                      <div className="w-28 h-4 bg-muted rounded" />
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full" />
                    <div className="w-20 h-3 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <QuotaCard
                  icon={<Download size={18} />}
                  label="حصة التحميل"
                  labelFr="Quota de téléchargement"
                  used={dashboard.downloadQuotaUsed}
                  total={dashboard.downloadQuotaTotal}
                  color="text-primary"
                />
                <QuotaCard
                  icon={<Zap size={18} />}
                  label="رصيد الذكاء الاصطناعي"
                  labelFr="Crédits IA"
                  used={dashboard.aiCreditsUsed}
                  total={dashboard.aiCreditsTotal}
                  color="text-amber-400"
                />
              </div>
            )}
          </section>

          {/* ── Personal file history ── */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              سجل ملفاتي · Historique personnel
            </h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <History size={15} className="text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">التحميلات السابقة</span>
                  {!dashboard.loading && (
                    <span className="text-xs font-tabular px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {dashboard.downloadHistory.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {(['all', 'completed', 'partial', 'failed'] as const).map((f) => (
                    <button
                      key={`hf-${f}`}
                      onClick={() => setHistoryFilter(f)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 ${
                        historyFilter === f
                          ? 'bg-primary/20 text-primary' :'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {f === 'all' ? 'الكل' : f === 'completed' ? 'مكتمل' : f === 'partial' ? 'جزئي' : 'فشل'}
                    </button>
                  ))}
                </div>
              </div>

              {dashboard.loading && (
                <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">جارٍ التحميل...</span>
                </div>
              )}

              {!dashboard.loading && dashboard.error && (
                <div className="flex items-center gap-2 px-4 py-6 text-red-400">
                  <AlertCircle size={16} />
                  <span className="text-sm">{dashboard.error}</span>
                </div>
              )}

              {!dashboard.loading && !dashboard.error && dashboard.downloadHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <History size={32} className="opacity-25" />
                  <span className="text-sm">لا يوجد سجل تحميلات بعد</span>
                  <span className="text-xs opacity-60">Aucun historique de téléchargement</span>
                </div>
              )}

              {!dashboard.loading && !dashboard.error && dashboard.downloadHistory.length > 0 && (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">الملف</th>
                        <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">السنة</th>
                        <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">الملفات</th>
                        <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">الحجم</th>
                        <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">التاريخ</th>
                        <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((entry, idx) => (
                        <tr
                          key={entry.id}
                          className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${
                            idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/5'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 justify-end">
                              <div className="text-right">
                                <span className="text-sm text-foreground font-medium block" dir="rtl">
                                  {entry.name}
                                </span>
                                <span className="text-xs text-muted-foreground">{entry.doc_type}</span>
                              </div>
                              <FolderOpen size={13} className="text-muted-foreground shrink-0" />
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-xs font-tabular font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {entry.year}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-sm font-tabular text-foreground">{entry.file_count}</span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-sm font-tabular text-muted-foreground">{entry.total_size}</span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-xs text-muted-foreground font-tabular">
                              {new Date(entry.completed_at).toLocaleDateString('ar-DZ', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                                statusConfig[entry.status]?.color || statusConfig.completed.color
                              }`}
                            >
                              {statusConfig[entry.status]?.label || entry.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredHistory.length === 0 && (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <span className="text-sm">لا توجد نتائج للفلتر المحدد</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ── Billing settings ── */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              إعدادات الفوترة · Facturation
            </h2>
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {/* Current plan row */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                    <CreditCard size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">الخطة الحالية</p>
                    <p className="text-xs text-muted-foreground">
                      {isPro ? 'الاشتراك الكامل · 200 دج/شهر' : 'مجاني · 0 دج/شهر'}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isPro ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isPro ? 'نشط' : 'مجاني'}
                </span>
              </div>

              {/* Payment method row */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                    <RefreshCw size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">طريقة الدفع</p>
                    <p className="text-xs text-muted-foreground">Edahabia · CIB · Chargily Pay</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">متاح عند الترقية</span>
              </div>

              {/* Upgrade / manage row */}
              <div className="px-5 py-4">
                {isPro ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle size={16} className="text-primary shrink-0" />
                    <p className="text-sm text-foreground">
                      اشتراكك الكامل نشط.{' '}
                      {expiresAt && (
                        <span className="text-muted-foreground">ينتهي في {expiresAt}.</span>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">ترقية إلى الاشتراك الكامل</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        تحميل غير محدود + جميع المستويات + مدرّس ذكي
                      </p>
                    </div>
                    <button
                      onClick={handleUpgrade}
                      disabled={upgrading}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all duration-150 shadow-md shadow-primary/25 shrink-0 whitespace-nowrap"
                    >
                      {upgrading ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <>
                          <Star size={13} className="fill-primary-foreground" />
                          <span>ترقية — 200 دج</span>
                          <ArrowLeft size={13} />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
