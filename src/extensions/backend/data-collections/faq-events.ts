import type { DataCollection } from '@wix/astro/builders'

export const collectionIdSuffix = 'faq-events';

// Visitor interactions recorded by the FAQ widget (question opens, helpful votes, searches).
// Written only by the /api/faq-analytics endpoint (elevated, after validation); read by site editors.
export default {
  idSuffix: collectionIdSuffix,
  displayName: 'FAQ Events',
  fields: [
    { type: 'TEXT', displayName: 'Title', key: 'title' },
    { type: 'TEXT', displayName: 'Event Type', key: 'type' },
    { type: 'TEXT', displayName: 'Group ID', key: 'groupId' },
    { type: 'TEXT', displayName: 'Item ID', key: 'itemId' },
    { type: 'TEXT', displayName: 'Search Query', key: 'query' },
    { type: 'NUMBER', displayName: 'Result Count', key: 'resultCount' },
  ],
  displayField: 'title',
  dataPermissions: {
    itemInsert: 'PRIVILEGED',
    itemRead: 'CMS_EDITOR',
    itemRemove: 'PRIVILEGED',
    itemUpdate: 'PRIVILEGED',
  },
  indexes: [],
  initialData: [],
} satisfies DataCollection;
