import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';


const SECONDARY_SUBJECT_SLUGS: Record<string, string> = {
  'رياضيات': 'mathematiques',
  'الفيزياء': 'physique',
  'اللغة العربية': 'arabe',
  'الفرنسية': 'francais',
  'الإنجليزية': 'anglais',
  'العلوم الطبيعية': 'sciences-naturelles',
  'التاريخ والجغرافيا': 'histoire-geographie',
  'التربية الإسلامية': 'education-islamique',
  'الإعلام الآلي': 'informatique',
  'التكنولوجيا': 'technologie',
  'الرسم': 'dessin',
  'تامزيغت': 'tamazight',
};

const MIDDLE_SUBJECT_SLUGS: Record<string, string> = {
  'رياضيات': 'mathematiques',
  'العلوم الفيزيائية': 'physique',
  'اللغة العربية': 'arabe',
  'اللغة الفرنسية': 'francais',
  'اللغة الإنجليزية': 'anglais',
  'التاريخ والجغرافيا': 'histoire-geographie',
  'علوم الطبيعة والحياة': 'svt',
  'التربية الإسلامية': 'tarbia-islamia',
  'التربية المدنية': 'tarbia-madania',
  'اللغة الأمازيغية': 'tamazight',
  'الإعلام الآلي': 'informatique',
  'التربية الفنية': 'dessin',
  'التربية الموسيقية': 'musique',
};

const PRIMARY_SUBJECT_SLUGS: Record<string, string> = {
  'رياضيات': 'mathematiques',
  'اللغة العربية': 'arabe',
  'اللغة الفرنسية': 'francais',
  'اللغة الإنجليزية': 'anglais',
  'التربية الإسلامية': 'tarbia-islamia',
  'التربية المدنية': 'tarbia-madania',
  'اللغة الأمازيغية': 'tamazight',
  'التربية العلمية والتكنولوجية': 'technologie',
  'التربية الفنية': 'dessin',
  'التربية الموسيقية': 'musique',
};

const YEAR_SLUGS: Record<string, string> = {
  '1AS': '1as', '2AS': '2as', '3AS': '3as',
  '1AM': '1am', '2AM': '2am', '3AM': '3am', '4AM': '4am',
  '1AP': '1ap', '2AP': '2ap', '3AP': '3ap', '4AP': '4ap', '5AP': '5ap',
};

const SUBJECT_FR: Record<string, string> = {
  'رياضيات': 'Mathématiques',
  'الفيزياء': 'Physique',
  'اللغة العربية': 'Langue Arabe',
  'الفرنسية': 'Français',
  'الإنجليزية': 'Anglais',
  'العلوم الطبيعية': 'Sciences Nat.',
  'التاريخ والجغرافيا': 'Histoire & Géo',
  'التربية الإسلامية': 'Éd. Islamique',
  'الإعلام الآلي': 'Informatique',
  'التكنولوجيا': 'Technologie',
  'الرسم': 'Dessin',
  'تامزيغت': 'Tamazight',
  'العلوم الفيزيائية': 'Physique',
  'اللغة الفرنسية': 'Français',
  'اللغة الإنجليزية': 'Anglais',
  'علوم الطبيعة والحياة': 'SVT',
  'التربية المدنية': 'Éd. Civique',
  'اللغة الأمازيغية': 'Tamazight',
  'التربية الفنية': 'Arts Plastiques',
  'التربية الموسيقية': 'Musique',
  'التربية العلمية والتكنولوجية': 'Sciences & Tech',
};

const SECONDARY_YEARS = ['1AS', '2AS', '3AS'];
const MIDDLE_YEARS = ['1AM', '2AM', '3AM', '4AM'];
const PRIMARY_YEARS = ['1AP', '2AP', '3AP', '4AP', '5AP'];

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

async function fetchDocLinks(year: string, subject: string): Promise<{ title: string; docId: string }[]> {
  const yearSlug = YEAR_SLUGS[year];
  const subjectSlug = getSubjectSlugs(year)[subject];
  if (!yearSlug || !subjectSlug) return [];

  const rootUrl = 'https://www.dzexams.com/ar/' + yearSlug + '/' + subjectSlug;
  const root = new URL(rootUrl);
  const subjectPath = root.pathname.replace(/\\/+$/, '');
  const categoryPrefix = subjectPath + '/';
  const results: { title: string; docId: string }[] = [];
  const seenDocs = new Set<string>();
  const queuedPages = new Set<string>([root.toString()]);
  const visitedPages = new Set<string>();

  async function fetchHtml(pageUrl: string): Promise<string> {
    try {
      const res = await withRetry(() => fetch(pageUrl, { headers: FETCH_HEADERS }));
      if (!res.ok) return '';
      return await res.text();
    } catch {
      return '';
    }
  }

  function scanPage(html: string, baseUrl: string) {
    const anchorRegex = /<a\\b([^>]*)>([\\s\\S]*?)<\\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = anchorRegex.exec(html)) !== null) {
      const rawHref = match[1].match(/\\bhref\\s*=\\s*["']([^"']+)["']/i)?.[1];
      if (!rawHref) continue;

      let target: URL;
      try {
        target = new URL(rawHref.replace(/&amp;/g, '&'), baseUrl);
      } catch {
        continue;
      }

      if (target.hostname !== 'www.dzexams.com' && target.hostname !== 'dzexams.com') continue;
      target.hash = '';
      const docMatch = target.pathname.match(/^\\/(?:ar|fr)\\/documents\\/([A-Za-z0-9+/=_-]+)/i);
      if (docMatch) {
        const title = match[2]
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;|&#160;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/&quot;/gi, '"')
          .replace(/&#39;|&apos;/gi, "'")
          .replace(/\\s+/g, ' ')
          .trim();
        const docId = docMatch[1];
        if (docId && !seenDocs.has(docId)) {
          seenDocs.add(docId);
          results.push({ title: title || ('Document ' + (results.length + 1)), docId });
        }
        continue;
      }

      // Follow pagination on the subject page and every nested category,
      // while never leaving this exact subject's URL subtree.
      const sameSubjectPage = target.pathname.replace(/\\/+$/, '') === subjectPath;
      const nestedCategory = target.pathname.startsWith(categoryPrefix);
      if (sameSubjectPage || nestedCategory) {
        const normalized = target.toString();
        if (!visitedPages.has(normalized)) queuedPages.add(normalized);
      }
    }
  }

  // Breadth-first crawl: pagination + arbitrarily nested categories, bounded
  // to avoid runaway crawling and throttled to be polite to the source site.
  const maxPages = 1000;
  while (queuedPages.size > 0 && visitedPages.size < maxPages) {
    const pageUrl = queuedPages.values().next().value as string;
    queuedPages.delete(pageUrl);
    if (visitedPages.has(pageUrl)) continue;
    visitedPages.add(pageUrl);
    const html = await fetchHtml(pageUrl);
    if (html) scanPage(html, pageUrl);
    if (queuedPages.size > 0) await sleep(150);
  }

  return results;
}
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
      /(?:download|télécharger|تحميل)[^<]*<[^>]+href="([^"]*\.pdf[^"]*)"/i,
      /["']((?:https?:\/\/)?(?:www\.)?dzexams\.com[^"']*\.pdf)["']/i,
      /(?:src|data)="([^"]*\.pdf[^"]*)"/i,
    ];

    for (const p of patterns) {
      const m = html.match(p);
      if (m) {
        const src = m[1];
        return src.startsWith('http') ? src : `https://www.dzexams.com${src}`;
      }
    }
    return null;
  } catch { return null; }
}

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

// Streaming POST handler — sends SSE events as files are processed
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  let body: {
    levels?: ('secondary' | 'middle' | 'primary')[];
    years?: string[];
    subjects?: string[];
    limitPerCombo?: number;
  } = {};
  try { body = await request.json(); } catch { /* defaults */ }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        const supabase = await createServerSupabaseClient();

        // Build year/subject lists
        let years: string[] = [];
        let subjectPool: string[] = [];

        if (body.levels && body.levels.length > 0) {
          if (body.levels.includes('secondary')) {
            years.push(...SECONDARY_YEARS);
            subjectPool.push(...Object.keys(SECONDARY_SUBJECT_SLUGS));
          }
          if (body.levels.includes('middle')) {
            years.push(...MIDDLE_YEARS);
            subjectPool.push(...Object.keys(MIDDLE_SUBJECT_SLUGS));
          }
          if (body.levels.includes('primary')) {
            years.push(...PRIMARY_YEARS);
            subjectPool.push(...Object.keys(PRIMARY_SUBJECT_SLUGS));
          }
          years = [...new Set(years)];
          subjectPool = [...new Set(subjectPool)];
        } else {
          years = body.years ?? [...SECONDARY_YEARS, ...MIDDLE_YEARS, ...PRIMARY_YEARS];
          subjectPool = body.subjects ?? [...new Set([
            ...Object.keys(SECONDARY_SUBJECT_SLUGS),
            ...Object.keys(MIDDLE_SUBJECT_SLUGS),
            ...Object.keys(PRIMARY_SUBJECT_SLUGS),
          ])];
        }

        const limitPerCombo = Math.min(body.limitPerCombo ?? 20, 50);
        const stats = { stored: 0, skipped: 0, failed: 0, total: 0 };
        const totalCombos = years.reduce((acc, y) => {
          const slugs = getSubjectSlugs(y);
          return acc + subjectPool.filter((s) => slugs[s]).length;
        }, 0);
        let combosDone = 0;

        send({ type: 'start', totalCombos, years: years.length, subjects: subjectPool.length });

        for (const year of years) {
          const subjectSlugs = getSubjectSlugs(year);
          const validSubjects = subjectPool.filter((s) => subjectSlugs[s]);

          for (const subject of validSubjects) {
            await sleep(300);

            send({ type: 'combo', year, subject, combosDone, totalCombos });

            const docs = await fetchDocLinks(year, subject);
            const batch = docs.slice(0, limitPerCombo);
            stats.total += batch.length;

            send({ type: 'combo_docs', year, subject, count: batch.length });

            for (let i = 0; i < batch.length; i += 3) {
              const chunk = batch.slice(i, i + 3);
              await Promise.allSettled(
                chunk.map(async ({ title, docId }) => {
                  const docType = classifyType(title);
                  const safeName = title.replace(/\s+/g, '_').replace(/[^\w\u0600-\u06FF_.-]/g, '') + '.pdf';
                  const storagePath = `${year}/${subject}/${docType}/${safeName}`;

                  // Skip if already stored
                  const { data: existing } = await supabase
                    .from('pdf_catalog')
                    .select('id')
                    .eq('storage_path', storagePath)
                    .maybeSingle();

                  if (existing) {
                    stats.skipped++;
                    send({ type: 'file_skipped', title, year, subject });
                    return;
                  }

                  const pdfUrl = await extractPdfUrl(docId);
                  if (!pdfUrl) {
                    stats.failed++;
                    send({ type: 'file_failed', title, reason: 'No PDF URL found' });
                    return;
                  }

                  const buffer = await downloadPdf(pdfUrl);
                  if (!buffer) {
                    stats.failed++;
                    send({ type: 'file_failed', title, reason: 'Download failed' });
                    return;
                  }

                  // Upload to storage
                  const safePath = safeName.replace(/[^\w\u0600-\u06FF._-]/g, '_').replace(/__+/g, '_');
                  const finalPath = `${year}/${subject}/${docType}/${safePath}`;

                  const { error: upErr } = await supabase.storage
                    .from('exam-pdfs')
                    .upload(finalPath, buffer, { contentType: 'application/pdf', upsert: true });

                  if (upErr) {
                    stats.failed++;
                    send({ type: 'file_failed', title, reason: upErr.message });
                    return;
                  }

                  const { data: urlData } = supabase.storage.from('exam-pdfs').getPublicUrl(finalPath);

                  const { error: catErr } = await supabase.from('pdf_catalog').upsert({
                    storage_path: finalPath,
                    public_url: urlData.publicUrl,
                    name: title,
                    subject,
                    subject_fr: SUBJECT_FR[subject] || subject,
                    year,
                    doc_type: docType,
                    size_bytes: buffer.byteLength,
                    size_label: formatSize(buffer.byteLength),
                    source_url: `https://www.dzexams.com/ar/documents/${docId}`,
                    added_date: new Date().toISOString().split('T')[0],
                  }, { onConflict: 'storage_path' });

                  if (catErr) {
                    stats.failed++;
                    send({ type: 'file_failed', title, reason: catErr.message });
                    return;
                  }

                  stats.stored++;
                  send({ type: 'file_stored', title, year, subject, docType, size: formatSize(buffer.byteLength) });
                })
              );
              await sleep(200);
            }

            combosDone++;
            send({ type: 'combo_done', year, subject, combosDone, totalCombos, stats: { ...stats } });
          }
        }

        send({ type: 'done', stats });
      } catch (err: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// GET: catalog stats per level
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const supabase = await createServerSupabaseClient();
    const { count } = await supabase
      .from('pdf_catalog')
      .select('id', { count: 'exact', head: true });

    const { data: byYearRows } = await supabase
      .from('pdf_catalog')
      .select('year')
      .order('year');

    const yearCounts: Record<string, number> = {};
    (byYearRows || []).forEach((r: any) => {
      yearCounts[r.year] = (yearCounts[r.year] || 0) + 1;
    });

    const byLevel = {
      secondary: SECONDARY_YEARS.reduce((acc, y) => acc + (yearCounts[y] || 0), 0),
      middle: MIDDLE_YEARS.reduce((acc, y) => acc + (yearCounts[y] || 0), 0),
      primary: PRIMARY_YEARS.reduce((acc, y) => acc + (yearCounts[y] || 0), 0),
    };

    return NextResponse.json({ total: count || 0, byYear: yearCounts, byLevel });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
