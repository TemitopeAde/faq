import { PRO_MONTHLY_USD, PRO_YEARLY_USD, TRIAL_DAYS, type FAQEntitlement } from '@/lib/faq-pricing';
import { t } from '@/lib/dashboard-i18n';

type PricingPanelProps = { entitlement: FAQEntitlement | null; loading: boolean; error: string | null };

export const PricingPanel = ({ entitlement, loading, error }: PricingPanelProps) => {
  if (loading || error || !entitlement || entitlement.canUseLive) return null;
  return <section className="pricing-panel panel" aria-label={t('pricing.label')}>
    <div className="pricing-copy" aria-live="polite">
      <h2>{t('pricing.basicTitle')}</h2>
        <p>{t('pricing.basicBody')}</p>
        <p><strong>{t('pricing.proPrice', { monthly: PRO_MONTHLY_USD, yearly: PRO_YEARLY_USD })}</strong> {t('pricing.proBody')}</p>
        {entitlement.trialAvailable ? <p>{t('pricing.trialBody', { days: TRIAL_DAYS })}</p> : null}
    </div>
    <div className="pricing-actions">
        {entitlement.trialAvailable ? <a className="ui-button ui-button-default" href={entitlement.upgradeUrl} target="_blank" rel="noopener noreferrer">{t('pricing.startTrial')}</a> : null}
        <a className={`ui-button ui-button-${entitlement.trialAvailable ? 'outline' : 'default'}`} href={entitlement.upgradeUrl} target="_blank" rel="noopener noreferrer">{t('pricing.upgrade')}</a>
    </div>
  </section>;
};
