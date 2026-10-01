import { Button } from '@/components/ui/button';
import { useFAQEntitlement } from '@/lib/use-faq-entitlement';
import { PRO_MONTHLY_USD, PRO_YEARLY_USD, TRIAL_DAYS } from '@/lib/faq-pricing';

export const PricingPanel = () => {
  const { entitlement, loading, error, refresh } = useFAQEntitlement();
  const title = entitlement?.plan === 'trial' ? 'Pro trial' : entitlement?.plan === 'pro' ? 'Pro' : entitlement ? 'Basic · Free' : 'Your plan';
  return <section className="pricing-panel panel" aria-label="FAQ subscription" aria-busy={loading}>
    <div className="pricing-copy" aria-live="polite">
      <h2>{title}</h2>
      {loading ? <p>Checking your plan…</p> : error ? <p role="alert">{error}</p> : entitlement?.plan === 'basic' ? <>
        <p>Basic lets you configure and test every feature in Editor/Preview. Live FAQs require Pro.</p>
        <p><strong>Pro: ${PRO_MONTHLY_USD}/month or ${PRO_YEARLY_USD}/year USD.</strong> Full access to live widgets, every style, and all customization.</p>
        {entitlement.trialAvailable ? <p>Try full access for {TRIAL_DAYS} days. Wix collects payment details and bills your selected Pro plan after the trial unless canceled.</p> : null}
      </> : entitlement?.plan === 'trial' ? <>
        <p>All Pro features and live widgets are unlocked{entitlement.trialEndDate ? ` until ${new Date(entitlement.trialEndDate).toLocaleString()}` : ' during your trial'}.</p>
        <p>Wix bills your selected Pro subscription after the trial unless canceled through Wix.</p>
      </> : <p>All features and live widgets are unlocked.</p>}
    </div>
    <div className="pricing-actions">
      {!loading && entitlement?.plan === 'basic' ? <>
        {entitlement.trialAvailable ? <a className="ui-button ui-button-default" href={entitlement.upgradeUrl} target="_blank" rel="noopener noreferrer">Start free trial</a> : null}
        <a className={`ui-button ui-button-${entitlement.trialAvailable ? 'outline' : 'default'}`} href={entitlement.upgradeUrl} target="_blank" rel="noopener noreferrer">Upgrade to Pro</a>
      </> : null}
      <Button variant="ghost" disabled={loading} onClick={() => void refresh()}>Refresh status</Button>
    </div>
  </section>;
};
