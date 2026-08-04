'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Download, X, Pause, Play, FolderOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DownloadJob {
  id: string;
  name: string;
  year: string;
  subject: string;
  fileCount: number;
  totalSize: string;
  progress: number;
  speed: string;
  eta: string;
  status: 'downloading' | 'paused' | 'queued';
}

export default function ActiveDownloads() {
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchJobs = useCallback(async () => {
    const { data, error } = await supabase
      .from('download_jobs')
      .select('id, name, year, subject, file_count, total_size, progress, speed, eta, status')
      .in('status', ['downloading', 'paused', 'queued'])
      .order('created_at', { ascending: true });

    if (!error && data) {
      setJobs(
        data.map((row) => ({
          id: row.id,
          name: row.name,
          year: row.year,
          subject: row.subject,
          fileCount: row.file_count,
          totalSize: row.total_size,
          progress: row.progress,
          speed: row.speed,
          eta: row.eta,
          status: row.status as 'downloading' | 'paused' | 'queued',
        }))
      );
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchJobs();
    // Poll every 3 seconds for progress updates
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const togglePause = async (id: string) => {
    const job = jobs.find((j) => j.id === id);
    if (!job) return;
    const newStatus = job.status === 'paused' ? 'downloading' : 'paused';
    // Optimistic update
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: newStatus } : j))
    );
    await supabase
      .from('download_jobs')
      .update({ status: newStatus })
      .eq('id', id);
  };

  const cancelJob = async (id: string) => {
    // Optimistic update
    setJobs((prev) => prev.filter((j) => j.id !== id));
    await supabase
      .from('download_jobs')
      .update({ status: 'cancelled' })
      .eq('id', id);
  };

  const getStatusStyle = (status: string) => {
    if (status === 'downloading') return 'bg-primary/20 text-primary border-primary/30';
    if (status === 'paused') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'downloading') return 'يتحمل';
    if (status === 'paused') return 'متوقف';
    return 'في الانتظار';
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <Download size={32} className="text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">لا توجد مهام تحميل نشطة</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Aucune tâche de téléchargement active
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden card-glow">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary pulse-dot" />
          <span className="text-sm font-semibold text-foreground">مهام التحميل النشطة</span>
          <span className="text-xs text-muted-foreground">/ Téléchargements actifs</span>
        </div>
        <span className="text-xs font-tabular bg-primary/20 text-primary px-2 py-0.5 rounded-full">
          {jobs.length} مهمة
        </span>
      </div>

      <div className="divide-y divide-border">
        {jobs.map((job) => (
          <div key={job.id} className="px-4 py-4 hover:bg-muted/20 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Download size={15} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground truncate" dir="rtl">
                    {job.name}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full border shrink-0 ${getStatusStyle(job.status)}`}>
                    {getStatusLabel(job.status)}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FolderOpen size={11} />
                    {job.year} &gt; {job.subject}
                  </span>
                  <span>·</span>
                  <span className="font-tabular">{job.fileCount} ملف</span>
                  <span>·</span>
                  <span className="font-tabular">{job.totalSize}</span>
                  {job.status === 'downloading' && (
                    <>
                      <span>·</span>
                      <span className="font-tabular text-primary">{job.speed}</span>
                      <span>·</span>
                      <span className="font-tabular">متبقي {job.eta}</span>
                    </>
                  )}
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        job.status === 'downloading'
                          ? 'progress-bar-animated'
                          : job.status === 'paused' ? 'bg-amber-500' : 'bg-border'
                      }`}
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-tabular text-muted-foreground w-10 text-left shrink-0">
                    {job.progress}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => togglePause(job.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
                  title={job.status === 'paused' ? 'استئناف' : 'إيقاف مؤقت'}
                >
                  {job.status === 'paused' ? <Play size={13} /> : <Pause size={13} />}
                </button>
                <button
                  onClick={() => cancelJob(job.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
                  title="إلغاء"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}