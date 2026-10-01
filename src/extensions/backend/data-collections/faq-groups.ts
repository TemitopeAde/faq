import type { DataCollection } from '@wix/astro/builders'

export const collectionIdSuffix = 'faq-groups';

export default {
  idSuffix: collectionIdSuffix,
  displayName: 'FAQ Groups',
  fields: [
    {
      type: 'TEXT',
      displayName: 'Title',
      key: 'title',
    },
    {
      type: 'TEXT',
      displayName: 'Connection Key',
      key: 'connectionKey',
    },
    { type: 'TEXT', displayName: 'Description', key: 'description' },
    { type: 'BOOLEAN', displayName: 'Published', key: 'published' },
    { type: 'TEXT', displayName: 'Default Layout', key: 'defaultLayout' },
    { type: 'TEXT', displayName: 'Default Preset', key: 'defaultPreset' },
    { type: 'NUMBER', displayName: 'Widget Usage Count', key: 'usageCount' },
    {
      type: 'TEXT', displayName: 'Slug', key: 'slug',
    },
  ],
  displayField: 'title',
  dataPermissions: {
    itemInsert: 'CMS_EDITOR',
    itemRead: 'CMS_EDITOR',
    itemRemove: 'CMS_EDITOR',
    itemUpdate: 'CMS_EDITOR',
  },
  indexes: [],
  initialData: [
    {
      _id: 'starter-faq-group',
      title: 'Getting Started',
      connectionKey: 'getting-started',
      description: 'Common questions about setting up and customizing your FAQ widget.',
      published: true,
      defaultLayout: 'classic',
      defaultPreset: 'classic',
      usageCount: 0,
      slug: 'getting-started',
    },
  ],
} satisfies DataCollection;
