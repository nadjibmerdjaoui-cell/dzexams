'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { ALL_PDF_FILES, PdfFile, SECONDARY_SUBJECTS, MIDDLE_SUBJECTS, PRIMARY_SUBJECTS } from '@/data/mockPdfs';
import { ScrapedFile } from '@/app/api/scrape/route';
import DocTypeFilter from './DocTypeFilter';
import FileTable from './FileTable';
import DownloadBar from './DownloadBar';
import ScrapePanel from './ScrapePanel';
import FreeLimitBanner from './FreeLimitBanner';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Download, Lock } from 'lucide-react';

import Image from 'next/image';

// Free tier limits
const FREE_DAILY_LIMIT = 3;
const FREE_ALLOWED_YEAR = '3AS';

// ── Education level definitions ───────────────────────────────────────────────
const SECONDARY_YEARS = [
  { code: '1AS', labelAr: 'السنة الأولى ثانوي',  labelFr: '1ère Année Secondaire', count: 1921, badge: 'bg-blue-100 text-blue-700',   emoji: '📘', iconBg: 'bg-blue-500' },
  { code: '2AS', labelAr: 'السنة الثانية ثانوي', labelFr: '2ème Année Secondaire', count: 2824, badge: 'bg-violet-100 text-violet-700', emoji: '📗', iconBg: 'bg-violet-500' },
  { code: '3AS', labelAr: 'السنة الثالثة ثانوي', labelFr: 'Baccalauréat — 3ème',   count: 4257, badge: 'bg-indigo-100 text-indigo-700', emoji: '🎓', iconBg: 'bg-indigo-500' },
];

const MIDDLE_YEARS = [
  { code: '1AM', labelAr: 'السنة الأولى متوسط',  labelFr: '1ère Année Moyenne', count: 3527, badge: 'bg-emerald-100 text-emerald-700', emoji: '📒', iconBg: 'bg-emerald-500' },
  { code: '2AM', labelAr: 'السنة الثانية متوسط', labelFr: '2ème Année Moyenne', count: 3382, badge: 'bg-teal-100 text-teal-700',       emoji: '📓', iconBg: 'bg-teal-500' },
  { code: '3AM', labelAr: 'السنة الثالثة متوسط', labelFr: '3ème Année Moyenne', count: 3531, badge: 'bg-cyan-100 text-cyan-700',       emoji: '📔', iconBg: 'bg-cyan-500' },
  { code: '4AM', labelAr: 'السنة الرابعة متوسط', labelFr: '4ème Année — BEM',   count: 5739, badge: 'bg-sky-100 text-sky-700',         emoji: '🏆', iconBg: 'bg-sky-500' },
];

const PRIMARY_YEARS = [
  { code: '1AP', labelAr: 'السنة الأولى ابتدائي',  labelFr: '1ère Année Primaire', count: 1547, badge: 'bg-orange-100 text-orange-700', emoji: '🌟', iconBg: 'bg-orange-500' },
  { code: '2AP', labelAr: 'السنة الثانية ابتدائي', labelFr: '2ème Année Primaire', count: 1623, badge: 'bg-amber-100 text-amber-700',   emoji: '⭐', iconBg: 'bg-amber-500' },
  { code: '3AP', labelAr: 'السنة الثالثة ابتدائي', labelFr: '3ème Année Primaire', count: 1891, badge: 'bg-yellow-100 text-yellow-700', emoji: '✏️', iconBg: 'bg-yellow-500' },
  { code: '4AP', labelAr: 'السنة الرابعة ابتدائي', labelFr: '4ème Année Primaire', count: 2104, badge: 'bg-lime-100 text-lime-700',     emoji: '📝', iconBg: 'bg-lime-500' },
  { code: '5AP', labelAr: 'السنة الخامسة ابتدائي', labelFr: '5ème Année Primaire', count: 2356, badge: 'bg-green-100 text-green-700',   emoji: '🏫', iconBg: 'bg-green-500' },
];

const ALL_YEARS = [...SECONDARY_YEARS, ...MIDDLE_YEARS, ...PRIMARY_YEARS];

const LEVEL_GROUPS = [
  { key: 'secondary', label: 'ثانوي', labelFr: 'Secondaire', years: SECONDARY_YEARS, gradient: 'from-indigo-500 via-purple-500 to-pink-500', emoji: '🎓' },
  { key: 'middle',    label: 'متوسط', labelFr: 'Moyen',      years: MIDDLE_YEARS,    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',   emoji: '📚' },
  { key: 'primary',   label: 'ابتدائي', labelFr: 'Primaire', years: PRIMARY_YEARS,   gradient: 'from-orange-500 via-amber-500 to-yellow-500',  emoji: '🏫' },
];

// Get subjects list for a given year code
function getSubjectsForYear(year: string | null) {
  if (!year) return SECONDARY_SUBJECTS; // default
  if (year.endsWith('AM')) return MIDDLE_SUBJECTS;
  if (year.endsWith('AP')) return PRIMARY_SUBJECTS;
  return SECONDARY_SUBJECTS;
}

function scrapedToPdfFile(f: ScrapedFile): PdfFile {
  return {
    id: f.id,
    name: f.name,
    subject: f.subject,
    subjectFr: f.subjectFr,
    year: f.year,
    type: f.type,
    size: f.size,
    sizeBytes: f.sizeBytes,
    url: f.url,
    addedDate: f.addedDate,
    level: f.level,
  };
}

function downloadViaProxy(url: string, fileName: string) {
  const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(fileName)}`;
  const a = document.createElement('a');
  a.href = proxyUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function downloadZip(
  files: PdfFile[],
  zipName: string,
  onProgress: (pct: number) => void
): Promise<{ success: number; total: number; failedFiles: string[] }> {
  onProgress(10);
  const payload = {
    files: files.map((f) => ({
      url: f.url,
      name: f.name,
      year: f.year,
      subject: f.subject,
      type: f.type,
    })),
    zipName,
  };
  const res = await fetch('/api/download-zip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  onProgress(80);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Server error ${res.status}`);
  }
  const failedCount = parseInt(res.headers.get('X-Failed-Count') || '0', 10);
  const failedFilesHeader = res.headers.get('X-Failed-Files') || '';
  const failedFiles = failedFilesHeader ? failedFilesHeader.split(',').filter(Boolean) : [];
  const successCount = parseInt(res.headers.get('X-Success-Count') || String(files.length), 10);
  const blob = await res.blob();
  onProgress(95);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${zipName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  onProgress(100);
  return { success: successCount, total: files.length, failedFiles };
}

async function fetchCatalogFiles(): Promise<PdfFile[]> {
  try {
    const res = await fetch('/api/catalog');
    if (!res.ok) return [];
    const data = await res.json();
    return (data.files || []) as PdfFile[];
  } catch { return []; }
}

export default function PdfBrowserContent() {
  const { user } = useAuth();
  const supabase = createClient();

  const isEmailVerified = user ? !!user.email_confirmed_at : false;

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [yearOverlayDismissed, setYearOverlayDismissed] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['دروس', 'تمارين', 'اختبارات', 'تصحيحات']);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [scrapedFiles, setScrapedFiles] = useState<PdfFile[]>([]);
  const [hasRealData, setHasRealData] = useState(false);
  const [todayDownloads, setTodayDownloads] = useState(0);
  const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free');
  const [catalogFiles, setCatalogFiles] = useState<PdfFile[]>([]);

  useEffect(() => {
    fetchCatalogFiles().then((files) => {
      if (files.length > 0) {
        setCatalogFiles(files);
        setHasRealData(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data && data.plan !== 'free' && data.status === 'active') {
          setUserPlan('pro');
        }
      });
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('download_history')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('downloaded_at', today)
      .then(({ count }) => {
        setTodayDownloads(count || 0);
      });
  }, [user]);

  const isFree = !user || userPlan === 'free';
  const remainingFreeDownloads = Math.max(0, FREE_DAILY_LIMIT - todayDownloads);

  // Show overlay until user picks a year
  const showYearOverlay = !yearOverlayDismissed && selectedYear === null;

  const handleYearSelect = (yearCode: string) => {
    if (isFree && yearCode !== FREE_ALLOWED_YEAR) {
      toast.error(`${yearCode} متاح للمشتركين فقط`, {
        description: 'اشترك بـ 200 دج/شهر',
        action: { label: 'اشترك', onClick: () => window.location.href = '/pricing' },
      });
      return;
    }
    setSelectedYear(yearCode);
    setSelectedSubject(null);
    setSelectedIds([]);
    setYearOverlayDismissed(true);
  };

  const sourceFiles = catalogFiles.length > 0
    ? catalogFiles
    : hasRealData
      ? scrapedFiles
      : ALL_PDF_FILES;

  const currentSubjects = getSubjectsForYear(selectedYear);

  const availableSubjects = useMemo(() => {
    return currentSubjects.filter((s) =>
      sourceFiles.some(
        (f) => f.subject === s.name && (selectedYear === null || f.year === selectedYear)
      )
    );
  }, [sourceFiles, selectedYear, currentSubjects]);

  const filteredFiles = useMemo(() => {
    return sourceFiles.filter((f) => {
      const yearMatch = selectedYear === null || f.year === selectedYear;
      const yearAccessMatch = !isFree || f.year === FREE_ALLOWED_YEAR;
      const subjectMatch = selectedSubject === null || f.subject === selectedSubject;
      const typeMatch = selectedTypes.includes(f.type);
      return yearMatch && yearAccessMatch && subjectMatch && typeMatch;
    });
  }, [sourceFiles, selectedYear, selectedSubject, selectedTypes, isFree]);

  const selectedFiles = useMemo(
    () => filteredFiles.filter((f) => selectedIds.includes(f.id)),
    [filteredFiles, selectedIds]
  );

  const handleToggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (ids: string[]) => {
    setSelectedIds(ids);
  };

  const handleScrapeComplete = (files: ScrapedFile[]) => {
    const converted = files.map(scrapedToPdfFile);
    setScrapedFiles(converted);
    setHasRealData(true);
    toast.success(`تم جلب ${files.length} ملف حقيقي`);
  };

  const handleDownloadSingle = async (file: PdfFile) => {
    if (!file.url || file.url === '#') {
      toast.error('رابط الملف غير متاح', { description: 'يرجى الضغط على "فحص الآن" أولاً' });
      return;
    }
    if (user && !isEmailVerified) {
      toast.error('يجب تأكيد بريدك الإلكتروني أولاً', {
        action: { label: 'تأكيد الآن', onClick: () => window.location.href = `/auth/verify-otp?email=${encodeURIComponent(user.email || '')}` },
      });
      return;
    }
    if (isFree && remainingFreeDownloads <= 0) {
      toast.error('وصلت إلى حد التحميل اليومي', {
        description: 'اشترك بـ 200 دج/شهر للتحميل غير المحدود',
        action: { label: 'اشترك الآن', onClick: () => window.location.href = '/pricing' },
      });
      return;
    }
    setDownloadingId(file.id);
    try {
      downloadViaProxy(file.url, file.name);
      setTodayDownloads((p) => p + 1);
      toast.success(`بدأ تحميل ${file.name}`);
    } catch {
      toast.error('فشل التحميل');
    } finally {
      setTimeout(() => setDownloadingId(null), 1500);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedFiles.length === 0) return;
    if (user && !isEmailVerified) {
      toast.error('يجب تأكيد بريدك الإلكتروني أولاً');
      return;
    }
    if (isFree) {
      toast.error('تحميل ZIP متاح للمشتركين فقط', {
        action: { label: 'اشترك', onClick: () => window.location.href = '/pricing' },
      });
      return;
    }
    const realFiles = selectedFiles.filter((f) => f.url && f.url !== '#');
    if (realFiles.length === 0) {
      toast.error('لا توجد روابط حقيقية');
      return;
    }
    setIsBulkDownloading(true);
    setDownloadProgress(0);
    try {
      const zipName = `dzexams-${selectedYear || 'all'}-${selectedSubject || 'all'}`;
      const { success, failedFiles } = await downloadZip(realFiles, zipName, setDownloadProgress);
      toast.success(`تم إنشاء أرشيف ZIP لـ ${success} ملف`);
      if (failedFiles.length > 0) {
        toast.error(`تعذّر تحميل ${failedFiles.length} ملف`);
      }
      setSelectedIds([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر إنشاء الأرشيف';
      toast.error('فشل إنشاء ZIP', { description: msg });
    } finally {
      setIsBulkDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleDownloadAll = async () => {
    if (user && !isEmailVerified) { toast.error('يجب تأكيد بريدك الإلكتروني أولاً'); return; }
    if (isFree) {
      toast.error('تحميل الكل متاح للمشتركين فقط', {
        action: { label: 'اشترك', onClick: () => window.location.href = '/pricing' },
      });
      return;
    }
    const realFiles = filteredFiles.filter((f) => f.url && f.url !== '#');
    if (realFiles.length === 0) { toast.error('لا توجد روابط حقيقية'); return; }
    setIsBulkDownloading(true);
    setDownloadProgress(0);
    const toDownload = realFiles.slice(0, 50);
    try {
      const zipName = `dzexams-${selectedYear || 'all'}-all`;
      const { success, failedFiles } = await downloadZip(toDownload, zipName, setDownloadProgress);
      toast.success(`تم إنشاء أرشيف ZIP لـ ${success} ملف`);
      if (failedFiles.length > 0) toast.error(`تعذّر تحميل ${failedFiles.length} ملف`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر إنشاء الأرشيف';
      toast.error('فشل إنشاء ZIP', { description: msg });
    } finally {
      setIsBulkDownloading(false);
      setDownloadProgress(0);
    }
  };

  const showFileTable = selectedYear !== null;

  // Find year info for selected year
  const selectedYearInfo = ALL_YEARS.find((y) => y.code === selectedYear);

  return (
    <div className="flex flex-col min-h-full pb-28" dir="rtl">

      {/* ── Full-screen Level/Year Selection Overlay ── */}
      {showYearOverlay && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-start overflow-y-auto overscroll-contain py-4 sm:py-6" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)' }}>
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white/5 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-white/5 translate-x-1/4 translate-y-1/4 pointer-events-none" />

          <div className="relative w-full max-w-6xl px-4 sm:px-6 flex flex-col items-center gap-4 sm:gap-5 my-auto">
            {/* Header */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 text-xs font-bold px-4 py-1.5 rounded-full mb-4">
                ✨ Easy School — المدرسة السهلة
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight mb-2">
                مرحباً بك في Easy School
              </h1>
              <p className="text-blue-200 text-sm sm:text-base">
                اختر مرحلتك الدراسية للبدء
              </p>
              <p className="text-blue-300/70 text-sm mt-1">
                Choisissez votre niveau scolaire pour commencer
              </p>
            </div>

            {/* Level Groups: three compact columns on desktop */}
            <div className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-start">
            {LEVEL_GROUPS.map((group) => (
              <div key={group.key} className="w-full rounded-2xl border border-white/15 bg-white/10 p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{group.emoji}</span>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white">{group.label}</h2>
                    <p className="text-blue-300 text-xs">{group.labelFr}</p>
                  </div>
                  <div className={`flex-1 h-px bg-gradient-to-r ${group.gradient} opacity-40 mr-2`} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {group.years.map((year) => {
                    const isLocked = isFree && year.code !== FREE_ALLOWED_YEAR;
                    return (
                      <button
                        key={year.code}
                        onClick={() => handleYearSelect(year.code)}
                        className={`relative flex flex-col items-center gap-1.5 p-2.5 sm:p-3 rounded-xl border-2 transition-all duration-200 text-center
                          ${isLocked
                            ? 'border-white/20 bg-white/10 opacity-70 cursor-pointer hover:opacity-90' :'border-white/30 bg-white/15 hover:bg-white/25 hover:border-white/50 hover:scale-105 hover:shadow-2xl'
                          }`}
                      >
                        {isLocked && (
                          <div className="absolute top-2 right-2">
                            <Lock size={12} className="text-white/60" />
                          </div>
                        )}
                        <span className="text-2xl">{year.emoji}</span>
                        <div>
                          <div className="text-base sm:text-lg font-black text-white">{year.code}</div>
                          <div className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 ${year.badge}`}>
                            {year.count.toLocaleString()} وثيقة
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-white leading-tight">{year.labelAr}</p>
                        {isLocked && (
                          <span className="text-xs text-yellow-300 font-semibold bg-yellow-400/20 px-2 py-0.5 rounded-full border border-yellow-400/30">
                            مشتركين فقط
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {[
                { icon: '📄', label: '+25,000 وثيقة' },
                { icon: '🎯', label: 'دروس وتمارين' },
                { icon: '✅', label: 'تصحيحات رسمية' },
                { icon: '🏫', label: 'جميع المراحل' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold">
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)' }}>
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-white/5 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full bg-white/5 translate-x-1/4 translate-y-1/4" />

        <div className="relative flex items-center gap-6 px-6 py-6">
          <div className="flex-1 text-right">
            <div className="flex items-center gap-2 justify-end mb-2">
              <span className="text-xs font-semibold text-yellow-300 bg-yellow-400/20 px-2.5 py-1 rounded-full border border-yellow-400/30">
                ✨ Easy School — المدرسة السهلة
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mb-1">
              {selectedYearInfo ? selectedYearInfo.labelAr : 'وثائق التعليم الجزائري'}
            </h1>
            <p className="text-blue-200 text-sm mb-4">
              أكثر من <span className="text-yellow-300 font-bold">25,000</span> وثيقة — ثانوي، متوسط وابتدائي
            </p>

            {/* Level stats row */}
            <div className="flex items-center gap-3 justify-end flex-wrap">
              {[
                { icon: '🎓', label: 'ثانوي', count: '9,002',  color: 'bg-indigo-500/30 text-indigo-100' },
                { icon: '📚', label: 'متوسط', count: '16,179', color: 'bg-teal-500/30 text-teal-100' },
                { icon: '🏫', label: 'ابتدائي', count: '9,521', color: 'bg-orange-500/30 text-orange-100' },
              ].map((s) => (
                <div key={s.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${s.color} border border-white/10`}>
                  <span className="text-sm">{s.icon}</span>
                  <span className="text-xs font-bold">{s.label}</span>
                  <span className="text-xs opacity-80">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Student image */}
          <div className="hidden md:block relative shrink-0">
            <div className="w-36 h-36 rounded-2xl overflow-hidden border-4 border-white/30 shadow-2xl">
              <Image
                src="/assets/images/students_studying.png"
                alt="طلاب جزائريون يدرسون معاً في الفصل الدراسي"
                width={144}
                height={144}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrape Panel ── */}
      <div className="px-4 pt-4">
        <ScrapePanel
          onScrapeComplete={handleScrapeComplete}
          selectedYear={selectedYear}
          selectedSubjects={selectedSubject ? [selectedSubject] : undefined}
        />
      </div>

      {/* ── Free Limit Banner ── */}
      {isFree && (
        <div className="px-4 pt-3">
          <FreeLimitBanner
            message={`تبقى لك ${remainingFreeDownloads} تحميل مجاني اليوم من أصل ${FREE_DAILY_LIMIT}`}
          />
        </div>
      )}

      {/* ── Year/Level selector (when no year chosen yet) ── */}
      {!showYearOverlay && !showFileTable && (
        <div className="px-4 pt-6 flex flex-col items-center gap-4">
          <p className="text-muted-foreground text-sm text-center">اختر سنة دراسية لعرض الملفات</p>
          {LEVEL_GROUPS.map((group) => (
            <div key={group.key} className="w-full max-w-lg">
              <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                <span>{group.emoji}</span> {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.years.map((year) => (
                  <button
                    key={year.code}
                    onClick={() => handleYearSelect(year.code)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-muted/30 text-sm font-bold text-foreground hover:bg-muted/60 transition-all"
                  >
                    {year.code}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── File Table ── */}
      {showFileTable && (
        <div className="px-4 pt-4 flex flex-col gap-4">
          {/* Doc type filter */}
          <DocTypeFilter
            selectedTypes={selectedTypes}
            onToggleType={handleToggleType}
          />

          {/* Subject quick-filter chips */}
          {availableSubjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSubject(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  selectedSubject === null
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                }`}
              >
                الكل
              </button>
              {availableSubjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSubject(selectedSubject === s.name ? null : s.name)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    selectedSubject === s.name
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                  }`}
                >
                  <span>{s.icon}</span>
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          )}

          <FileTable
            files={filteredFiles}
            selectedIds={selectedIds}
            downloadingId={downloadingId}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onDownloadSingle={handleDownloadSingle}
          />
        </div>
      )}

      {/* ── Download Bar ── */}
      <DownloadBar
        selectedFiles={selectedFiles}
        selectedYear={selectedYear}
        selectedSubjects={selectedSubject ? [selectedSubject] : []}
        isDownloading={isBulkDownloading}
        downloadProgress={downloadProgress}
        onDownloadSelected={handleDownloadSelected}
        onDownloadAll={handleDownloadAll}
        onClearSelection={() => setSelectedIds([])}
      />
    </div>
  );
}