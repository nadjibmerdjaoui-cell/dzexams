'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AppLogo from '@/components/ui/AppLogo';

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    pasted.split('').forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    const nextEmpty = newOtp.findIndex((v) => !v);
    const focusIdx = nextEmpty === -1 ? 5 : nextEmpty;
    inputRefs.current[focusIdx]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setError('أدخل رمز التحقق المكون من 6 أرقام.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      });
      if (verifyError) throw verifyError;
      router.replace('/');
    } catch (err: any) {
      setError(err?.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setResendLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (resendError) throw resendError;
      setResendCooldown(60);
    } catch (err: any) {
      setError(err?.message || 'فشل إعادة الإرسال. حاول مجدداً.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <AppLogo size={48} />
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">Easy School</h1>
            <p className="text-sm text-muted-foreground mt-1">تأكيد البريد الإلكتروني</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          {/* Email icon */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-base font-semibold text-foreground mb-1">تحقق من بريدك الإلكتروني</h2>
            <p className="text-sm text-muted-foreground">
              أرسلنا رمز تحقق مكون من 6 أرقام إلى
            </p>
            {email && (
              <p className="text-sm font-medium text-primary mt-1 break-all">{email}</p>
            )}
          </div>

          <form onSubmit={handleVerify} className="space-y-5">
            {/* OTP inputs */}
            <div>
              <div className="flex gap-2 justify-center" onPaste={handlePaste} dir="ltr">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className={`w-11 h-12 text-center text-lg font-semibold rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors ${
                      digit ? 'border-primary' : 'border-border'
                    }`}
                    aria-label={`الرقم ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || otp.join('').length < 6}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  جارٍ التحقق...
                </>
              ) : (
                'تأكيد الحساب'
              )}
            </button>
          </form>

          {/* Resend */}
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              لم تستلم الرمز؟{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading || resendCooldown > 0}
                className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {resendLoading
                  ? 'جارٍ الإرسال...'
                  : resendCooldown > 0
                  ? `إعادة الإرسال (${resendCooldown}ث)`
                  : 'إعادة الإرسال'}
              </button>
            </p>
          </div>

          {/* Back to login */}
          <div className="mt-4 pt-4 border-t border-border text-center">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← العودة إلى تسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <VerifyOtpForm />
    </Suspense>
  );
}
