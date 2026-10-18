import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import type { FAQEventType } from '../../../../lib/faq-types';
import styles from './faq-harmony.module.css';

type Props = {
  itemId: string;
  className?: string;
  disabled: boolean;
  track: (type: FAQEventType, details: { itemId?: string }) => void;
};

export function FAQFeedback({ itemId, className, disabled, track }: Props) {
  const [voted, setVoted] = useState(false);
  useEffect(() => {
    try { setVoted(Boolean(sessionStorage.getItem(`faq-vote-${itemId}`))); } catch { /* Storage is optional. */ }
  }, [itemId]);
  const vote = (type: 'helpful' | 'not-helpful') => {
    if (voted || disabled) return;
    setVoted(true);
    try { sessionStorage.setItem(`faq-vote-${itemId}`, type); } catch { /* Storage is optional. */ }
    track(type, { itemId });
  };
  return (
    <div className={styles.feedback}>
      {voted ? <output>Thanks for your feedback!</output> : <>
        <span>Was this helpful?</span>
        <button disabled={disabled} type="button" className={classNames('faq-harmony-feedback', styles.vote, className)} onClick={() => vote('helpful')}>Yes</button>
        <button disabled={disabled} type="button" className={classNames('faq-harmony-feedback', styles.vote, className)} onClick={() => vote('not-helpful')}>No</button>
      </>}
    </div>
  );
}
