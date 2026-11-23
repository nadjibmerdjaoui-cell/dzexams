import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createClient } from '@supabase/supabase-js';

// ── Supabase admin client (service role) ──────────────────────────────────────
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Subject slugs per level ───────────────────────────────────────────────────

const SECONDARY_SUBJECT_SLUGS: Record<string, string> = {
  'رياضيات':           'mathematiques',
  'الفيزياء':          'physique',
  'اللغة العربية':     'arabe',
  'الفرنسية':          'francais',
  'الإنجليزية':        'anglais',
  'العلوم الطبيعية':   'sciences-naturelles',
  'التاريخ والجغرافيا':'histoire-geographie',
  'التربية الإسلامية': 'education-islamique',
  'الإعلام الآلي':     'informatique',
  'التكنولوجيا':       'technologie',
  'الرسم':             'dessin',
  'تامزيغت':           'tamazight',
};

const MIDDLE_SUBJECT_SLUGS: Record<string, string> = {
  'رياضيات':              'mathematiques',
  'العلوم الفيزيائية':    'physique',
  'اللغة العربية':        'arabe',
  'اللغة الفرنسية':       'francais',
  'اللغة الإنجليزية':     'anglais',
  'التاريخ والجغرافيا':   'histoire-geographie',
  'علوم الطبيعة والحياة': 'svt',
  'التربية الإسلامية':    'tarbia-islamia',
  'التربية المدنية':      'tarbia-madania',
  'اللغة الأمازيغية':     'tamazight',
  'الإعلام الآلي':        'informatique',
  'التربية الفنية':       'dessin',
  'التربية الموسيقية':    'musique',
};

const PRIMARY_SUBJECT_SLUGS: Record<string, string> = {
  'رياضيات':                     'mathematiques',
  'اللغة العربية':               'arabe',
  'اللغة الفرنسية':              'francais',
  'اللغة الإنجليزية':            'anglais',
  'التربية الإسلامية':           'tarbia-islamia',
  'التربية المدنية':             'tarbia-madania',
  'اللغة الأمازيغية':            'tamazight',
  'التربية العلمية والتكنولوجية':'technologie',
  'التربية الفنية':              'dessin',
  'التربية الموسيقية':           'musique',
};

// ── Year slugs ────────────────────────────────────────────────────────────────
const YEAR_SLUGS: Record<string, string> = {
  '1AS': '1as', '2AS': '2as', '3AS': '3as',
  '1AM': '1am', '2AM': '2am', '3AM': '3am', '4AM': '4am',
  '1AP': '1ap', '2AP': '2ap', '3AP': '3ap', '4AP': '4ap', '5AP': '5ap',
};

// ── French name map ───────────────────────────────────────────────────────────
const SUBJECT_FR: Record<string, string> = {
  'رياضيات':                     'Mathématiques',
  'الفيزياء':                    'Physique',
  'اللغة العربية':               'Langue Arabe',
  'الفرنسية':                    'Français',
  'الإنجليزية':                  'Anglais',
  'العلوم الطبيعية':             'Sciences Nat.',
  'التاريخ والجغرافيا':          'Histoire & Géo',
  'التربية الإسلامية':           'Éd. Islamique',
  'الإعلام الآلي':               'Informatique',
  'التكنولوجيا':                 'Technologie',
  'الرسم':                       'Dessin',
  'تامزيغت':                     'Tamazight',
  'العلوم الفيزيائية':           'Physique',
  'اللغة الفرنسية':              'Français',
  'اللغة الإنجليزية':            'Anglais',
  'علوم الطبيعة والحياة':        'SVT',
  'التربية المدنية':             'Éd. Civique',
  'اللغة الأمازيغية':            'Tamazight',
  'التربية الفنية':              'Arts Plastiques',
  'التربية الموسيقية':           'Musique',
  'التربية العلمية والتكنولوجية':'Sciences & Tech',
};

// ── All subjects per level (for bulk scrape defaults) ─────────────────────────
const SECONDARY_SUBJECTS = Object.keys(SECONDARY_SUBJECT_SLUGS);
const MIDDLE_SUBJECTS    = Object.keys(MIDDLE_SUBJECT_SLUGS);
const PRIMARY_SUBJECTS   = Object.keys(PRIMARY_SUBJECT_SLUGS);

const SECONDARY_YEARS = ['1AS', '2AS', '3AS'];
const MIDDLE_YEARS    = ['1AM', '2AM', '3AM', '4AM'];
const PRIMARY_YEARS   = ['1AP', '2AP', '3AP', '4AP', '5AP'];

// Detect level from year code
function detectLevel(year: string): 'secondary' | 'middle' | 'primary' {
  if (year.endsWith('AS')) return 'secondary';
  if (year.endsWith('AM')) return 'middle';
  return 'primary';
}

function getSubjectSlugs(year: string): Record<string, string> {
  const level = detectLevel(year);
  if (level === 'middle') return MIDDLE_SUBJECT_SLUGS;
  if (level === 'primary') return PRIMARY_SUBJECT_SLUGS;
  return SECONDARY_SUBJECT_SLUGS;
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ar,fr;q=0.9,en;q=0.8',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 600): Promise<T> {
  let last: unknown;
  for (let i = 0; i < retries; i++) {
    try { return await fn(); } catch (e) {
      last = e;
      if (i < retries - 1) await sleep(delayMs * Math.pow(2, i));
    }
  }
  throw last;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function classifyType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('تصحيح') || t.includes('حل') || t.includes('correction') || t.includes('corrigé')) return 'تصحيحات';
  if (t.includes('اختبار') || t.includes('فرض') || t.includes('امتحان') || t.includes('devoir') || t.includes('examen')) return 'اختبارات';
  if (t.includes('تمرين') || t.includes('تطبيق') || t.includes('exercice') || t.includes('activité')) return 'تمارين';
  return 'دروس';
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Crawl listing page ────────────────────────────────────────────────────────
async function fetchDocLinks(year: string, subject: string) {
  const yearSlug = YEAR_SLUGS[year];
  const subjectSlugs = getSubjectSlugs(year);
  const subjectSlug = subjectSlugs[subject];
  if (!yearSlug || !subjectSlug) return [];

  const url = `https://www.dzexams.com/ar/${yearSlug}/${subjectSlug}`;
  try {
    const res = await withRetry(() => fetch(url, { headers: FETCH_HEADERS }));
    if (!res.ok) return [];
    const html = await res.text();
    const regex = /href="\/(?:ar|fr)\/documents\/([A-Za-z0-9+/=_-]+)"[^>]*>([^<]+)</g;
    const results: { title: string; docId: string }[] = [];
    const seen = new Set<string>();
    let m;
    while ((m = regex.exec(html)) !== null) {
      const docId = m[1]; const title = m[2].trim();
      if (docId && title && !seen.has(docId)) { seen.add(docId); results.push({ title, docId }); }
    }
    return results;
  } catch { return []; }
}

// ── Extract PDF URL from document page ───────────────────────────────────────
async function extractPdfUrl(docId: string): Promise<string | null> {
  const pageUrl = `https://www.dzexams.com/ar/documents/${docId}`;
  try {
    const res = await withRetry(() => fetch(pageUrl, { headers: FETCH_HEADERS }), 3, 600);
    if (!res.ok) return null;
    const html = await res.text();

    const patterns = [
      /href="(https?:\/\/[^"]*\.pdf[^"]*)"/i,
      /["'](https?:\/\/(?:www\.)?dzexams\.com\/uploads?\/[^"']+\.pdf)["']/i,
      /data-(?:src|url|file)="([^"]*\.pdf[^"]*)"/i,
      /["']((?:https?:\/\/)?(?:www\.)?dzexams\.com[^"']*\.pdf)["']/i,
      /(?:src|data)="([^"]*\.pdf[^"]*)"/i,
    ];

    for (const p of patterns) {
      let m = html.match(p);
      if (m) {
        const src = m[1];
        return src.startsWith('http') ? src : `https://www.dzexams.com${src}`;
      }
    }
    return null;
  } catch { return null; }
}

// ── Download PDF bytes ────────────────────────────────────────────────────────
async function downloadPdf(pdfUrl: string): Promise<ArrayBuffer | null> {
  try {
    const res = await withRetry(() =>
      fetch(pdfUrl, {
        headers: {
          ...FETCH_HEADERS,
          Referer: 'https://www.dzexams.com/',
          Accept: 'application/pdf,*/*',
        },
      }), 3, 800
    );
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('pdf') && !ct.includes('octet-stream')) return null;
    return await res.arrayBuffer();
  } catch { return null; }
}

// ── Upload to Supabase storage + upsert catalog row ──────────────────────────
async function storeFile(
  supabase: ReturnType<typeof createClient>,
  params: {
    buffer: ArrayBuffer;
    year: string;
    subject: string;
    docType: string;
    fileName: string;
    subjectFr: string;
  }
): Promise<{ storagePath: string; publicUrl: string } | null> {
  const { buffer, year, subject, docType, fileName, subjectFr } = params;
  const safeName = fileName.replace(/[^\w\u0600-\u06FF._-]/g, '_').replace(/__+/g, '_');
  const storagePath = `${year}/${subject}/${docType}/${safeName}`;

  // Upload (upsert)
  const { error: upErr } = await supabase.storage
    .from('exam-pdfs')
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (upErr) {
    console.error('Storage upload error:', upErr.message);
    return null;
  }

  const { data: urlData } = supabase.storage.from('exam-pdfs').getPublicUrl(storagePath);
  return { storagePath, publicUrl: urlData.publicUrl };
}

// ── Main POST handler ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  let body: {
    years?: string[];
    subjects?: string[];
    limitPerCombo?: number;
    levels?: ('secondary' | 'middle' | 'primary')[];
  } = {};
  try { body = await request.json(); } catch { /* use defaults */ }

  // If levels specified, build years/subjects from those levels
  let years: string[];
  let subjects: string[];

  if (body.levels && body.levels.length > 0) {
    years = [];
    subjects = [];
    if (body.levels.includes('secondary')) {
      years.push(...SECONDARY_YEARS);
      subjects.push(...SECONDARY_SUBJECTS);
    }
    if (body.levels.includes('middle')) {
      years.push(...MIDDLE_YEARS);
      subjects.push(...MIDDLE_SUBJECTS);
    }
    if (body.levels.includes('primary')) {
      years.push(...PRIMARY_YEARS);
      subjects.push(...PRIMARY_SUBJECTS);
    }
    // Remove duplicates
    years = [...new Set(years)];
    subjects = [...new Set(subjects)];
  } else {
    years    = body.years    ?? [...SECONDARY_YEARS, ...MIDDLE_YEARS, ...PRIMARY_YEARS];
    subjects = body.subjects ?? [...new Set([...SECONDARY_SUBJECTS, ...MIDDLE_SUBJECTS, ...PRIMARY_SUBJECTS])];
  }

  const limitPerCombo = Math.min(body.limitPerCombo ?? 20, 50);

  let supabase: ReturnType<typeof createClient>;
  try { supabase = getAdminClient(); }
  catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const stats = { stored: 0, skipped: 0, failed: 0, total: 0 };
  const errors: string[] = [];

  for (const year of years) {
    const subjectSlugs = getSubjectSlugs(year);
    // Only process subjects valid for this year's level
    const validSubjects = subjects.filter((s) => subjectSlugs[s]);

    for (const subject of validSubjects) {
      // Throttle between combos
      await sleep(300);

      const docs = await fetchDocLinks(year, subject);
      const batch = docs.slice(0, limitPerCombo);
      stats.total += batch.length;

      // Process in chunks of 3 to be polite
      for (let i = 0; i < batch.length; i += 3) {
        const chunk = batch.slice(i, i + 3);
        await Promise.allSettled(
          chunk.map(async ({ title, docId }) => {
            const docType = classifyType(title);
            const safeName = title.replace(/\s+/g, '_').replace(/[^\w\u0600-\u06FF_.-]/g, '') + '.pdf';
            const storagePath = `${year}/${subject}/${docType}/${safeName}`;

            // Check if already stored
            const { data: existing } = await supabase
              .from('pdf_catalog')
              .select('id')
              .eq('storage_path', storagePath)
              .maybeSingle();

            if (existing) { stats.skipped++; return; }

            // Extract PDF URL
            const pdfUrl = await extractPdfUrl(docId);
            if (!pdfUrl) { stats.failed++; errors.push(`No PDF URL: ${title}`); return; }

            // Download
            const buffer = await downloadPdf(pdfUrl);
            if (!buffer) { stats.failed++; errors.push(`Download failed: ${title}`); return; }

            // Store
            const stored = await storeFile(supabase, {
              buffer,
              year,
              subject,
              docType,
              fileName: safeName,
              subjectFr: SUBJECT_FR[subject] || subject,
            });
            if (!stored) { stats.failed++; errors.push(`Storage failed: ${title}`); return; }

            // Upsert catalog
            const { error: catErr } = await supabase.from('pdf_catalog').upsert({
              storage_path: stored.storagePath,
              public_url:   stored.publicUrl,
              name:         title,
              subject,
              subject_fr:   SUBJECT_FR[subject] || subject,
              year,
              doc_type:     docType,
              size_bytes:   buffer.byteLength,
              size_label:   formatSize(buffer.byteLength),
              source_url:   '',  // intentionally blank — no external references
              added_date:   new Date().toISOString().split('T')[0],
            }, { onConflict: 'storage_path' });

            if (catErr) { stats.failed++; errors.push(`Catalog error: ${catErr.message}`); return; }
            stats.stored++;
          })
        );
        // Small pause between chunks
        await sleep(200);
      }
    }
  }

  return NextResponse.json({
    success: true,
    stats,
    errors: errors.slice(0, 20),
  });
}

// ── GET: return catalog stats ─────────────────────────────────────────────────
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    let supabase = getAdminClient();
    const { count } = await supabase
      .from('pdf_catalog')
      .select('id', { count: 'exact', head: true });

    const { data: byYear } = await supabase
      .from('pdf_catalog')
      .select('year')
      .order('year');

    const yearCounts: Record<string, number> = {};
    (byYear || []).forEach((r: any) => {
      yearCounts[r.year] = (yearCounts[r.year] || 0) + 1;
    });

    // Group by level
    const byLevel = {
      secondary: SECONDARY_YEARS.reduce((acc, y) => acc + (yearCounts[y] || 0), 0),
      middle:    MIDDLE_YEARS.reduce((acc, y) => acc + (yearCounts[y] || 0), 0),
      primary:   PRIMARY_YEARS.reduce((acc, y) => acc + (yearCounts[y] || 0), 0),
    };

    return NextResponse.json({ total: count || 0, byYear: yearCounts, byLevel });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
