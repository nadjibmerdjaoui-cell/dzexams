import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Protects server routes that can write to storage or run bulk imports.
 * Grant access through Supabase app_metadata.role=admin or ADMIN_EMAILS.
 * The allowlist is server-only and must never use user-editable metadata.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const allowedEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const emailAllowed = Boolean(user.email && allowedEmails.includes(user.email.toLowerCase()));
  const roleAllowed = user.app_metadata?.role === 'admin';

  if (!emailAllowed && !roleAllowed) {
    return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
  }

  return null;
}
