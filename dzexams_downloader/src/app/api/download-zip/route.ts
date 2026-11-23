import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

interface ZipFileEntry {
  url: string;
  name: string;
  year: string;
  subject: string;
  type: string;
}

const ALLOWED_HOSTS = ['www.dzexams.com', 'dzexams.com'];

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

async function fetchFile(url: string): Promise<ArrayBuffer | null> {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) return null;

    const res = await withRetry(
      () =>
        fetch(url, {
          redirect: 'error',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://www.dzexams.com/',
            Accept: 'application/pdf,*/*',
          },
        }),
      3,
      600
    );

    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function sanitize(str: string): string {
  return str.replace(/[/\\?%*:|"<>]/g, '-').trim();
}

export async function POST(request: NextRequest) {
  let files: ZipFileEntry[];
  let zipName: string;

  try {
    const body = await request.json();
    files = body.files as ZipFileEntry[];
    zipName = (body.zipName as string) || 'dzexams-files';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  // Cap at 50 files per request to avoid timeouts
  const toProcess = files.slice(0, 50);

  const zip = new JSZip();
  let successCount = 0;
  const failedFiles: string[] = [];

  // Fetch all files concurrently (batched to avoid overwhelming the origin)
  const BATCH_SIZE = 5;
  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (file) => {
        if (!file.url || file.url === '#') {
          failedFiles.push(file.name || 'unknown');
          return;
        }

        const data = await fetchFile(file.url);
        if (!data) {
          failedFiles.push(file.name || 'unknown');
          return;
        }

        // Organize: Year / Subject / Type / filename.pdf
        const year = sanitize(file.year || 'unknown-year');
        const subject = sanitize(file.subject || 'unknown-subject');
        const type = sanitize(file.type || 'unknown-type');
        const fileName = sanitize(file.name || 'document') + '.pdf';

        const path = `${year}/${subject}/${type}/${fileName}`;
        zip.file(path, data);
        successCount++;
      })
    );
  }

  if (successCount === 0) {
    return NextResponse.json(
      {
        error: 'Could not fetch any files. Ensure real URLs are loaded via scraping first.',
        failedFiles,
      },
      { status: 422 }
    );
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const safeZipName = sanitize(zipName) || 'dzexams-files';

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeZipName}.zip"`,
      'Content-Length': String(zipBuffer.byteLength),
      'Cache-Control': 'no-store',
      'X-Success-Count': String(successCount),
      'X-Failed-Count': String(failedFiles.length),
      'X-Failed-Files': failedFiles.slice(0, 10).join(','),
    },
  });
}
