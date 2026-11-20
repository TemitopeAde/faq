import { app } from '@wix/astro/builders';
import myPage from './extensions/dashboard/pages/my-page/my-page.extension.ts';

import faqWidget from './extensions/site/widgets/faq-widget/faq-widget.extension.ts';

import dataCollections from './extensions/backend/data-collections/data-collections.extension.ts';

import faqTools from './extensions/backend/app-tools/faq-tools/faq-tools.extension.ts';

import faqToolsProvider from './extensions/backend/service-plugins/faq-tools-provider/faq-tools-provider.extension.ts';

import appInstalled from './extensions/backend/events/app-installed/app-installed.extension.ts';

import paidPlanPurchased from './extensions/backend/events/paid-plan-purchased/paid-plan-purchased.extension.ts';

import paidPlanChanged from './extensions/backend/events/paid-plan-changed/paid-plan-changed.extension.ts';

import appRemoved from './extensions/backend/events/app-removed/app-removed.extension.ts';

import paidPlanAutoRenewalCancelled from './extensions/backend/events/paid-plan-auto-renewal-cancelled/paid-plan-auto-renewal-cancelled.extension.ts';

import planConvertedToPaid from './extensions/backend/events/plan-converted-to-paid/plan-converted-to-paid.extension.ts';

import planReactivated from './extensions/backend/events/plan-reactivated/plan-reactivated.extension.ts';

import planTransferred from './extensions/backend/events/plan-transferred/plan-transferred.extension.ts';

import faqHarmony from './extensions/site/components/faq-harmony/faq-harmony.extension.ts';
import faqHarmonyPanel from './extensions/site/components/faq-harmony/faq-harmony.panel.extension.ts';

export default app()
  .use(myPage).use(faqWidget).use(dataCollections).use(faqTools).use(faqToolsProvider).use(appInstalled).use(paidPlanPurchased).use(paidPlanChanged).use(appRemoved).use(paidPlanAutoRenewalCancelled).use(planConvertedToPaid).use(planReactivated).use(planTransferred).use(faqHarmony).use(faqHarmonyPanel);
