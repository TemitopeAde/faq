import { Box, Button, SectionHelper } from '@wix/design-system';
import { useFAQEntitlement } from '../../../../lib/use-faq-entitlement';
import { PRO_MONTHLY_USD, PRO_YEARLY_USD, TRIAL_DAYS } from '../../../../lib/faq-pricing';
import { t } from '../../../../lib/dashboard-i18n';

export const PricingStatus = () => {
  const { entitlement, loading, error } = useFAQEntitlement();
  if (loading || error || !entitlement || entitlement.canUseLive) return null;
  const openPricing = () => { if (entitlement) window.open(entitlement.upgradeUrl, '_blank', 'noopener,noreferrer'); };
  return <Box direction="vertical" gap="SP2" padding="SP3">
    <SectionHelper title={t('pricing.basicTitle')} skin="standard">
      <span>{t('pricing.panelBody', { monthly: PRO_MONTHLY_USD, yearly: PRO_YEARLY_USD })}</span>
    </SectionHelper>
      {entitlement.trialAvailable ? <>
        <SectionHelper size="small">{t('pricing.panelTrial', { days: TRIAL_DAYS })}</SectionHelper>
        <Button size="small" fullWidth onClick={openPricing}>{t('pricing.startTrial')}</Button>
      </> : null}
      <Button size="small" fullWidth priority={entitlement.trialAvailable ? 'secondary' : 'primary'} onClick={openPricing}>{t('pricing.upgrade')}</Button>
  </Box>;
};
