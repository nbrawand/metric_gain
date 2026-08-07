import { post } from './client';

export async function createCheckoutSession(token: string): Promise<{ url: string }> {
  return post('/v1/billing/create-checkout-session', undefined, token);
}

export async function createPortalSession(token: string): Promise<{ url: string }> {
  return post('/v1/billing/create-portal-session', undefined, token);
}

