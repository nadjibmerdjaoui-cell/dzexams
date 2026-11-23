'use client';

import React, { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

type Payment = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_reference: string | null;
  created_at: string;
  user_profiles?: { email?: string; full_name?: string } | null;
};

function AdminPaymentsContent() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/payments');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذر تحميل الطلبات');
      setPayments(data.payments || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = async (paymentId: string, action: 'approve' | 'reject') => {
    const promptText = action === 'approve'
      ? 'تأكد أولاً من وصول مبلغ 200 دج إلى حسابك. هل تريد تفعيل الاشتراك؟'
      : 'هل تريد رفض طلب الدفع هذا؟';
    if (!window.confirm(promptText)) return;
    setBusy(paymentId);
    setError('');
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذر تحديث الطلب');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ');
    } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen p-5" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div><h1 className="text-2xl font-bold">مراجعة مدفوعات CCP</h1><p className="text-sm text-muted-foreground">تحقق من التحويل في حسابك قبل الموافقة.</p></div>
          <button onClick={load} className="rounded-lg border border-border p-2" aria-label="تحديث"><RefreshCw size={18}/></button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin"/></div> : payments.length === 0 ? <p className="text-muted-foreground p-8 text-center border border-border rounded-xl">لا توجد طلبات دفع حالياً.</p> : (
          <div className="space-y-3">
            {payments.map(p => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="font-semibold">{p.user_profiles?.full_name || p.user_profiles?.email || p.user_id}</p>
                  <p className="text-xs text-muted-foreground">{p.user_profiles?.email || ''}</p>
                  <p className="text-sm">مرجع التحويل: <strong className="font-mono">{p.payment_reference || '—'}</strong></p>
                  <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString('ar-DZ')}</p>
                  <p className="text-sm font-semibold">{p.amount} دج · {p.status}</p>
                </div>
                {p.status === 'pending' && <div className="flex gap-2">
                  <button disabled={busy === p.id} onClick={() => review(p.id, 'approve')} className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50"><CheckCircle size={15}/> موافقة وتفعيل</button>
                  <button disabled={busy === p.id} onClick={() => review(p.id, 'reject')} className="rounded-lg border border-red-500/40 text-red-500 px-4 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50"><XCircle size={15}/> رفض</button>
                </div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  return <AppLayout activePath="/admin/payments"><AdminPaymentsContent /></AppLayout>;
}
