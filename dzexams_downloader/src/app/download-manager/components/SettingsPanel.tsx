'use client';

import React, { useState } from 'react';
import { Settings, FolderOpen, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPanel() {
  const [downloadPath, setDownloadPath] = useState('/home/user/DzExams/');
  const [namingConvention, setNamingConvention] = useState('{year}_{subject}_{type}_{name}');
  const [maxConcurrent, setMaxConcurrent] = useState('3');
  const [autoOrganize, setAutoOrganize] = useState(true);
  const [createSubfolders, setCreateSubfolders] = useState(true);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    // Backend integration point: persist settings to local config or user preferences
    setTimeout(() => {
      setSaving(false);
      toast?.success('تم حفظ الإعدادات', { description: 'Paramètres sauvegardés' });
    }, 800);
  };

  return (
    <div className="space-y-4">
      {/* Settings card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden card-glow">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Settings size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">الإعدادات</span>
          <span className="text-xs text-muted-foreground">/ Paramètres</span>
        </div>

        <div className="p-4 space-y-4">
          {/* Download path */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              مسار التحميل / Dossier de téléchargement
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={downloadPath}
                onChange={(e) => setDownloadPath(e?.target?.value)}
                className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 transition-colors"
                dir="ltr"
              />
              <button className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/80 transition-all duration-150">
                <FolderOpen size={15} />
              </button>
            </div>
          </div>

          {/* Naming convention */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              نمط التسمية / Convention de nommage
            </label>
            <p className="text-xs text-muted-foreground/70 mb-1.5">
              المتغيرات المتاحة: {'{year}'} {'{subject}'} {'{type}'} {'{name}'}
            </p>
            <input
              type="text"
              value={namingConvention}
              onChange={(e) => setNamingConvention(e?.target?.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono outline-none focus:border-primary/60 transition-colors"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground mt-1">
              مثال: 3AS_رياضيات_دروس_ملف.pdf
            </p>
          </div>

          {/* Max concurrent */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              الحد الأقصى للتحميلات المتزامنة
            </label>
            <select
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent(e?.target?.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 transition-colors"
            >
              {['1', '2', '3', '5', '10']?.map((v) => (
                <option key={`concurrent-${v}`} value={v}>
                  {v} {v === '1' ? 'تحميل' : 'تحميلات'}
                </option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-1">
            {[
              { id: 'toggle-auto', label: 'تنظيم تلقائي', sublabel: 'السنة > المادة > النوع', value: autoOrganize, setter: setAutoOrganize },
              { id: 'toggle-sub', label: 'إنشاء مجلدات فرعية', sublabel: 'لكل نوع وثيقة', value: createSubfolders, setter: setCreateSubfolders },
            ]?.map((toggle) => (
              <div key={toggle?.id} className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-foreground">{toggle?.label}</span>
                  <span className="text-xs text-muted-foreground block">{toggle?.sublabel}</span>
                </div>
                <button
                  onClick={() => toggle?.setter(!toggle?.value)}
                  className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
                    toggle?.value ? 'bg-primary' : 'bg-border'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                      toggle?.value ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-70"
          >
            {saving ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                </svg>
                جاري الحفظ...
              </>
            ) : (
              'حفظ الإعدادات'
            )}
          </button>
        </div>
      </div>
      {/* How it works */}
      <div className="bg-card border border-border rounded-xl overflow-hidden card-glow">
        <button
          onClick={() => setHowItWorksOpen(!howItWorksOpen)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">كيف يعمل التطبيق؟</span>
          </div>
          {howItWorksOpen ? (
            <ChevronUp size={14} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={14} className="text-muted-foreground" />
          )}
        </button>

        {howItWorksOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3 fade-in">
            {[
              { step: '١', title: 'اختر السنة والمادة', desc: 'حدد السنة الدراسية والمواد التي تريد تحميل ملفاتها.' },
              { step: '٢', title: 'اضغط "فحص الآن"', desc: 'سيقوم التطبيق بفحص موقع DzExams واستخراج قائمة الملفات المتاحة.' },
              { step: '٣', title: 'اختر الملفات', desc: 'حدد الملفات المطلوبة أو اختر الكل لتحميل جميع الملفات.' },
              { step: '٤', title: 'تحميل منظم', desc: 'يتم تنظيم الملفات تلقائياً في مجلدات: السنة > المادة > النوع.' },
            ]?.map((item) => (
              <div key={`step-${item?.step}`} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {item?.step}
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground block">{item?.title}</span>
                  <span className="text-xs text-muted-foreground">{item?.desc}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Quick stats */}
      <div className="bg-card border border-border rounded-xl p-4 card-glow">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest block mb-3">
          إحصائيات سريعة
        </span>
        <div className="space-y-2.5">
          {[
            { label: 'آخر تحديث', value: '2026-08-04 09:15' },
            { label: 'المصدر', value: 'dzexams.com/ar/es' },
            { label: 'إجمالي المواد', value: '12 مادة' },
            { label: 'إجمالي السنوات', value: '3 سنوات' },
          ]?.map((item) => (
            <div key={`quickstat-${item?.label}`} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{item?.label}</span>
              <span className="text-xs font-medium text-foreground font-tabular">{item?.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}