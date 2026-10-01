import type { FAQItem } from './faq-types';

export type CSVFAQRow = Pick<FAQItem, 'question' | 'answer' | 'category' | 'published'>;

const HEADERS = ['question', 'answer', 'category', 'published'] as const;

const escapeCell = (value: string): string => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export const toCSV = (faqItems: Array<FAQItem>): string =>
  [HEADERS.join(','), ...faqItems.map((item) => [item.question, item.answer, item.category ?? '', String(item.published)].map(escapeCell).join(','))].join('\r\n');

// RFC 4180 parser: handles quoted cells, escaped quotes and newlines inside quotes.
const parseRows = (text: string): Array<Array<string>> => {
  const rows: Array<Array<string>> = [];
  let row: Array<string> = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((cells) => cells.some((value) => value.trim()));
};

const toHtml = (answer: string): string => (/<[a-z][\s\S]*>/i.test(answer) ? answer : answer.split(/\n{2,}/).map((paragraph) => `<p>${paragraph.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`).join(''));

// Accepts any column order as long as there is a header row with "question" and "answer".
export const parseCSV = (text: string): Array<CSVFAQRow> => {
  const [header, ...rows] = parseRows(text.replace(/^﻿/, ''));
  if (!header) throw new Error('The file is empty.');
  const columns = header.map((name) => name.trim().toLowerCase());
  const questionIndex = columns.indexOf('question');
  const answerIndex = columns.indexOf('answer');
  if (questionIndex < 0 || answerIndex < 0) throw new Error('The first row must include "question" and "answer" columns.');
  const categoryIndex = columns.indexOf('category');
  const publishedIndex = columns.indexOf('published');
  return rows
    .filter((cells) => (cells[questionIndex] ?? '').trim() && (cells[answerIndex] ?? '').trim())
    .map((cells) => ({
      question: (cells[questionIndex] ?? '').trim(),
      answer: toHtml((cells[answerIndex] ?? '').trim()),
      category: categoryIndex >= 0 ? (cells[categoryIndex] ?? '').trim() : '',
      published: publishedIndex >= 0 ? !/^(false|no|0|draft)$/i.test((cells[publishedIndex] ?? '').trim()) : true,
    }));
};
