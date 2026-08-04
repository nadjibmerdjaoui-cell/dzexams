'use client';

import dynamic from 'next/dynamic';

const DownloadChartInner = dynamic(() => import('./DownloadChartInner'), { ssr: false });

export default function DownloadChart() {
  return <DownloadChartInner />;
}