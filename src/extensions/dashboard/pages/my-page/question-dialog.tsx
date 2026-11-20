import { useCallback, useEffect, useRef, useState } from 'react';
import { items } from '@wix/data';
import { dashboard } from '@wix/dashboard';
import ReactQuill from 'react-quill';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { InfoTip, Tooltip } from '@/components/ui/tooltip';
import { FAQ_ITEMS } from '@/lib/faq-data';
import { SUPPORTED_LANGUAGES } from '@/lib/faq-i18n';
import { displayLanguage, t } from '@/lib/dashboard-i18n';
import type { FAQItem } from '@/lib/faq-types';

const NEW_CATEGORY = '__new__';
const quillFormats = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'blockquote', 'link', 'image', 'video'];

type QuestionDialogProps = {
  open: boolean;
  groupId: string;
  item: FAQItem | null;
  categories: Array<string>;
  defaultLanguage?: string;
  nextSortOrder: number;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
};

export const QuestionDialog = ({ open, groupId, item, categories, defaultLanguage = '', nextSortOrder, onOpenChange, onSaved }: QuestionDialogProps) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [newCategory, setNewCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const quillRef = useRef<ReactQuill>(null);

  useEffect(() => {
    if (!open) return;
    setQuestion(item?.question ?? ''); setAnswer(item?.answer ?? ''); setCategory(item?.category ?? '');
    setLanguage(item?.language ?? defaultLanguage ?? '');
    setNewCategory(false);
  }, [open, item, defaultLanguage]);

  const openMediaManager = useCallback(async () => { try { const result = await dashboard.openMediaManager({ category: 'IMAGE', multiSelect: false }); const url = result?.items[0]?.url; if (!url) return; const editor = quillRef.current?.getEditor(); if (!editor) return; const selection = editor.getSelection(true); const index = selection?.index ?? editor.getLength(); editor.insertEmbed(index, 'image', url, 'user'); editor.setSelection(index + 1, 0, 'user'); } catch (error) { console.error('Failed to select image from Wix Media Manager:', error); toast.error(t('question.imageError')); } }, []);
  const [quillModules] = useState(() => ({ toolbar: { container: [[{ header: [2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image', 'video'], ['clean']], handlers: { image: () => void openMediaManager() } } }));

  const save = async () => {
    const hasAnswer = Boolean(answer.replace(/<[^>]*>/g, '').trim()) || /<(img|iframe)/i.test(answer);
    if (!question.trim() || !hasAnswer) { toast.error(t('question.missingFields')); return; }
    setSaving(true);
    try {
      const fields = { question: question.trim(), title: question.trim(), answer: answer.trim(), category: category.trim(), language: language.trim().toLowerCase() };
      if (item?._id) await items.update(FAQ_ITEMS, { ...item, ...fields, _id: item._id });
      else await items.insert(FAQ_ITEMS, { ...fields, groupId, sortOrder: nextSortOrder, published: true });
      toast.success(item ? t('question.updated') : t('question.added'));
      await onSaved();
      onOpenChange(false);
    } catch (error) { console.error('Failed to save FAQ item:', error); toast.error(t('question.saveError')); } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="dialog-large" onInteractOutside={(event) => event.preventDefault()}>
      <DialogHeader><DialogTitle>{item ? t('question.editTitle') : t('question.addTitle')}</DialogTitle><DialogDescription>{t('question.description')}</DialogDescription></DialogHeader>
      <div className="form-stack">
        <label className="field"><span className="field-label">{t('question.question')}</span><Input autoFocus placeholder={t('question.questionPlaceholder')} value={question} onChange={(event) => setQuestion(event.target.value)} /></label>
        <div className="field">
          <span className="field-label"><label htmlFor="question-category">{t('question.category')}</label> <span className="field-optional">{t('common.optional')}</span><InfoTip content={t('question.categoryInfo')} /></span>
          {newCategory
            ? <div className="category-new"><Input autoFocus aria-label={t('question.newCategoryName')} placeholder={t('question.newCategoryName')} value={category} onChange={(event) => setCategory(event.target.value)} /><Tooltip content={t('question.chooseCategory')}><button type="button" className="icon-button" aria-label={t('question.chooseCategory')} onClick={() => { setNewCategory(false); setCategory(''); }}><X size={15} /></button></Tooltip></div>
            : <select id="question-category" className="dashboard-select" value={category} onChange={(event) => { if (event.target.value === NEW_CATEGORY) { setNewCategory(true); setCategory(''); } else setCategory(event.target.value); }}>
              <option value="">{t('question.noCategory')}</option>
              {categories.map((name) => <option key={name} value={name}>{name}</option>)}
              <option value={NEW_CATEGORY}>{t('question.newCategory')}</option>
            </select>}
        </div>
        <div className="field">
          <span className="field-label"><label htmlFor="question-language">{t('question.language')}</label> <span className="field-optional">{t('common.optional')}</span><InfoTip content={t('question.languageInfo')} /></span>
          <select id="question-language" className="dashboard-select" value={language} onChange={(event) => setLanguage(event.target.value)}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.code ? displayLanguage(lang.code) : t('common.allLanguagesDefault')}
              </option>
            ))}
          </select>
        </div>
        <div className="field answer-editor"><span className="field-label">{t('question.answer')}</span><ReactQuill ref={quillRef} theme="snow" value={answer} onChange={setAnswer} modules={quillModules} formats={quillFormats} placeholder={t('question.answerPlaceholder')} /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
        <Button loading={saving} onClick={() => void save()}>{item ? t('question.saveChanges') : t('detail.addQuestion')}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
};
