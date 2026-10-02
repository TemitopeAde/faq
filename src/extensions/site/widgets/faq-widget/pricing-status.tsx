import { Box, Button, SectionHelper } from '@wix/design-system';
import { useFAQEntitlement } from '../../../../lib/use-faq-entitlement';
import { PRO_MONTHLY_USD, PRO_YEARLY_USD, TRIAL_DAYS } from '../../../../lib/faq-pricing';

export const PricingStatus = () => {
  const { entitlement, loading, error } = useFAQEntitlement();
  if (loading || error || !entitlement || entitlement.canUseLive) return null;
  const openPricing = () => { if (entitlement) window.open(entitlement.upgradeUrl, '_blank', 'noopener,noreferrer'); };
  return <Box direction="vertical" gap="SP2" padding="SP3">
    <SectionHelper title="Basic · Free" skin="standard">
      <span>Test every feature in Editor/Preview. Live FAQs require Pro: ${PRO_MONTHLY_USD}/month or ${PRO_YEARLY_USD}/year USD.</span>
    </SectionHelper>
      {entitlement.trialAvailable ? <>
        <SectionHelper size="small">Try full access for {TRIAL_DAYS} days. Payment details are required; Wix bills your selected Pro plan afterward unless canceled.</SectionHelper>
        <Button size="small" fullWidth onClick={openPricing}>Start free trial</Button>
      </> : null}
      <Button size="small" fullWidth priority={entitlement.trialAvailable ? 'secondary' : 'primary'} onClick={openPricing}>Upgrade to Pro</Button>
  </Box>;
};
