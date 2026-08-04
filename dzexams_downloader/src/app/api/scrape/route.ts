import { NextRequest, NextResponse } from 'next/server';

// ── Subject slugs per education level ────────────────────────────────────────

// Secondary school (ثانوي)
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

// Middle school (متوسط)
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

// Primary school (ابتدائي)
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

// ── Year slugs per level ──────────────────────────────────────────────────────
const YEAR_SLUGS: Record<string, string> = {
  // Secondary
  '1AS': '1as', '2AS': '2as', '3AS': '3as',
  // Middle
  '1AM': '1am', '2AM': '2am', '3AM': '3am', '4AM': '4am',
  // Primary
  '1AP': '1ap', '2AP': '2ap', '3AP': '3ap', '4AP': '4ap', '5AP': '5ap',
};

// Detect level from year code
function detectLevel(year: string): 'secondary' | 'middle' | 'primary' {
  if (year.endsWith('AS')) return 'secondary';
  if (year.endsWith('AM')) return 'middle';
  return 'primary';
}

// Get subject slugs map for a given year
function getSubjectSlugs(year: string): Record<string, string> {
  const level = detectLevel(year);
  if (level === 'middle') return MIDDLE_SUBJECT_SLUGS;
  if (level === 'primary') return PRIMARY_SUBJECT_SLUGS;
  return SECONDARY_SUBJECT_SLUGS;
}

export interface ScrapedFile {
  id: string;
  name: string;
  subject: string;
  subjectFr: string;
  year: string;
  type: 'دروس' | 'تمارين' | 'اختبارات' | 'تصحيحات';
  size: string;
  sizeBytes: number;
  url: string;
  pageUrl: string;
  addedDate: string;
  level?: 'secondary' | 'middle' | 'primary';
}

export interface FailedExtraction {
  pageUrl: string;
  title: string;
  reason: string;
}

// Retry helper with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 500
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ar,fr;q=0.9,en;q=0.8',
};

// Fetch a page from dzexams.com and extract document links
async function fetchDocumentLinks(
  year: string,
  subject: string,
  lang: 'ar' | 'fr' = 'ar'
): Promise<{ title: string; pageUrl: string; docId: string }[]> {
  const yearSlug = YEAR_SLUGS[year];
  const subjectSlugs = getSubjectSlugs(year);
  const subjectSlug = subjectSlugs[subject];
  if (!yearSlug || !subjectSlug) return [];

  const url = `https://www.dzexams.com/${lang}/${yearSlug}/${subjectSlug}`;

  try {
    const res = await withRetry(() =>
      fetch(url, {
        headers: FETCH_HEADERS,
        next: { revalidate: 3600 },
      })
    );

    if (!res.ok) return [];

    const html = await res.text();

    // Extract document links — dzexams uses /ar/documents/[base64id] pattern
    const docLinkRegex = /href="\/(?:ar|fr)\/documents\/([A-Za-z0-9+/=_-]+)"[^>]*>([^<]+)</g;
    const results: { title: string; pageUrl: string; docId: string }[] = [];
    const seen = new Set<string>();

    let match;
    while ((match = docLinkRegex.exec(html)) !== null) {
      const docId = match[1];
      const title = match[2].trim();
      if (docId && title && !seen.has(docId)) {
        seen.add(docId);
        results.push({
          title,
          pageUrl: `https://www.dzexams.com/ar/documents/${docId}`,
          docId,
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

// Fetch a document page and extract the real PDF download URL (with retry + fallback patterns)
async function fetchPdfUrl(pageUrl: string): Promise<{ url: string | null; failReason?: string }> {
  try {
    const res = await withRetry(
      () =>
        fetch(pageUrl, {
          headers: FETCH_HEADERS,
          next: { revalidate: 3600 },
        }),
      3,
      600
    );

    if (!res.ok) {
      return { url: null, failReason: `HTTP ${res.status}` };
    }

    const html = await res.text();

    // Pattern 1: direct PDF href link
    const pdfHrefMatch = html.match(/href="(https?:\/\/[^"]*\.pdf[^"]*)"/i);
    if (pdfHrefMatch) return { url: pdfHrefMatch[1] };

    // Pattern 2: dzexams upload path
    const uploadMatch = html.match(
      /["'](https?:\/\/(?:www\.)?dzexams\.com\/uploads?\/[^"']+\.pdf)["']/i
    );
    if (uploadMatch) return { url: uploadMatch[1] };

    // Pattern 3: data-src or data-url attributes
    const dataSrcMatch = html.match(/data-(?:src|url|file)="([^"]*\.pdf[^"]*)"/i);
    if (dataSrcMatch) {
      const src = dataSrcMatch[1];
      return { url: src.startsWith('http') ? src : `https://www.dzexams.com${src}` };
    }

    // Pattern 4: download button href
    const downloadBtnMatch = html.match(
      /(?:download|télécharger|تحميل)[^<]*<[^>]+href="([^"]*\.pdf[^"]*)"/i
    );
    if (downloadBtnMatch) {
      const src = downloadBtnMatch[1];
      return { url: src.startsWith('http') ? src : `https://www.dzexams.com${src}` };
    }

    // Pattern 5: any .pdf URL in the page
    const anyPdfMatch = html.match(
      /["']((?:https?:\/\/)?(?:www\.)?dzexams\.com[^"']*\.pdf)["']/i
    );
    if (anyPdfMatch) {
      const src = anyPdfMatch[1];
      return { url: src.startsWith('http') ? src : `https://www.dzexams.com${src}` };
    }

    // Pattern 6: fallback — look for any iframe/embed src with .pdf
    const iframeMatch = html.match(/(?:src|data)="([^"]*\.pdf[^"]*)"/i);
    if (iframeMatch) {
      const src = iframeMatch[1];
      return { url: src.startsWith('http') ? src : `https://www.dzexams.com${src}` };
    }

    return { url: null, failReason: 'No PDF URL found in page' };
  } catch (err) {
    return { url: null, failReason: err instanceof Error ? err.message : 'Fetch error' };
  }
}

// Classify document type from title
function classifyType(title: string): 'دروس' | 'تمارين' | 'اختبارات' | 'تصحيحات' {
  const t = title.toLowerCase();
  if (t.includes('تصحيح') || t.includes('حل') || t.includes('correction') || t.includes('corrigé')) {
    return 'تصحيحات';
  }
  if (t.includes('اختبار') || t.includes('فرض') || t.includes('امتحان') || t.includes('devoir') || t.includes('examen')) {
    return 'اختبارات';
  }
  if (t.includes('تمرين') || t.includes('تطبيق') || t.includes('exercice') || t.includes('activité')) {
    return 'تمارين';
  }
  return 'دروس';
}

// French name map for all subjects across all levels
const SUBJECT_FR_MAP: Record<string, string> = {
  // Secondary
  'رياضيات':           'Mathématiques',
  'الفيزياء':          'Physique',
  'اللغة العربية':     'Langue Arabe',
  'الفرنسية':          'Français',
  'الإنجليزية':        'Anglais',
  'العلوم الطبيعية':   'Sciences Nat.',
  'التاريخ والجغرافيا':'Histoire & Géo',
  'التربية الإسلامية': 'Éd. Islamique',
  'الإعلام الآلي':     'Informatique',
  'التكنولوجيا':       'Technologie',
  'الرسم':             'Dessin',
  'تامزيغت':           'Tamazight',
  // Middle (extra)
  'العلوم الفيزيائية':    'Physique',
  'اللغة الفرنسية':       'Français',
  'اللغة الإنجليزية':     'Anglais',
  'علوم الطبيعة والحياة': 'SVT',
  'التربية المدنية':      'Éd. Civique',
  'اللغة الأمازيغية':     'Tamazight',
  'التربية الفنية':       'Arts Plastiques',
  'التربية الموسيقية':    'Musique',
  // Primary (extra)
  'التربية العلمية والتكنولوجية': 'Sciences & Tech',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year') || '1AS';
  const subject = searchParams.get('subject') || 'رياضيات';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  try {
    // Step 1: Fetch document listing page (with retry)
    const docs = await fetchDocumentLinks(year, subject);

    if (docs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No documents found for this combination',
        files: [],
        failed: [],
      });
    }

    // Step 2: For each doc, fetch the page and extract PDF URL (limit concurrency)
    const batch = docs.slice(0, limit);
    const results: ScrapedFile[] = [];
    const failed: FailedExtraction[] = [];
    const level = detectLevel(year);

    // Process in batches of 5 to avoid overwhelming the server
    for (let i = 0; i < batch.length; i += 5) {
      const chunk = batch.slice(i, i + 5);
      const settled = await Promise.allSettled(
        chunk.map(async (doc) => {
          const { url: pdfUrl, failReason } = await fetchPdfUrl(doc.pageUrl);
          return { doc, pdfUrl, failReason };
        })
      );

      for (const result of settled) {
        if (result.status === 'fulfilled') {
          const { doc, pdfUrl, failReason } = result.value;
          if (pdfUrl) {
            const type = classifyType(doc.title);
            const fileName = doc.title.replace(/\s+/g, '_').replace(/[^\w\u0600-\u06FF_.-]/g, '') + '.pdf';

            results.push({
              id: `scraped-${doc.docId}`,
              name: fileName,
              subject,
              subjectFr: SUBJECT_FR_MAP[subject] || subject,
              year,
              type,
              size: 'جاري التحميل',
              sizeBytes: 0,
              url: pdfUrl,
              pageUrl: doc.pageUrl,
              addedDate: new Date().toISOString().split('T')[0],
              level,
            });
          } else {
            failed.push({
              pageUrl: doc.pageUrl,
              title: doc.title,
              reason: failReason || 'Unknown',
            });
          }
        } else {
          // Promise itself rejected
          const doc = chunk[settled.indexOf(result)];
          failed.push({
            pageUrl: doc?.pageUrl || '',
            title: doc?.title || 'Unknown',
            reason: result.reason?.message || 'Promise rejected',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      total: docs.length,
      failedCount: failed.length,
      files: results,
      failed,
    });
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to scrape dzexams.com', files: [], failed: [] },
      { status: 500 }
    );
  }
}
