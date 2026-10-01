import { Box, Button, SectionHelper } from '@wix/design-system';
import { useFAQEntitlement } from '../../../../lib/use-faq-entitlement';
import { PRO_MONTHLY_USD, PRO_YEARLY_USD, TRIAL_DAYS } from '../../../../lib/faq-pricing';

export const PricingStatus = () => {
  const { entitlement, loading, error, refresh } = useFAQEntitlement();
  const openPricing = () => { if (entitlement) window.open(entitlement.upgradeUrl, '_blank', 'noopener,noreferrer'); };
  const title = entitlement?.plan === 'trial' ? 'Pro trial' : entitlement?.plan === 'pro' ? 'Pro' : entitlement ? 'Basic · Free' : 'Your plan';
  return <Box direction="vertical" gap="SP2" padding="SP3">
    <SectionHelper title={title} skin={error ? 'danger' : entitlement?.canUseLive ? 'success' : 'standard'}>
      <span aria-live="polite">{loading ? 'Checking your plan…' : error ?? (entitlement?.plan === 'basic'
        ? `Test every feature in Editor/Preview. Live FAQs require Pro: $${PRO_MONTHLY_USD}/month or $${PRO_YEARLY_USD}/year USD.`
        : entitlement?.plan === 'trial'
          ? `Full access during your trial${entitlement.trialEndDate ? ` until ${new Date(entitlement.trialEndDate).toLocaleString()}` : ''}. Wix bills the selected Pro plan afterward unless canceled.`
          : 'All features and live widgets are unlocked.')}</span>
    </SectionHelper>
    {!loading && entitlement?.plan === 'basic' ? <>
      {entitlement.trialAvailable ? <>
        <SectionHelper size="small">Try full access for {TRIAL_DAYS} days. Payment details are required; Wix bills your selected Pro plan afterward unless canceled.</SectionHelper>
        <Button size="small" fullWidth onClick={openPricing}>Start free trial</Button>
      </> : null}
      <Button size="small" fullWidth priority={entitlement.trialAvailable ? 'secondary' : 'primary'} onClick={openPricing}>Upgrade to Pro</Button>
    </> : null}
    <Button size="small" fullWidth priority="tertiary" disabled={loading} onClick={() => void refresh()}>Refresh status</Button>
  </Box>;
};
