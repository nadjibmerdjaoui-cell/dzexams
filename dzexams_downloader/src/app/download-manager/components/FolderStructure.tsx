'use client';

import React, { useEffect, useState } from 'react';
import { Folder, FolderOpen, FileText, RefreshCw } from 'lucide-react';

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  count?: number;
  children?: TreeNode[];
}

interface CatalogRow {
  year: string;
  subject: string;
  doc_type: string;
}

function buildTree(rows: CatalogRow[]): TreeNode {
  const byYear: Record<string, Record<string, Record<string, number>>> = {};

  for (const r of rows) {
    if (!byYear[r.year]) byYear[r.year] = {};
    if (!byYear[r.year][r.subject]) byYear[r.year][r.subject] = {};
    byYear[r.year][r.subject][r.doc_type] = (byYear[r.year][r.subject][r.doc_type] || 0) + 1;
  }

  const YEAR_LABELS: Record<string, string> = {
    '1AS': '1AS — السنة الأولى ثانوي',
    '2AS': '2AS — السنة الثانية ثانوي',
    '3AS': '3AS — البكالوريا',
  };

  const children: TreeNode[] = Object.keys(byYear).sort().map((year) => {
    const subjects = byYear[year];
    const yearCount = Object.values(subjects).reduce(
      (sum, types) => sum + Object.values(types).reduce((s, c) => s + c, 0), 0
    );
    return {
      id: `y-${year}`,
      name: YEAR_LABELS[year] || year,
      type: 'folder',
      count: yearCount,
      children: Object.keys(subjects).sort().map((subject) => {
        const types = subjects[subject];
        const subjectCount = Object.values(types).reduce((s, c) => s + c, 0);
        return {
          id: `y-${year}-s-${subject}`,
          name: subject,
          type: 'folder',
          count: subjectCount,
          children: Object.keys(types).sort().map((docType) => ({
            id: `y-${year}-s-${subject}-t-${docType}`,
            name: `${docType} (${types[docType]} ملف)`,
            type: 'folder',
            count: types[docType],
          })),
        };
      }),
    };
  });

  return {
    id: 'root',
    name: 'الملفات المحفوظة',
    type: 'folder',
    count: rows.length,
    children,
  };
}

function TreeNodeItem({ node, depth }: { node: TreeNode; depth: number }) {
  return (
    <div className="select-none">
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors cursor-default"
        style={{ paddingRight: `${depth * 16 + 8}px` }}
      >
        {node.type === 'folder' ? (
          depth === 0 ? (
            <FolderOpen size={14} className="text-secondary shrink-0" />
          ) : (
            <Folder size={14} className="text-amber-400/70 shrink-0" />
          )
        ) : (
          <FileText size={14} className="text-muted-foreground shrink-0" />
        )}
        <span className="text-sm text-foreground truncate" dir="rtl">{node.name}</span>
        {node.count !== undefined && (
          <span className="text-xs font-tabular text-muted-foreground mr-auto shrink-0">
            {node.count}
          </span>
        )}
      </div>
      {node.children && node.children.map((child) => (
        <TreeNodeItem key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function FolderStructure() {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/catalog?limit=1000');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const files: any[] = data.files || [];
      setTotal(files.length);
      if (files.length > 0) {
        const rows: CatalogRow[] = files.map((f: any) => ({
          year: f.year,
          subject: f.subject,
          doc_type: f.type,
        }));
        setTree(buildTree(rows));
      } else {
        setTree(null);
      }
      setLastUpdated(new Date().toLocaleDateString('ar-DZ'));
    } catch {
      setTree(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden card-glow">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FolderOpen size={16} className="text-secondary" />
          <span className="text-sm font-semibold text-foreground">هيكل المجلدات</span>
          <span className="text-xs text-muted-foreground">/ Structure des dossiers</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">السنة &gt; المادة &gt; النوع</span>
          <button
            onClick={load}
            disabled={loading}
            className="p-1 rounded hover:bg-muted/40 transition-colors"
            title="تحديث"
          >
            <RefreshCw size={12} className={`text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-3 overflow-y-auto max-h-[320px] scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-2">
            <RefreshCw size={12} className="animate-spin" /> جاري التحميل...
          </div>
        ) : tree ? (
          <TreeNodeItem node={tree} depth={0} />
        ) : (
          <div className="text-center py-8 text-muted-foreground text-xs">
            لا توجد ملفات محفوظة بعد — استخدم التحميل الجماعي أعلاه
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{total} ملف محفوظ على المنصة</span>
          {lastUpdated && <span>آخر تحديث: {lastUpdated}</span>}
        </div>
      </div>
    </div>
  );
}