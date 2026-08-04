'use client';

import React, { useState } from 'react';
import { History, FolderOpen, Download, AlertCircle, Loader } from 'lucide-react';
import type { DownloadHistoryEntry } from '@/lib/hooks/useUserDashboard';

interface DownloadHistoryProps {
  history: DownloadHistoryEntry[];
  loading: boolean;
  error: string | null;
}

const statusConfig = {
  completed: { label: 'مكتمل', color: 'bg-primary/20 text-primary border-primary/30' },
  partial: { label: 'جزئي', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  failed: { label: 'فشل', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export default function DownloadHistory({ history, loading, error }: DownloadHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'partial' | 'failed'>('all');

  const filtered = history.filter(
    (h) => filter === 'all' || h.status === filter
  );

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden card-glow">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <History size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">سجل التحميلات</span>
          <span className="text-xs text-muted-foreground">/ Historique</span>
          {!loading && (
            <span className="text-xs font-tabular px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {history.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'completed', 'partial', 'failed'] as const).map((f) => (
            <button
              key={`filter-${f}`}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 ${
                filter === f
                  ? 'bg-primary/20 text-primary' :'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {f === 'all' ? 'الكل' : f === 'completed' ? 'مكتمل' : f === 'partial' ? 'جزئي' : 'فشل'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader size={16} className="animate-spin" />
          <span className="text-sm">جارٍ التحميل...</span>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex items-center gap-2 px-4 py-6 text-red-400">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && history.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
          <History size={32} className="opacity-30" />
          <span className="text-sm">لا يوجد سجل تحميلات بعد</span>
          <span className="text-xs opacity-60">Aucun historique de téléchargement</span>
        </div>
      )}

      {/* Table */}
      {!loading && !error && history.length > 0 && (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">اسم المجموعة</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">السنة</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">الملفات</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">الحجم</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">التاريخ</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">الحالة</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, idx) => (
                <tr
                  key={entry.id}
                  className={`border-b border-border/50 hover:bg-muted/20 transition-colors group ${
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
                      <FolderOpen size={14} className="text-muted-foreground shrink-0" />
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
                      {new Date(entry.completed_at).toLocaleString('ar-DZ', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
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
                  <td className="px-3 py-3 text-right">
                    <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/30 transition-all duration-150">
                      <Download size={11} />
                      <span>إعادة</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <span className="text-sm">لا توجد نتائج للفلتر المحدد</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}