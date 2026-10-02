import { useFAQEntitlement } from '@/lib/use-faq-entitlement';
import { PRO_MONTHLY_USD, PRO_YEARLY_USD, TRIAL_DAYS } from '@/lib/faq-pricing';

export const PricingPanel = () => {
  const { entitlement, loading, error } = useFAQEntitlement();
  if (loading || error || !entitlement || entitlement.canUseLive) return null;
  return <section className="pricing-panel panel" aria-label="FAQ subscription">
    <div className="pricing-copy" aria-live="polite">
      <h2>Basic · Free</h2>
        <p>Basic lets you configure and test every feature in Editor/Preview. Live FAQs require Pro.</p>
        <p><strong>Pro: ${PRO_MONTHLY_USD}/month or ${PRO_YEARLY_USD}/year USD.</strong> Full access to live widgets, every style, and all customization.</p>
        {entitlement.trialAvailable ? <p>Try full access for {TRIAL_DAYS} days. Wix collects payment details and bills your selected Pro plan after the trial unless canceled.</p> : null}
    </div>
    <div className="pricing-actions">
        {entitlement.trialAvailable ? <a className="ui-button ui-button-default" href={entitlement.upgradeUrl} target="_blank" rel="noopener noreferrer">Start free trial</a> : null}
        <a className={`ui-button ui-button-${entitlement.trialAvailable ? 'outline' : 'default'}`} href={entitlement.upgradeUrl} target="_blank" rel="noopener noreferrer">Upgrade to Pro</a>
    </div>
  </section>;
};
