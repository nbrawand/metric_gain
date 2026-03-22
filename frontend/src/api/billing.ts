import { post, get } from './client';

export async function createCheckoutSession(token: string): Promise<{ url: string }> {
  return post('/v1/billing/create-checkout-session', undefined, token);
}

export async function createPortalSession(token: string): Promise<{ url: string }> {
  return post('/v1/billing/create-portal-session', undefined, token);
}

export interface SubscriptionStatus {
  subscription_status: string;
  trial_ends_at: string | null;
  has_subscription: boolean;
}

export async function getSubscriptionStatus(token: string): Promise<SubscriptionStatus> {
  return get('/v1/billing/status', token);
}
