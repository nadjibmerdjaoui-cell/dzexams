'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { SECONDARY_SUBJECTS, MIDDLE_SUBJECTS, PRIMARY_SUBJECTS, ALL_PDF_FILES } from '@/data/mockPdfs';

interface SubjectSelectorProps {
  selectedSubjects: string[];
  onToggleSubject: (subject: string) => void;
  selectedYear: string | null;
}

function getSubjectsForYear(year: string | null) {
  if (!year) return SECONDARY_SUBJECTS;
  if (year.endsWith('AM')) return MIDDLE_SUBJECTS;
  if (year.endsWith('AP')) return PRIMARY_SUBJECTS;
  return SECONDARY_SUBJECTS;
}

export default function SubjectSelector({
  selectedSubjects,
  onToggleSubject,
  selectedYear,
}: SubjectSelectorProps) {
  const SUBJECTS = getSubjectsForYear(selectedYear);

  const getCount = (subjectName: string) => {
    return ALL_PDF_FILES.filter(
      (f) =>
        f.subject === subjectName &&
        (selectedYear === null || f.year === selectedYear)
    ).length;
  };

  const allSelected = SUBJECTS.every((s) => selectedSubjects.includes(s.name));

  const handleToggleAll = () => {
    if (allSelected) {
      SUBJECTS.forEach((s) => {
        if (selectedSubjects.includes(s.name)) onToggleSubject(s.name);
      });
    } else {
      SUBJECTS.forEach((s) => {
        if (!selectedSubjects.includes(s.name)) onToggleSubject(s.name);
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">المادة</span>
          <span className="text-xs text-muted-foreground">/ Matière</span>
        </div>
        <button
          onClick={handleToggleAll}
          className="text-xs text-secondary hover:text-secondary/80 transition-colors"
        >
          {allSelected ? 'إلغاء الكل' : 'تحديد الكل'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {SUBJECTS.map((subject) => {
          const isSelected = selectedSubjects.includes(subject.name);
          const count = getCount(subject.name);
          return (
            <button
              key={subject.id}
              onClick={() => onToggleSubject(subject.name)}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all duration-150 text-right
                ${
                  isSelected
                    ? 'border-primary/40 bg-primary/8 text-foreground'
                    : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              style={{ background: isSelected ? 'rgba(34,197,94,0.08)' : undefined }}
            >
              <span className="text-base shrink-0">{subject.icon}</span>
              <div className="flex-1 min-w-0 text-right">
                <span className="text-xs font-medium block truncate">{subject.name}</span>
                <span className="text-xs text-muted-foreground block truncate">{subject.nameFr}</span>
              </div>
              {count > 0 && (
                <span
                  className={`text-xs font-tabular shrink-0 px-1 py-0.5 rounded ${
                    isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}