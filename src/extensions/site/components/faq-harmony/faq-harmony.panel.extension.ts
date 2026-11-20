import { extensions } from '@wix/astro/builders';
import panelUrl from './faq-harmony.panel.tsx?url';

export default extensions.editorReactComponentPanel({
  id: '39b9b5a2-5349-4198-9845-5ccbb592e4a2',
  displayName: 'FAQ settings',
  contentType: 'code',
  code: { bundleUrl: panelUrl },
  size: { width: 'MEDIUM', height: 620 },
});
