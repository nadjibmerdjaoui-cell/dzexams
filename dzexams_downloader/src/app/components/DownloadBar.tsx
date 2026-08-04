'use client';

import React, { useEffect, useState } from 'react';
import { Download, FolderOpen, Package, X } from 'lucide-react';
import { PdfFile } from '@/data/mockPdfs';

interface DownloadBarProps {
  selectedFiles: PdfFile[];
  selectedYear: string | null;
  selectedSubjects: string[];
  onClearSelection: () => void;
  isDownloading: boolean;
  downloadProgress: number;
  onDownloadSelected: () => void;
  onDownloadAll: () => void;
}

export default function DownloadBar({
  selectedFiles,
  selectedYear,
  selectedSubjects,
  onClearSelection,
  isDownloading,
  downloadProgress,
  onDownloadSelected,
  onDownloadAll,
}: DownloadBarProps) {
  const totalBytes = selectedFiles.reduce((sum, f) => sum + f.sizeBytes, 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);

  const folderPreview =
    selectedYear && selectedSubjects.length === 1
      ? `${selectedYear} > ${selectedSubjects[0]} > [نوع]`
      : selectedYear
        ? `${selectedYear} > [مادة] > [نوع]`
        : 'السنة > المادة > النوع';

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm transition-all duration-300 ${
        selectedFiles.length > 0 || isDownloading ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {/* Progress bar */}
      {isDownloading && (
        <div className="h-1 bg-border w-full">
          <div
            className="h-full progress-bar-animated transition-all duration-300"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto px-6 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Selection info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary font-tabular">{selectedFiles.length}</span>
              </div>
              <span className="text-sm text-foreground font-medium">
                ملف محدد / fichier{selectedFiles.length !== 1 ? 's' : ''} sélectionné{selectedFiles.length !== 1 ? 's' : ''}
              </span>
            </div>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm font-tabular text-muted-foreground">
              {totalMB} MB
            </span>
          </div>

          {/* Folder structure preview */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
            <FolderOpen size={13} className="text-secondary shrink-0" />
            <span className="text-xs text-muted-foreground" dir="rtl">{folderPreview}</span>
          </div>

          {/* Organization note */}
          <span className="text-xs text-muted-foreground hidden lg:block">
            التنظيم: السنة &gt; المادة &gt; النوع
          </span>

          {/* Progress info */}
          {isDownloading && (
            <div className="flex items-center gap-2">
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="3" strokeDasharray="30 70" />
              </svg>
              <span className="text-sm text-primary font-tabular">{downloadProgress}%</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mr-auto">
            <button
              onClick={onClearSelection}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
            >
              <X size={12} />
              إلغاء التحديد
            </button>

            <button
              onClick={onDownloadAll}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted/50 text-sm text-foreground hover:bg-muted transition-all duration-150 disabled:opacity-50"
            >
              <Package size={14} />
              <span>تحميل الكل</span>
            </button>

            <button
              onClick={onDownloadSelected}
              disabled={isDownloading || selectedFiles.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                  </svg>
                  <span>جاري التحميل...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>تحميل المحدد (ZIP)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}