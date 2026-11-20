import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { REVIEW_URL, type FAQEntitlement } from '@/lib/faq-pricing';
import { t } from '@/lib/dashboard-i18n';

const REVIEW_PROMPT_KEY = 'faq-review-prompt-shown:v1';
const REVIEW_PROMPT_DELAY_MS = 4000;

// Treat unreadable storage as "already shown" so the prompt can never repeat.
const wasShown = () => { try { return window.localStorage.getItem(REVIEW_PROMPT_KEY) !== null; } catch { return true; } };
const markShown = () => { try { window.localStorage.setItem(REVIEW_PROMPT_KEY, new Date().toISOString()); } catch { /* ignore */ } };

export const ReviewPromptDialog = ({ entitlement }: { entitlement: FAQEntitlement | null }) => {
  const [open, setOpen] = useState(false);
  const eligible = entitlement?.canUseLive === true;
  useEffect(() => {
    if (!eligible || wasShown()) return;
    const timer = window.setTimeout(() => { if (wasShown()) return; markShown(); setOpen(true); }, REVIEW_PROMPT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [eligible]);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="dialog-small">
      <DialogHeader><DialogTitle>{t('review.title')}</DialogTitle><DialogDescription>{t('review.body')}</DialogDescription></DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>{t('review.later')}</Button>
        <a className="ui-button ui-button-default" href={REVIEW_URL} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>{t('review.write')}</a>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
};
