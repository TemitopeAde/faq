import { useEffect, useState } from 'react';
import { fetchFAQContent } from '../../../../lib/faq-api';

type Content = Awaited<ReturnType<typeof fetchFAQContent>>;
type State = { key: string; preview: boolean; content: Content; status: 'loading' | 'ready' | 'error' };

export function useFAQContent(key: string, preview: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ key, preview, content: null, status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    setState({ key, preview, content: null, status: 'loading' });
    if (!key.trim()) return () => { cancelled = true; };
    void fetchFAQContent(key.trim(), preview).then(
      (content) => { if (!cancelled) setState({ key, preview, content, status: 'ready' }); },
      (error: unknown) => {
        console.error('Failed to load Harmony FAQs:', error);
        if (!cancelled) setState({ key, preview, content: null, status: 'error' });
      },
    );
    return () => { cancelled = true; };
  }, [key, preview, attempt]);
  const current = state.key === key && state.preview === preview;
  return {
    content: current ? state.content : null,
    status: current ? state.status : 'loading',
    retry: () => setAttempt((value) => value + 1),
  };
}
