import { extensions } from '@wix/astro/builders'

import faqGroupsCollection from './faq-groups';

import faqItemsCollection from './faq-items';

export default extensions.dataCollections({
  id: '016890e1-fbac-4c17-85dc-c26727e57b75',
  name: 'Data Collections',
  collections: [faqGroupsCollection, faqItemsCollection],
});
