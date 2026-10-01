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
import type { FAQItem } from '@/lib/faq-types';

const NEW_CATEGORY = '__new__';
const quillFormats = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'blockquote', 'link', 'image', 'video'];

type QuestionDialogProps = {
  open: boolean;
  groupId: string;
  item: FAQItem | null;
  categories: Array<string>;
  nextSortOrder: number;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
};

export const QuestionDialog = ({ open, groupId, item, categories, nextSortOrder, onOpenChange, onSaved }: QuestionDialogProps) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const quillRef = useRef<ReactQuill>(null);

  useEffect(() => {
    if (!open) return;
    setQuestion(item?.question ?? ''); setAnswer(item?.answer ?? ''); setCategory(item?.category ?? ''); setNewCategory(false);
  }, [open, item]);

  const openMediaManager = useCallback(async () => { try { const result = await dashboard.openMediaManager({ category: 'IMAGE', multiSelect: false }); const url = result?.items[0]?.url; if (!url) return; const editor = quillRef.current?.getEditor(); if (!editor) return; const selection = editor.getSelection(true); const index = selection?.index ?? editor.getLength(); editor.insertEmbed(index, 'image', url, 'user'); editor.setSelection(index + 1, 0, 'user'); } catch (error) { console.error('Failed to select image from Wix Media Manager:', error); toast.error('Could not select an image'); } }, []);
  const [quillModules] = useState(() => ({ toolbar: { container: [[{ header: [2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image', 'video'], ['clean']], handlers: { image: () => void openMediaManager() } } }));

  const save = async () => {
    const hasAnswer = Boolean(answer.replace(/<[^>]*>/g, '').trim()) || /<(img|iframe)/i.test(answer);
    if (!question.trim() || !hasAnswer) { toast.error('Add both a question and an answer'); return; }
    setSaving(true);
    try {
      const fields = { question: question.trim(), title: question.trim(), answer: answer.trim(), category: category.trim() };
      if (item?._id) await items.update(FAQ_ITEMS, { ...item, ...fields, _id: item._id });
      else await items.insert(FAQ_ITEMS, { ...fields, groupId, sortOrder: nextSortOrder, published: true });
      toast.success(item ? 'Question updated' : 'Question added');
      await onSaved();
      onOpenChange(false);
    } catch (error) { console.error('Failed to save FAQ item:', error); toast.error('Could not save the question'); } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="dialog-large" onInteractOutside={(event) => event.preventDefault()}>
      <DialogHeader><DialogTitle>{item ? 'Edit question' : 'Add a question'}</DialogTitle><DialogDescription>Write it the way your visitors would ask it.</DialogDescription></DialogHeader>
      <div className="form-stack">
        <label className="field"><span className="field-label">Question</span><Input autoFocus placeholder="e.g. How long does shipping take?" value={question} onChange={(event) => setQuestion(event.target.value)} /></label>
        <div className="field">
          <span className="field-label"><label htmlFor="question-category">Category</label> <span className="field-optional">optional</span><InfoTip content="Categories become filter chips above your FAQ when a group uses two or more of them." /></span>
          {newCategory
            ? <div className="category-new"><Input autoFocus aria-label="New category name" placeholder="New category name" value={category} onChange={(event) => setCategory(event.target.value)} /><Tooltip content="Choose an existing category"><button type="button" className="icon-button" aria-label="Choose an existing category" onClick={() => { setNewCategory(false); setCategory(''); }}><X size={15} /></button></Tooltip></div>
            : <select id="question-category" className="dashboard-select" value={category} onChange={(event) => { if (event.target.value === NEW_CATEGORY) { setNewCategory(true); setCategory(''); } else setCategory(event.target.value); }}>
              <option value="">No category</option>
              {categories.map((name) => <option key={name} value={name}>{name}</option>)}
              <option value={NEW_CATEGORY}>＋ New category…</option>
            </select>}
        </div>
        <div className="field answer-editor"><span className="field-label">Answer</span><ReactQuill ref={quillRef} theme="snow" value={answer} onChange={setAnswer} modules={quillModules} formats={quillFormats} placeholder="Write the answer. You can add links, images and videos from the toolbar." /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button loading={saving} onClick={() => void save()}>{item ? 'Save changes' : 'Add question'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
};
