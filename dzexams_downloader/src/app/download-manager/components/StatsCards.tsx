import React from 'react';
import { FileText, CheckCircle, Loader, HardDrive } from 'lucide-react';

const stats = [
  {
    id: 'stat-total',
    label: 'إجمالي الملفات المتاحة',
    labelFr: 'Fichiers disponibles',
    value: '9,002',
    subValue: '3 سنوات دراسية',
    icon: <FileText size={18} />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    trend: '+247 هذا الشهر',
    trendUp: true,
  },
  {
    id: 'stat-downloaded',
    label: 'تم تحميله',
    labelFr: 'Téléchargés',
    value: '1,284',
    subValue: 'عبر 14 جلسة',
    icon: <CheckCircle size={18} />,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    trend: '+38 اليوم',
    trendUp: true,
  },
  {
    id: 'stat-active',
    label: 'مهام نشطة',
    labelFr: 'Tâches actives',
    value: '3',
    subValue: 'جارية الآن',
    icon: <Loader size={18} className="animate-spin" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    trend: 'قيد التنفيذ',
    trendUp: null,
  },
  {
    id: 'stat-storage',
    label: 'مساحة التخزين',
    labelFr: 'Stockage utilisé',
    value: '3.7 GB',
    subValue: 'من أصل 10 GB',
    icon: <HardDrive size={18} />,
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    border: 'border-secondary/20',
    trend: '37% مستخدم',
    trendUp: null,
  },
];

export default function StatsCards() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {stats?.map((stat) => (
        <div
          key={stat?.id}
          className={`bg-card border ${stat?.border} rounded-xl p-4 card-glow`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg ${stat?.bg} flex items-center justify-center ${stat?.color}`}>
              {stat?.icon}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${stat?.bg} ${stat?.color}`}>
              {stat?.trend}
            </span>
          </div>
          <div className="space-y-0.5">
            <div className={`text-2xl font-bold font-tabular ${stat?.color}`}>{stat?.value}</div>
            <div className="text-sm font-medium text-foreground">{stat?.label}</div>
            <div className="text-xs text-muted-foreground">{stat?.subValue}</div>
          </div>
        </div>
      ))}
    </div>
  );
}