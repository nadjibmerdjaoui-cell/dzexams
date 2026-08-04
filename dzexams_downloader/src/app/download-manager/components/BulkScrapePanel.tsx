'use client';

import React, { useState, useEffect } from 'react';
import { CloudDownload, CheckCircle, AlertCircle, RefreshCw, Database, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

// ── Subject lists per level ───────────────────────────────────────────────────
const SECONDARY_SUBJECTS = [
  'رياضيات', 'الفيزياء', 'اللغة العربية', 'الفرنسية', 'الإنجليزية',
  'العلوم الطبيعية', 'التاريخ والجغرافيا', 'التربية الإسلامية',
  'الإعلام الآلي', 'التكنولوجيا', 'الرسم', 'تامزيغت',
];

const MIDDLE_SUBJECTS = [
  'رياضيات', 'العلوم الفيزيائية', 'اللغة العربية', 'اللغة الفرنسية', 'اللغة الإنجليزية',
  'التاريخ والجغرافيا', 'علوم الطبيعة والحياة', 'التربية الإسلامية',
  'التربية المدنية', 'اللغة الأمازيغية', 'الإعلام الآلي', 'التربية الفنية', 'التربية الموسيقية',
];

const PRIMARY_SUBJECTS = [
  'رياضيات', 'اللغة العربية', 'اللغة الفرنسية', 'اللغة الإنجليزية',
  'التربية الإسلامية', 'التربية المدنية', 'اللغة الأمازيغية',
  'التربية العلمية والتكنولوجية', 'التربية الفنية', 'التربية الموسيقية',
];

const SECONDARY_YEARS = ['1AS', '2AS', '3AS'];
const MIDDLE_YEARS    = ['1AM', '2AM', '3AM', '4AM'];
const PRIMARY_YEARS   = ['1AP', '2AP', '3AP', '4AP', '5AP'];

const LEVEL_GROUPS = [
  { key: 'secondary', label: 'ثانوي',   labelFr: 'Secondaire', years: SECONDARY_YEARS, subjects: SECONDARY_SUBJECTS, emoji: '🎓', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  { key: 'middle',    label: 'متوسط',   labelFr: 'Moyen',      years: MIDDLE_YEARS,    subjects: MIDDLE_SUBJECTS,    emoji: '📚', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  { key: 'primary',   label: 'ابتدائي', labelFr: 'Primaire',   years: PRIMARY_YEARS,   subjects: PRIMARY_SUBJECTS,   emoji: '🏫', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
];

interface BulkStats {
  stored: number;
  skipped: number;
  failed: number;
  total: number;
}

interface CatalogStats {
  total: number;
  byYear: Record<string, number>;
  byLevel?: { secondary: number; middle: number; primary: number };
}

type Phase = 'idle' | 'running' | 'done' | 'error';

export default function BulkScrapePanel() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [stats, setStats] = useState<BulkStats | null>(null);
  const [catalogStats, setCatalogStats] = useState<CatalogStats | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState<string[]>(['secondary']);
  const [selectedYears, setSelectedYears] = useState<string[]>(['3AS']);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['رياضيات', 'الفيزياء', 'اللغة العربية']);
  const [limitPerCombo, setLimitPerCombo] = useState(15);
  const [showConfig, setShowConfig] = useState(false);

  // Compute active years/subjects from selected levels
  const activeYears = LEVEL_GROUPS
    .filter((g) => selectedLevels.includes(g.key))
    .flatMap((g) => g.years);

  const activeSubjects = [...new Set(
    LEVEL_GROUPS
      .filter((g) => selectedLevels.includes(g.key))
      .flatMap((g) => g.subjects)
  )];

  useEffect(() => {
    fetchCatalogStats();
  }, []);

  async function fetchCatalogStats() {
    try {
      const res = await fetch('/api/bulk-scrape');
      if (res.ok) {
        const data = await res.json();
        setCatalogStats(data);
      }
    } catch { /* silent */ }
  }

  function toggleLevel(level: string) {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((x) => x !== level) : [...prev, level]
    );
  }

  async function handleBulkScrape() {
    if (phase === 'running') return;
    if (selectedLevels.length === 0) {
      toast.error('اختر مرحلة دراسية واحدة على الأقل');
      return;
    }

    setPhase('running');
    setStats(null);
    setErrors([]);

    try {
      const res = await fetch('/api/bulk-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levels: selectedLevels,
          limitPerCombo,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل الطلب');
      }

      setStats(data.stats);
      setErrors(data.errors || []);
      setPhase('done');
      await fetchCatalogStats();

      toast.success(`تم تخزين ${data.stats.stored} ملف جديد`, {
        description: `تخطي: ${data.stats.skipped} · فشل: ${data.stats.failed}`,
      });
    } catch (e: any) {
      setPhase('error');
      toast.error('فشل التحميل الجماعي', { description: e.message });
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden card-glow" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <CloudDownload size={16} className="text-secondary" />
          <span className="text-sm font-semibold text-foreground">التحميل الجماعي</span>
          <span className="text-xs text-muted-foreground">/ Bulk Scraper</span>
        </div>
        {catalogStats && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Database size={12} />
            <span>{catalogStats.total} ملف محفوظ</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Catalog stats by level */}
        {catalogStats && catalogStats.total > 0 && catalogStats.byLevel && (
          <div className="grid grid-cols-3 gap-2">
            {LEVEL_GROUPS.map((g) => (
              <div key={g.key} className="bg-muted/30 rounded-lg px-3 py-2 text-center">
                <div className="text-sm">{g.emoji}</div>
                <div className="text-base font-bold text-foreground font-tabular">
                  {(catalogStats.byLevel as any)?.[g.key] || 0}
                </div>
                <div className="text-xs text-muted-foreground">{g.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Fallback: stats by year groups */}
        {catalogStats && catalogStats.total > 0 && !catalogStats.byLevel && (
          <div className="grid grid-cols-3 gap-2">
            {LEVEL_GROUPS.map((g) => {
              const count = g.years.reduce((acc, y) => acc + (catalogStats.byYear?.[y] || 0), 0);
              return (
                <div key={g.key} className="bg-muted/30 rounded-lg px-3 py-2 text-center">
                  <div className="text-sm">{g.emoji}</div>
                  <div className="text-base font-bold text-foreground font-tabular">{count}</div>
                  <div className="text-xs text-muted-foreground">{g.label}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Config toggle */}
        <button
          onClick={() => setShowConfig((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Layers size={12} />
          إعدادات الفحص
          {showConfig ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showConfig && (
          <div className="space-y-4 border border-border rounded-lg p-3 bg-muted/10">
            {/* Level selection */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">المرحلة الدراسية</p>
              <div className="flex gap-2 flex-wrap">
                {LEVEL_GROUPS.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => toggleLevel(g.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selectedLevels.includes(g.key)
                        ? `${g.color} border-current`
                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted/60'
                    }`}
                  >
                    <span>{g.emoji}</span>
                    <span>{g.label}</span>
                    <span className="text-xs opacity-70">({g.years.length} سنوات)</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview of selected years */}
            {activeYears.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">السنوات المحددة ({activeYears.length})</p>
                <div className="flex gap-1.5 flex-wrap">
                  {activeYears.map((y) => (
                    <span key={y} className="px-2 py-0.5 rounded text-xs bg-muted/40 text-muted-foreground border border-border">
                      {y}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Limit per combo */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground shrink-0">ملفات لكل مجموعة:</label>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={limitPerCombo}
                onChange={(e) => setLimitPerCombo(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-xs font-tabular text-foreground w-6 text-center">{limitPerCombo}</span>
            </div>

            {/* Estimated combos */}
            <p className="text-xs text-muted-foreground">
              تقدير: {activeYears.length} سنة × {activeSubjects.length} مادة = {activeYears.length * activeSubjects.length} مجموعة
            </p>
          </div>
        )}

        {/* Stats after run */}
        {stats && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 text-center">
              <div className="text-base font-bold text-green-400 font-tabular">{stats.stored}</div>
              <div className="text-xs text-muted-foreground">محفوظ</div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 text-center">
              <div className="text-base font-bold text-yellow-400 font-tabular">{stats.skipped}</div>
              <div className="text-xs text-muted-foreground">موجود</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
              <div className="text-base font-bold text-red-400 font-tabular">{stats.failed}</div>
              <div className="text-xs text-muted-foreground">فشل</div>
            </div>
          </div>
        )}

        {/* Errors toggle */}
        {errors.length > 0 && (
          <div>
            <button
              onClick={() => setShowErrors((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-destructive hover:underline"
            >
              <AlertCircle size={12} />
              {errors.length} خطأ
              {showErrors ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showErrors && (
              <div className="mt-2 max-h-32 overflow-y-auto space-y-1 scrollbar-thin">
                {errors.map((e, i) => (
                  <p key={i} className="text-xs text-muted-foreground truncate">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status line */}
        {phase === 'running' && (
          <div className="flex items-center gap-2 text-xs text-primary">
            <RefreshCw size={12} className="animate-spin" />
            جاري التحميل والتخزين... قد يستغرق بضع دقائق
          </div>
        )}
        {phase === 'done' && (
          <div className="flex items-center gap-2 text-xs text-green-400">
            <CheckCircle size={12} />
            اكتمل التخزين — الملفات متاحة من المنصة مباشرة
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleBulkScrape}
          disabled={phase === 'running'}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            phase === 'running' ?'bg-primary/10 text-primary cursor-wait' :'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]'
          }`}
        >
          {phase === 'running' ? (
            <><RefreshCw size={14} className="animate-spin" /> جاري التحميل الجماعي...</>
          ) : (
            <><CloudDownload size={14} /> {phase === 'done' ? 'تحميل جماعي مجدداً' : 'بدء التحميل الجماعي'}</>
          )}
        </button>

        <p className="text-xs text-muted-foreground text-center">
          الملفات تُخزَّن على المنصة وتُعرض بدون أي روابط خارجية
        </p>
      </div>
    </div>
  );
}
