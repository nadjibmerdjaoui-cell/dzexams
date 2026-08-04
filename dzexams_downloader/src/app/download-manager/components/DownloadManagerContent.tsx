'use client';

import React from 'react';
import StatsCards from './StatsCards';
import ActiveDownloads from './ActiveDownloads';
import DownloadHistory from './DownloadHistory';
import FolderStructure from './FolderStructure';
import DownloadChart from './DownloadChart';
import SettingsPanel from './SettingsPanel';
import SubscriptionBanner from './SubscriptionBanner';
import BulkScrapePanel from './BulkScrapePanel';
import { useUserDashboard } from '@/lib/hooks/useUserDashboard';
import Image from 'next/image';

export default function DownloadManagerContent() {
  const {
    subscription,
    downloadHistory,
    aiCreditsUsed,
    aiCreditsTotal,
    downloadQuotaUsed,
    downloadQuotaTotal,
    loading,
    error,
  } = useUserDashboard();

  return (
    <div className="flex flex-col gap-6 pb-8" dir="rtl">
      {/* Colorful page header with school image */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #8b5cf6 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 -translate-x-1/4 translate-y-1/4" />

        <div className="relative flex items-center gap-6 px-6 py-6">
          <div className="flex-1 text-right">
            <div className="flex items-center gap-2 justify-end mb-1">
              <span className="text-xs font-semibold text-cyan-200 bg-cyan-400/20 px-2.5 py-1 rounded-full border border-cyan-400/30">
                📥 مدير التحميل
              </span>
            </div>
            <h1 className="text-2xl font-black text-white">مدير التحميل</h1>
            <p className="text-blue-200 text-sm mt-1">
              Download Manager — تتبع وإدارة جميع مهام التحميل
            </p>
          </div>
          <div className="hidden md:block shrink-0">
            <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-white/30 shadow-2xl">
              <Image
                src="/assets/images/school_building.png"
                alt="مبنى المدرسة الثانوية الجزائرية"
                width={112}
                height={112}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
        <div className="h-4 bg-background" style={{ borderRadius: '50% 50% 0 0 / 100% 100% 0 0', marginTop: '-2px' }} />
      </div>

      <div className="px-6 space-y-6">
        {/* Subscription banner */}
        <SubscriptionBanner
          subscription={subscription}
          aiCreditsUsed={aiCreditsUsed}
          aiCreditsTotal={aiCreditsTotal}
          downloadQuotaUsed={downloadQuotaUsed}
          downloadQuotaTotal={downloadQuotaTotal}
          loading={loading}
          error={error}
        />

        {/* Stats cards */}
        <StatsCards />

        {/* Main content grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-5">
          {/* Left: 2/3 width */}
          <div className="xl:col-span-2 2xl:col-span-2 space-y-5">
            <ActiveDownloads />
            <DownloadChart />
            <DownloadHistory
              history={downloadHistory}
              loading={loading}
              error={error}
            />
          </div>

          {/* Right: 1/3 width */}
          <div className="xl:col-span-1 2xl:col-span-1 space-y-5">
            <BulkScrapePanel />
            <FolderStructure />
            <SettingsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}