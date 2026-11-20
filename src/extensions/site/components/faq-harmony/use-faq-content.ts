import { useEffect, useState } from 'react';
import { fetchAllFAQContent } from '../../../../lib/faq-api';
import type { FAQSection } from '../../../../lib/faq-types';

type State = { preview: boolean; language?: string; sections: Array<FAQSection> | null; status: 'loading' | 'ready' | 'error' };

/**
 * Loads every FAQ group (one tab each). The active group is `groupId` when it exists, otherwise the group
 * matching the connection key, otherwise the first group. `content` is null when there are no groups or
 * the live plan does not allow FAQs.
 */
export function useFAQContent(key: string, preview: boolean, language?: string, groupId = '') {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ preview, language, sections: null, status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    setState({ preview, language, sections: null, status: 'loading' });
    void fetchAllFAQContent(preview, language).then(
      (result) => { if (!cancelled) setState({ preview, language, sections: result?.groups ?? null, status: 'ready' }); },
      (error: unknown) => {
        console.error('Failed to load Harmony FAQs:', error);
        if (!cancelled) setState({ preview, language, sections: null, status: 'error' });
      },
    );
    return () => { cancelled = true; };
  }, [preview, language, attempt]);
  const current = state.preview === preview && state.language === language;
  const sections = current ? state.sections ?? [] : [];
  const content = sections.find((section) => groupId && section.group._id === groupId)
    ?? sections.find((section) => key.trim() && section.group.connectionKey === key.trim()) ?? sections[0] ?? null;
  return {
    content,
    sections,
    status: current ? state.status : 'loading',
    retry: () => setAttempt((value) => value + 1),
  };
}
