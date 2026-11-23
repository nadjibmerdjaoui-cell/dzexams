'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { CheckCircle, Copy, Loader2, ArrowLeft } from 'lucide-react';

const CCP_HOLDER = process.env.NEXT_PUBLIC_CCP_ACCOUNT_NAME || 'Easy School';
const CCP_NUMBER = process.env.NEXT_PUBLIC_CCP_ACCOUNT_NUMBER || '';

function ManualPaymentContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const copyNumber = async () => {
    if (CCP_NUMBER) await navigator.clipboard.writeText(CCP_NUMBER);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) { router.push('/login'); return; }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/manual-payment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'تعذر إرسال الطلب');
      setMessage(data.message || 'تم إرسال طلب الدفع.');
      setReference('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-5 py-10" dir="rtl">
      <div className="max-w-xl mx-auto space-y-6">
        <button onClick={() => router.push('/pricing')} className="text-sm text-muted-foreground flex items-center gap-2">
          <ArrowLeft size={16} /> العودة إلى الاشتراكات
        </button>
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold">الدفع عبر CCP</h1>
            <p className="text-sm text-muted-foreground mt-2">حوّل مبلغ الاشتراك الشهري ثم أرسل مرجع التحويل. السعر هو 200 دج شهرياً.</p>
          </div>
          <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-3">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground text-sm">اسم المستفيد</span><strong>{CCP_HOLDER}</strong></div>
            <div className="flex justify-between gap-3 items-center"><span className="text-muted-foreground text-sm">رقم CCP</span><strong className="font-mono" dir="ltr">{CCP_NUMBER || 'سيتم إضافة الرقم قريباً'}</strong></div>
            {CCP_NUMBER && <button type="button" onClick={copyNumber} className="text-sm text-primary inline-flex items-center gap-2"><Copy size={14}/> نسخ رقم CCP</button>}
          </div>
          <ol className="list-decimal pr-5 text-sm text-muted-foreground space-y-2">
            <li>حوّل 200 دج إلى الحساب أعلاه عبر CCP أو BaridiMob.</li>
            <li>احتفظ بمرجع العملية أو رقم التحويل.</li>
            <li>أدخل المرجع أدناه وأرسل الطلب.</li>
            <li>سنراجع وصول المبلغ ونفعّل اشتراكك بعد التأكد.</li>
          </ol>
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="reference">مرجع التحويل / رقم العملية</label>
            <input id="reference" value={reference} onChange={e => setReference(e.target.value)} minLength={5} maxLength={100} required className="w-full rounded-xl border border-border bg-background px-4 py-3" placeholder="أدخل مرجع التحويل" />
            <button disabled={loading || !CCP_NUMBER} className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin mx-auto" size={18}/> : 'إرسال طلب التفعيل'}
            </button>
          </form>
          {message && <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-600 flex gap-2"><CheckCircle size={18}/>{message}</div>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <p className="text-xs text-muted-foreground">ملاحظة: إرسال المرجع لا يفعّل الاشتراك تلقائياً. التفعيل يتم فقط بعد التحقق اليدوي من وصول المبلغ.</p>
        </div>
      </div>
    </div>
  );
}

export default function ManualPaymentPage() {
  return <AppLayout activePath="/pricing"><ManualPaymentContent /></AppLayout>;
}
