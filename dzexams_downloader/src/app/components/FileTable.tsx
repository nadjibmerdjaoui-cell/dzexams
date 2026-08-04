'use client';

import React, { useState } from 'react';
import { FileText, Download, ChevronUp, ChevronDown, Search, SortAsc } from 'lucide-react';
import { PdfFile, DOC_TYPES } from '@/data/mockPdfs';


interface FileTableProps {
  files: PdfFile[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  downloadingId: string | null;
  onDownloadSingle: (file: PdfFile) => void;
}

type SortField = 'name' | 'subject' | 'year' | 'type' | 'size';
type SortDir = 'asc' | 'desc';

export default function FileTable({
  files,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  downloadingId,
  onDownloadSingle,
}: FileTableProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [search, setSearch] = useState('');

  const getTypeStyle = (type: string) => {
    const found = DOC_TYPES.find((d) => d.value === type);
    return found?.color ?? 'bg-muted text-muted-foreground border-border';
  };

  const getYearStyle = (year: string) => {
    if (year === '1AS') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (year === '2AS') return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
    return 'bg-green-500/20 text-green-400 border-green-500/30';
  };

  const filtered = files.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.subject.toLowerCase().includes(search.toLowerCase()) ||
      f.subjectFr.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let av: string | number = a[sortField];
    let bv: string | number = b[sortField];
    if (sortField === 'size') {
      av = a.sizeBytes;
      bv = b.sizeBytes;
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const allVisibleSelected =
    sorted.length > 0 && sorted.every((f) => selectedIds.includes(f.id));
  const someSelected = sorted.some((f) => selectedIds.includes(f.id));

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      onSelectAll([]);
    } else {
      onSelectAll(sorted.map((f) => f.id));
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <SortAsc size={12} className="text-muted-foreground/40" />;
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="text-primary" />
    ) : (
      <ChevronDown size={12} className="text-primary" />
    );
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Search bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/20">
        <Search size={16} className="text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="البحث في الملفات... / Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          dir="rtl"
        />
        <span className="text-xs font-tabular text-muted-foreground shrink-0">
          {sorted.length} ملف / {sorted.length} fichier{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-10 px-4 py-3">
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all duration-150 ${
                    allVisibleSelected
                      ? 'border-primary bg-primary'
                      : someSelected
                        ? 'border-primary bg-primary/30' :'border-border bg-transparent'
                  }`}
                  onClick={handleSelectAll}
                >
                  {(allVisibleSelected || someSelected) && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d={someSelected && !allVisibleSelected ? 'M2 4H8' : 'M1 4L3.5 6.5L9 1'}
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </th>
              {(
                [
                  { label: 'اسم الملف', labelFr: 'Nom du fichier', field: 'name' as SortField },
                  { label: 'المادة', labelFr: 'Matière', field: 'subject' as SortField },
                  { label: 'السنة', labelFr: 'Année', field: 'year' as SortField },
                  { label: 'النوع', labelFr: 'Type', field: 'type' as SortField },
                  { label: 'الحجم', labelFr: 'Taille', field: 'size' as SortField },
                ]
              ).map((col) => (
                <th
                  key={`col-${col.field}`}
                  className="px-3 py-3 text-right cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort(col.field)}
                >
                  <div className="flex items-center gap-1.5 justify-end">
                    <SortIcon field={col.field} />
                    <div className="text-right">
                      <span className="text-xs font-medium text-foreground block">{col.label}</span>
                      <span className="text-xs text-muted-foreground block">{col.labelFr}</span>
                    </div>
                  </div>
                </th>
              ))}
              <th className="px-3 py-3 text-right">
                <span className="text-xs font-medium text-foreground">تحميل</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <FileText size={32} className="text-muted-foreground/40" />
                    <span className="text-sm text-muted-foreground">
                      لا توجد ملفات تطابق الفلاتر المحددة
                    </span>
                    <span className="text-xs text-muted-foreground/60">
                      Aucun fichier ne correspond aux filtres sélectionnés
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((file, idx) => {
                const isSelected = selectedIds.includes(file.id);
                const isDownloading = downloadingId === file.id;
                return (
                  <tr
                    key={file.id}
                    className={`border-b border-border/50 transition-colors duration-100 group
                      ${isSelected ? 'bg-primary/5' : idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'}
                      hover:bg-muted/30`}
                  >
                    <td className="px-4 py-3">
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all duration-150 ${
                          isSelected ? 'border-primary bg-primary' : 'border-border bg-transparent group-hover:border-primary/50'
                        }`}
                        onClick={() => onToggleSelect(file.id)}
                      >
                        {isSelected && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="min-w-0 text-right">
                          <span className="text-sm text-foreground font-medium block truncate max-w-[200px]" title={file.name} dir="rtl">
                            {file.name}
                          </span>
                          <span className="text-xs text-muted-foreground">{file.addedDate}</span>
                        </div>
                        <FileText size={14} className="text-muted-foreground shrink-0" />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-foreground">{file.subject}</span>
                      <span className="text-xs text-muted-foreground block">{file.subjectFr}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border font-tabular ${getYearStyle(file.year)}`}>
                        {file.year}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getTypeStyle(file.type)}`}>
                        {file.type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm font-tabular text-muted-foreground">{file.size}</span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => onDownloadSingle(file)}
                        disabled={isDownloading}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                          ${isDownloading
                            ? 'bg-primary/20 text-primary cursor-wait' :'bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary border border-border hover:border-primary/40'
                          }`}
                      >
                        {isDownloading ? (
                          <>
                            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                            </svg>
                            <span>جاري...</span>
                          </>
                        ) : (
                          <>
                            <Download size={12} />
                            <span>تحميل</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}