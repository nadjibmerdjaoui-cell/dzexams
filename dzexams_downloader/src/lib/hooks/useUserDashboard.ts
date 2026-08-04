'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserSubscription {
  id: string;
  plan: 'free' | 'pro' | 'premium';
  status: 'active' | 'inactive' | 'cancelled' | 'trial';
  started_at: string;
  expires_at: string | null;
}

export interface DownloadHistoryEntry {
  id: string;
  name: string;
  year: string;
  subject: string;
  doc_type: string;
  file_count: number;
  total_size: string;
  status: 'completed' | 'partial' | 'failed';
  completed_at: string;
}

// Plan limits config
const PLAN_LIMITS = {
  free: { aiCredits: 10, downloadQuota: 50 },
  pro: { aiCredits: 200, downloadQuota: -1 }, // -1 = unlimited
  premium: { aiCredits: 1000, downloadQuota: -1 }, // -1 = unlimited
};

export interface UserDashboardData {
  subscription: UserSubscription | null;
  downloadHistory: DownloadHistoryEntry[];
  totalDownloads: number;
  aiCreditsUsed: number;
  aiCreditsTotal: number;
  downloadQuotaUsed: number;
  downloadQuotaTotal: number;
  loading: boolean;
  error: string | null;
}

export function useUserDashboard(): UserDashboardData {
  const { user } = useAuth();
  const supabase = createClient();

  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryEntry[]>([]);
  const [totalDownloads, setTotalDownloads] = useState(0);
  const [aiCreditsUsed, setAiCreditsUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Fetch subscription
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('id, plan, status, started_at, expires_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) throw subError;
      setSubscription(subData as UserSubscription | null);

      // Fetch download history
      const { data: histData, error: histError } = await supabase
        .from('download_history')
        .select('id, name, year, subject, doc_type, file_count, total_size, status, completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(50);

      if (histError) throw histError;
      setDownloadHistory((histData as DownloadHistoryEntry[]) || []);

      // Total completed downloads (file count sum)
      const completedEntries = (histData || []).filter((h: any) => h.status === 'completed');
      const total = completedEntries.reduce((sum: number, h: any) => sum + (h.file_count || 0), 0);
      setTotalDownloads(total);

      // AI credits used: count from payments table (each paid session = 1 credit usage approximation)
      // We use download_history count as a proxy for AI credits used
      const { count: aiCount, error: aiError } = await supabase
        .from('download_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (!aiError) {
        setAiCreditsUsed(aiCount || 0);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscription for user_subscriptions
  useEffect(() => {
    if (!user) return;

    const subChannel = supabase
      .channel(`user_subscriptions:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subChannel);
    };
  }, [user, supabase, fetchData]);

  // Real-time subscription for download_history
  useEffect(() => {
    if (!user) return;

    const histChannel = supabase
      .channel(`download_history:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'download_history',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(histChannel);
    };
  }, [user, supabase, fetchData]);

  const plan = subscription?.plan || 'free';
  const limits = PLAN_LIMITS[plan];

  return {
    subscription,
    downloadHistory,
    totalDownloads,
    aiCreditsUsed,
    aiCreditsTotal: limits.aiCredits,
    downloadQuotaUsed: totalDownloads,
    downloadQuotaTotal: limits.downloadQuota,
    loading,
    error,
  };
}
