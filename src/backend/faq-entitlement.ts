import { appInstances } from '@wix/app-management';
import { auth } from '@wix/essentials';
import { entitlementFor } from '../lib/faq-pricing';

export class FAQAccessError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

export const getFAQEntitlement = async (request: Request) => {
  if (!request.headers.get('authorization')) throw new FAQAccessError('Wix authentication is required.', 401);
  const token = await auth.getTokenInfo();
  if (!token.active || !token.instanceId) throw new FAQAccessError('Invalid Wix app context.', 401);
  const { instance, site } = await auth.elevate(appInstances.getAppInstance)();
  if (!instance || instance.instanceId !== token.instanceId) throw new FAQAccessError('App instance mismatch.', 403);
  return entitlementFor(instance, site?.ownerInfo?.email);
};

export const jsonResponse = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export const accessErrorResponse = (error: unknown): Response => {
  console.error('FAQ access request failed:', error);
  return jsonResponse({ error: error instanceof FAQAccessError ? error.message : 'Could not verify FAQ access. Please retry.' }, error instanceof FAQAccessError ? error.status : 503);
};
