import crypto from 'crypto';

const CHARGILY_API_URL = 'https://pay.chargily.net/api/v2';

export interface ChargilyCustomer {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: {
    country?: string;
    state?: string;
    address?: string;
  };
  metadata?: Record<string, string>;
}

export interface ChargilyCheckoutItem {
  price: string;
  quantity: number;
}

export interface ChargilyCheckoutPayload {
  amount?: number;
  currency?: string;
  items?: ChargilyCheckoutItem[];
  payment_method?: 'edahabia' | 'cib' | 'chargily_app';
  success_url: string;
  failure_url?: string;
  webhook_endpoint?: string;
  customer_id?: string;
  description?: string;
  locale?: 'ar' | 'en' | 'fr';
  metadata?: Record<string, string>;
  chargily_pay_fees_allocation?: 'customer' | 'merchant' | 'split';
}

export interface ChargilyCheckout {
  id: string;
  entity: string;
  livemode: boolean;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'canceled';
  checkout_url: string;
  success_url: string;
  failure_url?: string;
  customer_id?: string;
  metadata?: Record<string, string>;
  invoice_id?: string;
  created_at: number;
  updated_at: number;
}

export interface ChargilyWebhookEvent {
  id: string;
  entity: 'event';
  livemode: boolean;
  type: 'checkout.paid' | 'checkout.failed' | 'checkout.canceled';
  data: ChargilyCheckout;
  created_at: number;
  updated_at: number;
}

function getSecretKey(): string {
  const key = process.env.CHARGILY_SECRET_KEY;
  if (!key) throw new Error('CHARGILY_SECRET_KEY is not set');
  return key;
}

async function chargilyRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const secretKey = getSecretKey();
  const url = `${CHARGILY_API_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Chargily API error ${res.status}: ${errorText}`);
  }

  return res.json() as Promise<T>;
}

export async function createChargilyCustomer(
  customer: ChargilyCustomer
): Promise<{ id: string; email: string; name: string }> {
  return chargilyRequest('POST', '/customers', customer);
}

export async function createChargilyCheckout(
  payload: ChargilyCheckoutPayload
): Promise<ChargilyCheckout> {
  return chargilyRequest('POST', '/checkouts', payload);
}

export async function getChargilyCheckout(
  checkoutId: string
): Promise<ChargilyCheckout> {
  return chargilyRequest('GET', `/checkouts/${checkoutId}`);
}

export function verifyChargilySignature(
  payload: string,
  signature: string
): boolean {
  const secretKey = getSecretKey();
  const computed = crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(computed, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

export const PLANS = {
  pro_monthly: {
    name: 'Pro',
    nameAr: 'الاشتراك الكامل',
    period: 'monthly',
    periodAr: 'شهري',
    amount: 200, // 200 DZD all-inclusive
    currency: 'dzd',
    features: [
      'تحميل غير محدود',
      'الوصول لجميع المستويات (1AS, 2AS, 3AS)',
      'مدرّس ذكي متقدم',
      'تحميل ZIP منظّم',
      'دعم ذو أولوية',
    ],
  },
  pro_annual: {
    name: 'Pro',
    nameAr: 'الاشتراك الكامل',
    period: 'annual',
    periodAr: 'سنوي',
    amount: 1800, // 1800 DZD/year (save ~25%)
    currency: 'dzd',
    features: [
      'تحميل غير محدود',
      'الوصول لجميع المستويات (1AS, 2AS, 3AS)',
      'مدرّس ذكي متقدم',
      'تحميل ZIP منظّم',
      'دعم ذو أولوية',
      'توفير 25%',
    ],
  },
  premium_monthly: {
    name: 'Premium',
    nameAr: 'الاشتراك الكامل',
    period: 'monthly',
    periodAr: 'شهري',
    amount: 200,
    currency: 'dzd',
    features: [
      'تحميل غير محدود',
      'الوصول لجميع المستويات (1AS, 2AS, 3AS)',
      'مدرّس ذكي متقدم',
      'تحميل ZIP منظّم',
      'دعم ذو أولوية',
    ],
  },
  premium_annual: {
    name: 'Premium',
    nameAr: 'الاشتراك الكامل',
    period: 'annual',
    periodAr: 'سنوي',
    amount: 1800,
    currency: 'dzd',
    features: [
      'تحميل غير محدود',
      'الوصول لجميع المستويات (1AS, 2AS, 3AS)',
      'مدرّس ذكي متقدم',
      'تحميل ZIP منظّم',
      'دعم ذو أولوية',
      'توفير 25%',
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
