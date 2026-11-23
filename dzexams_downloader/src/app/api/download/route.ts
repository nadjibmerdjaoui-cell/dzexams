import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get('url');
  const fileName = searchParams.get('name') || 'document.pdf';

  if (!fileUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(fileUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Allow our own Supabase storage + dzexams.com (fallback for non-stored files)
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
    : '';

  const allowedHosts = [
    supabaseHost,
    'www.dzexams.com',
    'dzexams.com',
  ].filter(Boolean);

  if (!allowedHosts.includes(parsedUrl.hostname)) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
  }

  try {
    const response = await fetch(fileUrl, {
      redirect: 'error',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: supabaseHost ? process.env.NEXT_PUBLIC_SUPABASE_URL! : 'https://www.dzexams.com/',
        Accept: 'application/pdf,*/*',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'application/pdf';
    const contentLength = response.headers.get('content-length');

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Cache-Control': 'public, max-age=86400',
    };

    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    return new NextResponse(response.body, { status: 200, headers });
  } catch (error) {
    console.error('Download proxy error:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}
