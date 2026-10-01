export type FAQItem = {
  _id?: string;
  groupId: string;
  question: string;
  answer: string;
  category?: string;
  sortOrder: number;
  published: boolean;
};

export type FAQGroup = {
  _id?: string;
  title: string;
  connectionKey: string;
  description?: string;
  published: boolean;
  defaultLayout: string;
  defaultPreset: string;
  usageCount?: number;
};

export type FontValue = { font: string; textDecoration: string };

export type FAQWidgetSettings = {
  connectionKey: string;
  layout: string;
  heading: string;
  description: string;
  backgroundColor: string;
  questionColor: string;
  answerColor: string;
  accentColor: string;
  borderColor: string;
  questionFont: FontValue;
  answerFont: FontValue;
  icon: 'plus' | 'chevron' | 'arrow' | 'minus' | 'caret' | 'circle-plus' | 'circle-chevron';
  iconColor: string;
  iconSize: number;
  radius: number;
  gap: number;
  initiallyOpen: boolean;
};

export type FAQEventType = 'open' | 'helpful' | 'not-helpful' | 'search';

export type FAQEvent = {
  _id?: string;
  _createdDate?: Date | string;
  type: FAQEventType;
  groupId: string;
  itemId?: string;
  query?: string;
  resultCount?: number;
};
