import type { DataCollection } from '@wix/astro/builders'

export const collectionIdSuffix = 'faq-items';

export default {
  idSuffix: collectionIdSuffix,
  displayName: 'FAQ Items',
  fields: [
    {
      type: 'TEXT',
      displayName: 'Group ID',
      key: 'groupId',
    },
    {
      type: 'TEXT',
      displayName: 'Question',
      key: 'question',
    },
    {
      type: 'RICH_TEXT',
      displayName: 'Answer',
      key: 'answer',
    },
    { type: 'TEXT', displayName: 'Category', key: 'category' },
    { type: 'NUMBER', displayName: 'Sort Order', key: 'sortOrder' },
    { type: 'BOOLEAN', displayName: 'Published', key: 'published' },
    { type: 'TEXT', displayName: 'Title', key: 'title' },
  ],
  displayField: 'title',
  dataPermissions: {
    itemInsert: 'CMS_EDITOR',
    itemRead: 'ANYONE',
    itemRemove: 'CMS_EDITOR',
    itemUpdate: 'CMS_EDITOR',
  },
  indexes: [],
  initialData: [],
} satisfies DataCollection;
