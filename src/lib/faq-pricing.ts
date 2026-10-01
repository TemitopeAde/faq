export const FAQ_APP_ID = '3549153b-66a8-4ba3-aa1d-364430057098';
export const PRO_MONTHLY_USD = 5;
export const PRO_YEARLY_USD = 48;
export const TRIAL_DAYS = 3;

export type FAQEntitlement = {
  plan: 'basic' | 'trial' | 'pro';
  canUseLive: boolean;
  trialAvailable: boolean;
  trialEndDate: string | null;
  upgradeUrl: string;
};

type BillingInstance = {
  instanceId?: string;
  isFree?: boolean;
  freeTrialAvailable?: boolean;
  billing?: { freeTrialInfo?: { status?: string; endDate?: Date | string | null } };
};

// Wix remains authoritative even after cancellation or a billing grace period.
export const entitlementFor = (instance: BillingInstance, siteOwnerEmail?: string | null): FAQEntitlement => {
  if (!instance.instanceId || typeof instance.isFree !== 'boolean') throw new Error('Wix did not return a valid app entitlement.');
  const ownerHasPro = /^[^\s@]+@wix\.com$/i.test(siteOwnerEmail?.trim() ?? '');
  const canUseLive = instance.isFree === false || ownerHasPro;
  const trial = instance.billing?.freeTrialInfo;
  const plan = !canUseLive ? 'basic' : !ownerHasPro && trial?.status === 'IN_PROGRESS' ? 'trial' : 'pro';
  const date = trial?.endDate ? new Date(trial.endDate) : null;
  return {
    plan,
    canUseLive,
    trialAvailable: !canUseLive && instance.freeTrialAvailable === true,
    trialEndDate: plan === 'trial' && date && Number.isFinite(date.getTime()) ? date.toISOString() : null,
    upgradeUrl: `https://www.wix.com/apps/upgrade/${FAQ_APP_ID}?appInstanceId=${encodeURIComponent(instance.instanceId)}`,
  };
};
