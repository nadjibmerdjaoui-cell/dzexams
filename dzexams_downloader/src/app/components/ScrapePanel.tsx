'use client';

import React, { useState } from 'react';
import { RefreshCw, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ScrapedFile, FailedExtraction } from '@/app/api/scrape/route';

interface ScrapePanelProps {
  onScrapeComplete: (files: ScrapedFile[]) => void;
  selectedYear?: string | null;
  selectedSubjects?: string[];
}

type ScrapeStatus = 'idle' | 'scraping' | 'done' | 'error';

export default function ScrapePanel({ onScrapeComplete, selectedYear, selectedSubjects }: ScrapePanelProps) {
  const [status, setStatus] = useState<ScrapeStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [scrapedCount, setScrapedCount] = useState(0);
  const [lastScrapeTime, setLastScrapeTime] = useState<string | null>(null);

  const handleScrape = async () => {
    if (status === 'scraping') return;
    setStatus('scraping');
    setProgress(0);
    setScrapedCount(0);

    const years = selectedYear ? [selectedYear] : ['1AS', '2AS', '3AS'];
    const subjects = selectedSubjects?.length
      ? selectedSubjects.slice(0, 3)
      : ['رياضيات', 'الفيزياء', 'اللغة العربية'];

    const totalCombinations = years.length * subjects.length;
    let completed = 0;
    const allFiles: ScrapedFile[] = [];
    const allFailed: FailedExtraction[] = [];

    try {
      for (const year of years) {
        for (const subject of subjects) {
          setCurrentStep(`جلب ملفات ${subject} - ${year}...`);

          try {
            const res = await fetch(
              `/api/scrape?year=${encodeURIComponent(year)}&subject=${encodeURIComponent(subject)}&limit=15`
            );
            const data = await res.json();

            if (data.success && data.files?.length > 0) {
              allFiles.push(...data.files);
              setScrapedCount(allFiles.length);
            }

            // Collect failed extractions from this combination
            if (data.failed?.length > 0) {
              allFailed.push(...(data.failed as FailedExtraction[]));
            }
          } catch {
            // continue with other combinations
          }

          completed++;
          setProgress(Math.round((completed / totalCombinations) * 100));
        }
      }

      if (allFiles.length > 0) {
        setStatus('done');
        setLastScrapeTime(new Date().toLocaleTimeString('ar-DZ'));
        setCurrentStep(`تم جلب ${allFiles.length} ملف`);
        onScrapeComplete(allFiles);

        // Show success toast
        toast.success(`تم جلب ${allFiles.length} ملف بنجاح`, {
          description: allFailed.length > 0
            ? `تعذّر استخراج ${allFailed.length} ملف — انظر التفاصيل`
            : 'جميع الروابط مباشرة من dzexams.com',
        });

        // Show warning toast for failed extractions
        if (allFailed.length > 0) {
          const sampleNames = allFailed
            .slice(0, 3)
            .map((f) => f.title || f.pageUrl.split('/').pop())
            .join('، ');
          toast.warning(`تعذّر استخراج ${allFailed.length} ملف`, {
            description: `الملفات: ${sampleNames}${allFailed.length > 3 ? ` و${allFailed.length - 3} آخرين` : ''}`,
            duration: 6000,
          });
        }
      } else {
        setStatus('error');
        setCurrentStep('لم يتم العثور على ملفات');
        toast.error('لم يتم العثور على ملفات', {
          description: 'تحقق من اتصالك أو جرب مادة أخرى',
        });
      }
    } catch {
      setStatus('error');
      setCurrentStep('حدث خطأ أثناء الفحص');
      toast.error('فشل الفحص', {
        description: 'حدث خطأ غير متوقع أثناء جلب الملفات',
      });
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/20">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Globe size={16} className="text-secondary shrink-0" />
        <div className="min-w-0">
          <span className="text-xs font-medium text-foreground block">dzexams.com/ar/es</span>
          {status === 'scraping' && (
            <span className="text-xs text-muted-foreground truncate block">{currentStep}</span>
          )}
          {status === 'done' && (
            <span className="text-xs text-primary flex items-center gap-1">
              <CheckCircle size={10} />
              {scrapedCount} ملف حقيقي · آخر فحص: {lastScrapeTime}
            </span>
          )}
          {status === 'error' && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle size={10} /> {currentStep}
            </span>
          )}
          {status === 'idle' && (
            <span className="text-xs text-muted-foreground">اضغط لجلب روابط PDF الحقيقية من الموقع</span>
          )}
        </div>
      </div>

      {status === 'scraping' && (
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-tabular text-primary">{progress}%</span>
        </div>
      )}

      <button
        onClick={handleScrape}
        disabled={status === 'scraping'}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 shrink-0
          ${status === 'scraping' ?'bg-primary/10 text-primary cursor-wait' :'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
          }`}
      >
        <RefreshCw size={12} className={status === 'scraping' ? 'animate-spin' : ''} />
        {status === 'scraping' ? 'جاري الفحص...' : 'فحص الآن'}
      </button>
    </div>
  );
}