import { app } from '@wix/astro/builders';
import myPage from './extensions/dashboard/pages/my-page/my-page.extension.ts';

import faqWidget from './extensions/site/widgets/faq-widget/faq-widget.extension.ts';

import dataCollections from './extensions/backend/data-collections/data-collections.extension.ts';

import faqTools from './extensions/backend/app-tools/faq-tools/faq-tools.extension.ts';

import faqToolsProvider from './extensions/backend/service-plugins/faq-tools-provider/faq-tools-provider.extension.ts';

export default app()
  .use(myPage).use(faqWidget).use(dataCollections).use(faqTools).use(faqToolsProvider);
