'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AppLogo from '@/components/ui/AppLogo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ. حاول مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <AppLogo size={48} />
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">Easy School</h1>
            <p className="text-sm text-muted-foreground mt-1">استعادة كلمة المرور</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">تم إرسال الرابط</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  تم إرسال رابط إعادة تعيين كلمة المرور إلى{' '}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  تحقق من صندوق الوارد أو مجلد الرسائل غير المرغوب فيها
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                العودة إلى تسجيل الدخول
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground block" htmlFor="email">
                    البريد الإلكتروني
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      جارٍ الإرسال...
                    </>
                  ) : (
                    'إرسال رابط الاستعادة'
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-4">
                تذكرت كلمة المرور؟{' '}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  تسجيل الدخول
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
