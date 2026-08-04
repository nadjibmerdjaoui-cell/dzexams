import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year    = searchParams.get('year');
  const subject = searchParams.get('subject');
  const docType = searchParams.get('type');
  const limit   = Math.min(parseInt(searchParams.get('limit') || '500'), 1000);

  try {
    const supabase = getAdminClient();

    let query = supabase
      .from('pdf_catalog')
      .select('id, storage_path, public_url, name, subject, subject_fr, year, doc_type, size_bytes, size_label, added_date')
      .order('year')
      .order('subject')
      .order('name')
      .limit(limit);

    if (year)    query = query.eq('year', year);
    if (subject) query = query.eq('subject', subject);
    if (docType) query = query.eq('doc_type', docType);

    const { data, error } = await query;
    if (error) throw error;

    // Map to PdfFile shape — public_url is from our own Supabase storage, no external refs
    const files = (data || []).map((row: any) => ({
      id:        row.id,
      name:      row.name,
      subject:   row.subject,
      subjectFr: row.subject_fr,
      year:      row.year,
      type:      row.doc_type,
      size:      row.size_label || '—',
      sizeBytes: row.size_bytes || 0,
      url:       row.public_url,   // Supabase storage URL — no dzexams.com
      addedDate: row.added_date,
    }));

    return NextResponse.json({ files, total: files.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, files: [] }, { status: 500 });
  }
}
