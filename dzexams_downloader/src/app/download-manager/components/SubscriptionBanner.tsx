'use client';

import React from 'react';
import { Crown, Zap, Download, RefreshCw, AlertCircle } from 'lucide-react';
import type { UserSubscription } from '@/lib/hooks/useUserDashboard';

interface SubscriptionBannerProps {
  subscription: UserSubscription | null;
  aiCreditsUsed: number;
  aiCreditsTotal: number;
  downloadQuotaUsed: number;
  downloadQuotaTotal: number;
  loading: boolean;
  error: string | null;
}

const PLAN_CONFIG = {
  free: {
    label: 'مجاني',
    labelFr: 'Gratuit',
    color: 'text-muted-foreground',
    bg: 'bg-muted/40',
    border: 'border-border',
    badgeBg: 'bg-muted text-muted-foreground',
    icon: null,
  },
  pro: {
    label: 'احترافي',
    labelFr: 'Pro',
    color: 'text-primary',
    bg: 'bg-primary/5',
    border: 'border-primary/20',
    badgeBg: 'bg-primary/15 text-primary',
    icon: <Crown size={14} />,
  },
  premium: {
    label: 'بريميوم',
    labelFr: 'Premium',
    color: 'text-amber-400',
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/20',
    badgeBg: 'bg-amber-500/15 text-amber-400',
    icon: <Crown size={14} />,
  },
};

function ProgressBar({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const isHigh = pct >= 80;
  return (
    <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${isHigh ? 'bg-red-400' : color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function SubscriptionBanner({
  subscription,
  aiCreditsUsed,
  aiCreditsTotal,
  downloadQuotaUsed,
  downloadQuotaTotal,
  loading,
  error,
}: SubscriptionBannerProps) {
  const plan = subscription?.plan || 'free';
  const cfg = PLAN_CONFIG[plan];

  if (loading) {
    return (
      <div className={`bg-card border border-border rounded-xl p-4 card-glow animate-pulse`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-24 h-5 bg-muted rounded" />
          <div className="w-16 h-5 bg-muted rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="w-20 h-3 bg-muted rounded" />
              <div className="w-full h-1.5 bg-muted rounded-full" />
              <div className="w-16 h-3 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
        <AlertCircle size={16} className="text-red-400 shrink-0" />
        <span className="text-sm text-red-400">{error}</span>
      </div>
    );
  }

  const expiresAt = subscription?.expires_at
    ? new Date(subscription.expires_at).toLocaleDateString('ar-DZ')
    : null;

  return (
    <div className={`bg-card border ${cfg.border} rounded-xl p-4 card-glow`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">اشتراكي</span>
          <span className="text-xs text-muted-foreground">/ Mon Abonnement</span>
        </div>
        <div className="flex items-center gap-2">
          {cfg.icon && <span className={cfg.color}>{cfg.icon}</span>}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badgeBg}`}>
            {cfg.label} · {cfg.labelFr}
          </span>
          {subscription?.status === 'active' && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot" />
              نشط
            </span>
          )}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* AI Credits */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap size={13} className="text-amber-400" />
              <span className="text-xs font-medium text-muted-foreground">رصيد الذكاء الاصطناعي</span>
            </div>
            <span className="text-xs font-tabular text-foreground">
              {aiCreditsTotal - aiCreditsUsed}
              <span className="text-muted-foreground">/{aiCreditsTotal}</span>
            </span>
          </div>
          <ProgressBar used={aiCreditsUsed} total={aiCreditsTotal} color="bg-amber-400" />
          <span className="text-xs text-muted-foreground">
            {aiCreditsUsed} مستخدم · {aiCreditsTotal - aiCreditsUsed} متبقي
          </span>
        </div>

        {/* Download Quota */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Download size={13} className="text-primary" />
              <span className="text-xs font-medium text-muted-foreground">حصة التحميل</span>
            </div>
            <span className="text-xs font-tabular text-foreground">
              {downloadQuotaTotal === -1 ? (
                <span className="text-primary font-semibold">∞</span>
              ) : (
                <>
                  {downloadQuotaUsed}
                  <span className="text-muted-foreground">/{downloadQuotaTotal}</span>
                </>
              )}
            </span>
          </div>
          {downloadQuotaTotal === -1 ? (
            <div className="w-full h-1.5 bg-primary/20 rounded-full overflow-hidden">
              <div className="h-full w-full rounded-full bg-primary/40" />
            </div>
          ) : (
            <ProgressBar used={downloadQuotaUsed} total={downloadQuotaTotal} color="bg-primary" />
          )}
          <span className="text-xs text-muted-foreground">
            {downloadQuotaTotal === -1
              ? `${downloadQuotaUsed} ملف · غير محدود`
              : `${downloadQuotaUsed} ملف · ${downloadQuotaTotal - downloadQuotaUsed} متبقي`}
          </span>
        </div>

        {/* Subscription validity */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <RefreshCw size={13} className="text-secondary" />
            <span className="text-xs font-medium text-muted-foreground">صلاحية الاشتراك</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-sm font-semibold ${cfg.color} capitalize`}>{cfg.label}</span>
          </div>
          {expiresAt ? (
            <span className="text-xs text-muted-foreground">ينتهي: {expiresAt}</span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {plan === 'free' ? 'مجاني دائماً' : 'لا تاريخ انتهاء'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
