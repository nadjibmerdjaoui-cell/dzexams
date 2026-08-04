'use client';

import React from 'react';
import { Filter } from 'lucide-react';
import { DOC_TYPES } from '@/data/mockPdfs';

interface DocTypeFilterProps {
  selectedTypes: string[];
  onToggleType: (type: string) => void;
  compact?: boolean;
}

export default function DocTypeFilter({ selectedTypes, onToggleType, compact }: DocTypeFilterProps) {
  const allSelected = DOC_TYPES.every((t) => selectedTypes.includes(t.value));

  const handleToggleAll = () => {
    if (allSelected) {
      DOC_TYPES.forEach((t) => {
        if (selectedTypes.includes(t.value)) onToggleType(t.value);
      });
    } else {
      DOC_TYPES.forEach((t) => {
        if (!selectedTypes.includes(t.value)) onToggleType(t.value);
      });
    }
  };

  // Compact mode: inline chips
  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {DOC_TYPES.map((docType) => {
          const isSelected = selectedTypes.includes(docType.value);
          return (
            <button
              key={docType.id}
              onClick={() => onToggleType(docType.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150
                ${isSelected
                  ? 'border-primary/50 bg-primary/15 text-foreground'
                  : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-border/80'
                }`}
            >
              {isSelected && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="shrink-0">
                  <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {docType.label}
            </button>
          );
        })}
        <button
          onClick={handleToggleAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
        >
          {allSelected ? 'إلغاء الكل' : 'الكل'}
        </button>
      </div>
    );
  }

  // Full mode (original)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">نوع الوثيقة</span>
          <span className="text-xs text-muted-foreground">/ Type</span>
        </div>
        <button
          onClick={handleToggleAll}
          className="text-xs text-secondary hover:text-secondary/80 transition-colors"
        >
          {allSelected ? 'إلغاء الكل' : 'تحديد الكل'}
        </button>
      </div>

      <div className="space-y-2">
        {DOC_TYPES.map((docType) => {
          const isSelected = selectedTypes.includes(docType.value);
          return (
            <label
              key={docType.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-150
                ${isSelected
                  ? 'border-border/80 bg-muted/40' :'border-border/40 bg-muted/10 opacity-60 hover:opacity-80'
                }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleType(docType.value)}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                  isSelected ? 'border-primary bg-primary' : 'border-border bg-transparent'
                }`}
              >
                {isSelected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground block">{docType.label}</span>
                <span className="text-xs text-muted-foreground">{docType.labelFr}</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${docType.color}`}>
                {docType.label === 'دروس' ? '3,241' : docType.label === 'تمارين' ? '2,187' : docType.label === 'اختبارات' ? '1,934' : '1,640'}
              </span>
            </label>
          );
        })}
      </div>

      {/* Quick filter chips */}
      <div className="pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground block mb-2">فلاتر سريعة</span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'بكالوريا فقط', types: ['اختبارات', 'تصحيحات'] },
            { label: 'دراسة', types: ['دروس', 'تمارين'] },
          ].map((preset) => (
            <button
              key={`preset-${preset.label}`}
              onClick={() => {
                DOC_TYPES.forEach((t) => {
                  const shouldBeSelected = preset.types.includes(t.value);
                  const isCurrentlySelected = selectedTypes.includes(t.value);
                  if (shouldBeSelected !== isCurrentlySelected) {
                    onToggleType(t.value);
                  }
                });
              }}
              className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-border/80 transition-all duration-150"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}