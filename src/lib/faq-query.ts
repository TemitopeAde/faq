import { items } from '@wix/data';

// Resolve the fluent overload before inferring its return type.
const fluentQuery = (collectionId: string) => items.query(collectionId);
type Query = ReturnType<typeof fluentQuery>;

export const allQueryItems = async (query: Query) => {
  let page = await query.limit(1000).find();
  const result = [...page.items];
  while (page.hasNext()) {
    page = await page.next();
    result.push(...page.items);
  }
  return result;
};
