import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import type { FAQEventType } from '../../../../lib/faq-types';
import styles from './faq-harmony.module.css';

type Props = {
  itemId: string;
  className?: string;
  preview: boolean;
  prompt: string;
  yesLabel: string;
  noLabel: string;
  thanksLabel: string;
  track: (type: FAQEventType, details: { itemId?: string }) => void;
};

export function FAQFeedback({ itemId, className, preview, prompt, yesLabel, noLabel, thanksLabel, track }: Props) {
  const [voted, setVoted] = useState(false);
  useEffect(() => {
    if (preview) {
      setVoted(false);
      return;
    }
    try { setVoted(Boolean(sessionStorage.getItem(`faq-vote-${itemId}`))); } catch { /* Storage is optional. */ }
  }, [itemId, preview]);
  const vote = (type: 'helpful' | 'not-helpful') => {
    if (voted) return;
    setVoted(true);
    if (!preview) {
      try { sessionStorage.setItem(`faq-vote-${itemId}`, type); } catch { /* Storage is optional. */ }
    }
    track(type, { itemId });
  };
  return (
    <div className={styles.feedback}>
      {voted ? <output>{thanksLabel}</output> : <>
        <span>{prompt}</span>
        <button type="button" className={classNames('faq-harmony-feedback', styles.vote, className)} onClick={() => vote('helpful')}>{yesLabel}</button>
        <button type="button" className={classNames('faq-harmony-feedback', styles.vote, className)} onClick={() => vote('not-helpful')}>{noLabel}</button>
      </>}
    </div>
  );
}
