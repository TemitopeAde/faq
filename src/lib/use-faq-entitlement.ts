import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchFAQEntitlement } from './faq-api';
import type { FAQEntitlement } from './faq-pricing';

export const useFAQEntitlement = () => {
  const [entitlement, setEntitlement] = useState<FAQEntitlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    try {
      const next = await fetchFAQEntitlement();
      if (current !== generation.current) return;
      setEntitlement(next); setError(null);
    } catch (failure) {
      console.error('Failed to load FAQ entitlement:', failure);
      if (current !== generation.current) return;
      setEntitlement(null); setError('Could not check your plan. Refresh status to try again.');
    } finally { if (current === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(onVisible, 60_000);
    return () => { ++generation.current; window.clearInterval(timer); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVisible); };
  }, [refresh]);
  return { entitlement, loading, error, refresh };
};
