const text = (description: string) => ({ type: 'string', description });
const published = { type: 'boolean', description: 'Whether this content is published. A question is visible only when its group is also published.' };
const pagination = {
  search: text('Case-insensitive text search in group titles or question text.'),
  published,
  limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
  offset: { type: 'integer', minimum: 0, default: 0 },
};
const groupFields = { title: text('Group name, required when creating a group.'), description: text('Optional introductory text; an empty string clears it.'), published };
const questionFields = {
  question: text('The question text.'),
  answer: text('The answer as rich-text HTML, including supported links, images or video embeds.'),
  category: text('Optional category; an empty string clears it.'),
  published,
};
const groupProperties = {
  _id: text('Group ID used by update and question tools.'), ...groupFields,
  connectionKey: text('Stable key connecting this group to widgets.'),
  defaultLayout: text('Default layout.'), defaultPreset: text('Default style preset.'),
};
const questionProperties = {
  _id: text('Question ID used by update tools.'), groupId: text('Parent group ID.'),
  ...questionFields, sortOrder: { type: 'number' },
};
const group = { type: 'object', properties: groupProperties };
const item = { type: 'object', properties: questionProperties };
const page = (record: typeof group | typeof item) => ({
  type: 'object', properties: {
    items: { type: 'array', items: record }, totalCount: { type: 'integer' },
    offset: { type: 'integer' }, limit: { type: 'integer' },
    nextOffset: { type: ['integer', 'null'] },
  },
});
const request = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object', properties, required, additionalProperties: false,
});

export const faqToolDefinitions = [
  {
    methodName: 'list-faq-groups', displayName: 'Find FAQ groups',
    description: 'Lists FAQ groups, including drafts, with IDs, titles, content and widget connection keys. Use to find a group before editing or publishing it. Supports text search, publication filtering and pagination; pass nextOffset as offset to continue.',
    requestSchema: request(pagination), responseSchema: page(group), activated: true,
  },
  {
    methodName: 'list-faq-questions', displayName: 'Find FAQ questions',
    description: 'Lists questions and rich-text answers in a specified FAQ group, including drafts, in display order. Use to inspect content or find question IDs before editing or publishing. Requires groupId; supports text search, publication filtering and pagination.',
    requestSchema: request({ groupId: text('Existing group ID from list-faq-groups.'), ...pagination }, ['groupId']),
    responseSchema: page(item), activated: true,
  },
  {
    methodName: 'create-faq-group', displayName: 'Create FAQ group',
    description: 'Creates an FAQ group with a stable widget connection key and classic styling. Requires title and accepts introductory description. New groups are unpublished by default; set published only when the user asks to publish. Returns the created group and its ID.',
    requestSchema: request(groupFields, ['title']), responseSchema: { type: 'object', properties: { group } }, activated: true,
  },
  {
    methodName: 'update-faq-group', displayName: 'Edit or publish FAQ group',
    description: 'Edits a group title or introduction, or publishes/unpublishes the group. Requires an explicit groupId and at least one changed field; find IDs with list-faq-groups. Preserves widget connections. Unpublishing hides all questions in this group; publishing exposes its published questions.',
    requestSchema: request({ groupId: text('Existing group ID.'), ...groupFields }, ['groupId']),
    responseSchema: { type: 'object', properties: { group } }, activated: true,
  },
  {
    methodName: 'create-faq-question', displayName: 'Add FAQ question',
    description: 'Adds a question and rich-text HTML answer to an existing FAQ group, appended in display order. Requires groupId, question and answer; accepts category and published. Questions default to published and appear on the site if their group is published; set published false to create a draft.',
    requestSchema: request({ groupId: text('Existing group ID.'), ...questionFields }, ['groupId', 'question', 'answer']),
    responseSchema: { type: 'object', properties: { item } }, activated: true,
  },
  {
    methodName: 'update-faq-question', displayName: 'Edit or publish FAQ question',
    description: 'Edits question text, rich-text HTML answer or category, or publishes/unpublishes a question. Requires an explicit questionId and at least one changed field; find IDs with list-faq-questions. Preserves group and display order. Published questions are visible only when their group is published.',
    requestSchema: request({ questionId: text('Existing question ID.'), ...questionFields }, ['questionId']),
    responseSchema: { type: 'object', properties: { item } }, activated: true,
  },
];
