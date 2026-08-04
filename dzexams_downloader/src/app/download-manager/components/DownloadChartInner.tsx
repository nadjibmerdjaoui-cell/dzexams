'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart2 } from 'lucide-react';

const chartData = [
  { day: 'الأحد', files: 12, size: 28.4 },
  { day: 'الاثنين', files: 38, size: 87.2 },
  { day: 'الثلاثاء', files: 5, size: 11.3 },
  { day: 'الأربعاء', files: 51, size: 124.6 },
  { day: 'الخميس', files: 29, size: 63.8 },
  { day: 'الجمعة', files: 67, size: 158.4 },
  { day: 'السبت', files: 43, size: 97.1 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
      <p className="text-xs font-medium text-foreground mb-1" dir="rtl">{label}</p>
      <p className="text-xs text-primary font-tabular">{payload[0]?.value} ملف</p>
      <p className="text-xs text-muted-foreground font-tabular">{payload[0]?.payload?.size} MB</p>
    </div>
  );
};

export default function DownloadChartInner() {
  const maxFiles = Math.max(...chartData.map((d) => d.files));

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden card-glow">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-secondary" />
          <span className="text-sm font-semibold text-foreground">نشاط التحميل</span>
          <span className="text-xs text-muted-foreground">/ Activité (7 derniers jours)</span>
        </div>
        <span className="text-xs text-muted-foreground">آخر 7 أيام</span>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              reversed
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="files" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.files === maxFiles ? 'var(--primary)' : 'var(--secondary)'}
                  fillOpacity={entry.files === maxFiles ? 1 : 0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}