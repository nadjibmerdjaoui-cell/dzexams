'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { CloudDownload, CircleCheck as CheckCircle, Circle as XCircle, SkipForward, Loader as Loader2, Play, Square, RefreshCw, Database, BookOpen, GraduationCap, School } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ImportEvent {
  type: string;
  title?: string;
  year?: string;
  subject?: string;
  docType?: string;
  size?: string;
  reason?: string;
  count?: number;
  combosDone?: number;
  totalCombos?: number;
  stats?: { stored: number; skipped: number; failed: number; total: number };
  message?: string;
}

interface LogEntry {
  id: number;
  type: 'stored' | 'skipped' | 'failed' | 'info' | 'error';
  text: string;
  year?: string;
  subject?: string;
}

interface CatalogStats {
  total: number;
  byLevel: { secondary: number; middle: number; primary: number };
  byYear: Record<string, number>;
}

type Level = 'secondary' | 'middle' | 'primary';

const LEVEL_CONFIG = {
  secondary: {
    label: 'ثانوي',
    labelFr: 'Secondaire',
    emoji: '🎓',
    years: ['1AS', '2AS', '3AS'],
    color: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400',
    activeColor: 'border-indigo-400 bg-indigo-500/20 text-indigo-300',
  },
  middle: {
    label: 'متوسط',
    labelFr: 'Moyen',
    emoji: '📚',
    years: ['1AM', '2AM', '3AM', '4AM'],
    color: 'border-teal-500/40 bg-teal-500/10 text-teal-400',
    activeColor: 'border-teal-400 bg-teal-500/20 text-teal-300',
  },
  primary: {
    label: 'ابتدائي',
    labelFr: 'Primaire',
    emoji: '🏫',
    years: ['1AP', '2AP', '3AP', '4AP', '5AP'],
    color: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
    activeColor: 'border-orange-400 bg-orange-500/20 text-orange-300',
  },
};

const LIMIT_OPTIONS = [5, 10, 15, 20, 30, 50];

let logIdCounter = 0;

export default function ImportPage() {
  const [selectedLevels, setSelectedLevels] = useState<Level[]>(['secondary', 'middle', 'primary']);
  const [limitPerCombo, setLimitPerCombo] = useState(50);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState({ stored: 0, skipped: 0, failed: 0, total: 0 });
  const [progress, setProgress] = useState(0);
  const [currentCombo, setCurrentCombo] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [catalogStats, setCatalogStats] = useState<CatalogStats | null>(null);
  const [totalCombos, setTotalCombos] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: LogEntry['type'], text: string, year?: string, subject?: string) => {
    setLogs((prev) => {
      const next = [...prev, { id: ++logIdCounter, type, text, year, subject }];
      return next.slice(-300); // keep last 300 entries
    });
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const fetchCatalogStats = useCallback(async () => {
    try {
      const res = await fetch('/api/import-pdfs');
      if (res.ok) {
        const data = await res.json();
        setCatalogStats(data);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchCatalogStats();
  }, [fetchCatalogStats]);

  const toggleLevel = (level: Level) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const totalYears = selectedLevels.reduce(
    (acc, l) => acc + LEVEL_CONFIG[l].years.length, 0
  );

  const handleStart = async () => {
    if (selectedLevels.length === 0) return;
    setRunning(true);
    setDone(false);
    setStats({ stored: 0, skipped: 0, failed: 0, total: 0 });
    setProgress(0);
    setCurrentCombo('');
    setLogs([]);
    setTotalCombos(0);

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/import-pdfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levels: selectedLevels, limitPerCombo }),
        signal: abortRef.current.signal,
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: ImportEvent = JSON.parse(line.slice(6));

            if (event.type === 'start') {
              setTotalCombos(event.totalCombos || 0);
              addLog('info', `بدء الاستيراد — ${event.totalCombos} مجموعة`);
            } else if (event.type === 'combo') {
              setCurrentCombo(`${event.year} / ${event.subject}`);
              setProgress(
                event.totalCombos
                  ? Math.round(((event.combosDone || 0) / event.totalCombos) * 100)
                  : 0
              );
            } else if (event.type === 'combo_docs') {
              addLog('info', `${event.year} · ${event.subject} — وُجد ${event.count} مستند`);
            } else if (event.type === 'file_stored') {
              setStats((s) => ({ ...s, stored: s.stored + 1 }));
              addLog('stored', `✅ ${event.title} (${event.size})`, event.year, event.subject);
            } else if (event.type === 'file_skipped') {
              setStats((s) => ({ ...s, skipped: s.skipped + 1 }));
              addLog('skipped', `⏭ ${event.title}`, event.year, event.subject);
            } else if (event.type === 'file_failed') {
              setStats((s) => ({ ...s, failed: s.failed + 1 }));
              addLog('failed', `❌ ${event.title} — ${event.reason}`);
            } else if (event.type === 'combo_done') {
              if (event.stats) setStats(event.stats);
              if (event.totalCombos) {
                setProgress(Math.round(((event.combosDone || 0) / event.totalCombos) * 100));
              }
            } else if (event.type === 'done') {
              if (event.stats) setStats(event.stats);
              setProgress(100);
              setDone(true);
              setRunning(false);
              addLog('info', `اكتمل الاستيراد — محفوظ: ${event.stats?.stored} · متخطى: ${event.stats?.skipped} · فشل: ${event.stats?.failed}`);
              fetchCatalogStats();
            } else if (event.type === 'error') {
              addLog('error', `خطأ: ${event.message}`);
              setRunning(false);
            }
          } catch { /* bad JSON line */ }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        addLog('error', `خطأ في الاتصال: ${err.message}`);
      }
      setRunning(false);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setRunning(false);
    addLog('info', 'تم إيقاف الاستيراد بواسطة المستخدم');
  };

  return (
    <AppLayout activePath="/admin/import">
      <div className="flex flex-col min-h-full" dir="rtl">
        {/* Header */}
        <div
          className="relative overflow-hidden border-b border-border px-6 py-7"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)' }}
        >
          <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-cyan-500/5 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <CloudDownload size={24} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">استيراد ملفات PDF</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                تحميل وتخزين ملفات dzexams.com مباشرة في قاعدة البيانات
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-5 p-6 max-w-7xl mx-auto w-full">
          {/* ── Left panel: config ── */}
          <div className="xl:col-span-1 space-y-4">
            {/* Current catalog */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Database size={14} className="text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">الكتالوج الحالي</span>
              </div>
              {catalogStats ? (
                <div className="space-y-2">
                  <div className="text-3xl font-black text-foreground font-tabular">
                    {catalogStats.total.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground mr-2">ملف محفوظ</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {(['secondary', 'middle', 'primary'] as Level[]).map((l) => (
                      <div key={l} className="text-center">
                        <div className="text-lg font-bold text-foreground font-tabular">
                          {catalogStats.byLevel[l]}
                        </div>
                        <div className="text-xs text-muted-foreground">{LEVEL_CONFIG[l].label}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={fetchCatalogStats}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                  >
                    <RefreshCw size={11} />
                    تحديث
                  </button>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> جارٍ التحميل...
                </div>
              )}
            </div>

            {/* Level selection */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                اختر المراحل الدراسية
              </p>
              <div className="space-y-2">
                {(Object.keys(LEVEL_CONFIG) as Level[]).map((level) => {
                  const cfg = LEVEL_CONFIG[level];
                  const isSelected = selectedLevels.includes(level);
                  const stored = catalogStats?.byLevel[level] || 0;
                  return (
                    <button
                      key={level}
                      onClick={() => !running && toggleLevel(level)}
                      disabled={running}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-150 text-right
                        ${isSelected ? cfg.activeColor : `border-border bg-muted/20 text-muted-foreground hover:bg-muted/40`}
                        ${running ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className="text-2xl">{cfg.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{cfg.label}</span>
                          <span className="text-xs opacity-70">{cfg.labelFr}</span>
                        </div>
                        <div className="text-xs opacity-70 mt-0.5">
                          {cfg.years.join(' · ')}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {stored > 0 && (
                          <div className="text-xs font-tabular opacity-80">{stored} مخزّن</div>
                        )}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
                            isSelected ? 'border-current bg-current/20' : 'border-border'
                          }`}
                        >
                          {isSelected && <CheckCircle size={12} className="text-current" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedLevels.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                  {totalYears} سنة دراسية محددة
                </div>
              )}
            </div>

            {/* Limit per combo */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                ملفات لكل مادة/سنة
              </p>
              <div className="grid grid-cols-3 gap-2">
                {LIMIT_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => !running && setLimitPerCombo(opt)}
                    disabled={running}
                    className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                      limitPerCombo === opt
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                    } ${running ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                الحد الأقصى لكل مجموعة (سنة × مادة)
              </p>
            </div>

            {/* Action button */}
            {!running ? (
              <button
                onClick={handleStart}
                disabled={selectedLevels.length === 0}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-black transition-all duration-150
                  ${selectedLevels.length > 0
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 active:scale-[0.98]'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
              >
                <Play size={18} />
                بدء الاستيراد
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-black bg-red-600 text-white hover:bg-red-700 transition-all duration-150"
              >
                <Square size={16} />
                إيقاف الاستيراد
              </button>
            )}

            {done && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium">
                <CheckCircle size={16} />
                اكتمل الاستيراد بنجاح
              </div>
            )}
          </div>

          {/* ── Right panel: progress + logs ── */}
          <div className="xl:col-span-2 space-y-4">
            {/* Progress card */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-foreground">تقدم الاستيراد</span>
                {running && (
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <Loader2 size={13} className="animate-spin" />
                    {currentCombo}
                  </div>
                )}
                {!running && totalCombos > 0 && (
                  <span className="text-xs text-muted-foreground">{totalCombos} مجموعة إجمالاً</span>
                )}
              </div>

              {/* Main progress bar */}
              <div className="w-full h-3 bg-border rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    running ? 'progress-bar-animated' : done ? 'bg-green-500' : 'bg-primary/40'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                  <CheckCircle size={16} className="text-green-400 mx-auto mb-1" />
                  <div className="text-2xl font-black text-green-400 font-tabular">{stats.stored}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">محفوظ</div>
                </div>
                <div className="bg-muted/30 border border-border rounded-xl p-3 text-center">
                  <SkipForward size={16} className="text-muted-foreground mx-auto mb-1" />
                  <div className="text-2xl font-black text-foreground font-tabular">{stats.skipped}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">موجود مسبقاً</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                  <XCircle size={16} className="text-red-400 mx-auto mb-1" />
                  <div className="text-2xl font-black text-red-400 font-tabular">{stats.failed}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">فشل</div>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
                  <Database size={16} className="text-primary mx-auto mb-1" />
                  <div className="text-2xl font-black text-primary font-tabular">{stats.total}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">إجمالي</div>
                </div>
              </div>
            </div>

            {/* Live log */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  {running && <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />}
                  <span className="text-sm font-semibold text-foreground">سجل العمليات</span>
                  <span className="text-xs font-tabular text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {logs.length}
                  </span>
                </div>
                {logs.length > 0 && !running && (
                  <button
                    onClick={() => setLogs([])}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    مسح
                  </button>
                )}
              </div>

              <div className="h-[420px] overflow-y-auto scrollbar-thin p-3 space-y-1 font-mono text-xs" dir="rtl">
                {logs.length === 0 && !running && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                    <CloudDownload size={28} className="opacity-30" />
                    <span>اضغط "بدء الاستيراد" لرؤية السجل هنا</span>
                  </div>
                )}
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 px-2 py-1 rounded leading-relaxed ${
                      log.type === 'stored'
                        ? 'text-green-400 bg-green-500/5'
                        : log.type === 'failed'
                        ? 'text-red-400 bg-red-500/5'
                        : log.type === 'error'
                        ? 'text-red-300 bg-red-500/10'
                        : log.type === 'skipped'
                        ? 'text-muted-foreground'
                        : 'text-blue-300'
                    }`}
                  >
                    <span className="shrink-0 opacity-50 tabular-nums">
                      {String(log.id).padStart(4, '0')}
                    </span>
                    <span className="flex-1 break-all">{log.text}</span>
                    {log.year && (
                      <span className="shrink-0 text-muted-foreground opacity-60 bg-muted px-1.5 rounded">
                        {log.year}
                      </span>
                    )}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>

            {/* Quick tips */}
            <div className="bg-muted/30 border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">نصائح للاستيراد</p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  الملفات الموجودة مسبقاً تُتخطى تلقائياً — يمكنك إعادة تشغيل الاستيراد بأمان
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  ابدأ بـ 10–15 ملف لكل مادة لاختبار الاتصال، ثم زد الرقم
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  الاستيراد الكامل (متوسط + ابتدائي) يستغرق عدة دقائق — لا تغلق الصفحة
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  في حالة الفشل المتكرر، يعني الموقع المصدر غير متاح مؤقتاً — أعد المحاولة لاحقاً
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
