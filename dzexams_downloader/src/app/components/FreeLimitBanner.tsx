'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Zap, ArrowLeft } from 'lucide-react';

interface FreeLimitBannerProps {
  message: string;
  compact?: boolean;
}

export default function FreeLimitBanner({ message, compact = false }: FreeLimitBannerProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
        <Lock size={12} className="text-amber-500 shrink-0" />
        <span className="text-amber-700 dark:text-amber-400 flex-1">{message}</span>
        <Link
          href="/pricing"
          className="flex items-center gap-1 text-primary font-semibold hover:underline shrink-0"
        >
          ترقية <ArrowLeft size={11} />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl bg-gradient-to-l from-primary/5 to-amber-500/5 border border-amber-500/20">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
          <Lock size={16} className="text-amber-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{message}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            اشترك بـ 200 دج/شهر للوصول الكامل
          </p>
        </div>
      </div>
      <Link
        href="/pricing"
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shrink-0 shadow-sm shadow-primary/20"
      >
        <Zap size={13} />
        اشترك الآن
      </Link>
    </div>
  );
}
