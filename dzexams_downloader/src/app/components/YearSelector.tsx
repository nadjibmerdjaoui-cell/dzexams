'use client';

import React from 'react';
import { BookOpen, TrendingUp } from 'lucide-react';

interface YearSelectorProps {
  selectedYear: string | null;
  onSelectYear: (year: string | null) => void;
}

const SECONDARY_YEARS = [
  {
    id: 'year-1as', code: '1AS',
    labelAr: 'السنة الأولى ثانوي', labelFr: '1ère Année Secondaire',
    count: 1921,
    color: 'from-blue-500/20 to-blue-600/10', borderColor: 'border-blue-500/40',
    activeBorder: 'border-blue-400', dot: 'bg-blue-400', badge: 'bg-blue-500/20 text-blue-400',
  },
  {
    id: 'year-2as', code: '2AS',
    labelAr: 'السنة الثانية ثانوي', labelFr: '2ème Année Secondaire',
    count: 2824,
    color: 'from-secondary/20 to-secondary/10', borderColor: 'border-secondary/40',
    activeBorder: 'border-secondary', dot: 'bg-secondary', badge: 'bg-secondary/20 text-secondary',
  },
  {
    id: 'year-3as', code: '3AS',
    labelAr: 'السنة الثالثة ثانوي (البكالوريا)', labelFr: '3ème Année — Bac',
    count: 4257,
    color: 'from-primary/20 to-primary/10', borderColor: 'border-primary/40',
    activeBorder: 'border-primary', dot: 'bg-primary', badge: 'bg-primary/20 text-primary',
  },
];

const MIDDLE_YEARS = [
  {
    id: 'year-1am', code: '1AM',
    labelAr: 'السنة الأولى متوسط', labelFr: '1ère Année Moyenne',
    count: 3527,
    color: 'from-emerald-500/20 to-emerald-600/10', borderColor: 'border-emerald-500/40',
    activeBorder: 'border-emerald-400', dot: 'bg-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400',
  },
  {
    id: 'year-2am', code: '2AM',
    labelAr: 'السنة الثانية متوسط', labelFr: '2ème Année Moyenne',
    count: 3382,
    color: 'from-teal-500/20 to-teal-600/10', borderColor: 'border-teal-500/40',
    activeBorder: 'border-teal-400', dot: 'bg-teal-400', badge: 'bg-teal-500/20 text-teal-400',
  },
  {
    id: 'year-3am', code: '3AM',
    labelAr: 'السنة الثالثة متوسط', labelFr: '3ème Année Moyenne',
    count: 3531,
    color: 'from-cyan-500/20 to-cyan-600/10', borderColor: 'border-cyan-500/40',
    activeBorder: 'border-cyan-400', dot: 'bg-cyan-400', badge: 'bg-cyan-500/20 text-cyan-400',
  },
  {
    id: 'year-4am', code: '4AM',
    labelAr: 'السنة الرابعة متوسط (شهادة التعليم المتوسط)', labelFr: '4ème Année — BEM',
    count: 5739,
    color: 'from-sky-500/20 to-sky-600/10', borderColor: 'border-sky-500/40',
    activeBorder: 'border-sky-400', dot: 'bg-sky-400', badge: 'bg-sky-500/20 text-sky-400',
  },
];

const PRIMARY_YEARS = [
  {
    id: 'year-1ap', code: '1AP',
    labelAr: 'السنة الأولى ابتدائي', labelFr: '1ère Année Primaire',
    count: 1547,
    color: 'from-orange-500/20 to-orange-600/10', borderColor: 'border-orange-500/40',
    activeBorder: 'border-orange-400', dot: 'bg-orange-400', badge: 'bg-orange-500/20 text-orange-400',
  },
  {
    id: 'year-2ap', code: '2AP',
    labelAr: 'السنة الثانية ابتدائي', labelFr: '2ème Année Primaire',
    count: 1623,
    color: 'from-amber-500/20 to-amber-600/10', borderColor: 'border-amber-500/40',
    activeBorder: 'border-amber-400', dot: 'bg-amber-400', badge: 'bg-amber-500/20 text-amber-400',
  },
  {
    id: 'year-3ap', code: '3AP',
    labelAr: 'السنة الثالثة ابتدائي', labelFr: '3ème Année Primaire',
    count: 1891,
    color: 'from-yellow-500/20 to-yellow-600/10', borderColor: 'border-yellow-500/40',
    activeBorder: 'border-yellow-400', dot: 'bg-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400',
  },
  {
    id: 'year-4ap', code: '4AP',
    labelAr: 'السنة الرابعة ابتدائي', labelFr: '4ème Année Primaire',
    count: 2104,
    color: 'from-lime-500/20 to-lime-600/10', borderColor: 'border-lime-500/40',
    activeBorder: 'border-lime-400', dot: 'bg-lime-400', badge: 'bg-lime-500/20 text-lime-400',
  },
  {
    id: 'year-5ap', code: '5AP',
    labelAr: 'السنة الخامسة ابتدائي', labelFr: '5ème Année Primaire',
    count: 2356,
    color: 'from-green-500/20 to-green-600/10', borderColor: 'border-green-500/40',
    activeBorder: 'border-green-400', dot: 'bg-green-400', badge: 'bg-green-500/20 text-green-400',
  },
];

const LEVEL_GROUPS = [
  { label: 'ثانوي', labelFr: 'Secondaire', years: SECONDARY_YEARS, icon: '🎓' },
  { label: 'متوسط', labelFr: 'Moyen',      years: MIDDLE_YEARS,    icon: '📚' },
  { label: 'ابتدائي', labelFr: 'Primaire', years: PRIMARY_YEARS,   icon: '🏫' },
];

export default function YearSelector({ selectedYear, onSelectYear }: YearSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={16} className="text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">السنة الدراسية</span>
        <span className="text-xs text-muted-foreground">/</span>
        <span className="text-xs text-muted-foreground">Année Scolaire</span>
      </div>

      {/* All years option */}
      <button
        onClick={() => onSelectYear(null)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-150 text-right
          ${selectedYear === null
            ? 'border-foreground/30 bg-foreground/5 text-foreground'
            : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50'
          }`}
      >
        <TrendingUp size={16} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium block">الكل</span>
          <span className="text-xs text-muted-foreground">Toutes les années</span>
        </div>
        <span className="text-xs font-tabular text-muted-foreground shrink-0">+25,000</span>
      </button>

      {/* Level groups */}
      {LEVEL_GROUPS.map((group) => (
        <div key={group.label} className="space-y-1">
          <div className="flex items-center gap-1.5 px-1 pt-1">
            <span className="text-sm">{group.icon}</span>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{group.label}</span>
            <span className="text-xs text-muted-foreground">/ {group.labelFr}</span>
          </div>
          {group.years.map((year) => {
            const isSelected = selectedYear === year.code;
            return (
              <button
                key={year.id}
                onClick={() => onSelectYear(year.code)}
                className={`w-full flex flex-col gap-1.5 px-3 py-2.5 rounded-lg border transition-all duration-150 text-right
                  ${isSelected
                    ? `${year.activeBorder} bg-gradient-to-br ${year.color} card-glow-green`
                    : `border-border bg-muted/20 hover:bg-muted/40 hover:border-border/80`
                  }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${year.dot}`} />
                  <span className={`text-sm font-bold font-tabular ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {year.code}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-tabular font-medium shrink-0 ml-auto ${year.badge}`}>
                    {year.count.toLocaleString()}
                  </span>
                </div>
                <div className="pr-4">
                  <span className={`text-xs font-medium block leading-tight ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {year.labelAr}
                  </span>
                  <span className="text-xs text-muted-foreground block mt-0.5">{year.labelFr}</span>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}