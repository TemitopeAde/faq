import { extensions } from '@wix/astro/builders'
import { faqToolDefinitions } from '../../../../lib/faq-tools-contracts';

export default extensions.appTools({
  id: '79b301b3-5400-4a0f-b59b-6c49ee10b686',
  name: 'faq-tools',
  tools: faqToolDefinitions,
});
