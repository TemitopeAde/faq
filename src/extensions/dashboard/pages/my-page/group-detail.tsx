import { useCallback, useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { items } from '@wix/data';
import { ArrowLeft, Download, Eye, EyeOff, GripVertical, Link2, MousePointerClick, Pencil, Plus, Settings, ThumbsDown, ThumbsUp, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InfoTip, Tooltip } from '@/components/ui/tooltip';
import type { ItemStats } from '@/lib/faq-analytics';
import { fetchFAQAnalytics } from '@/lib/faq-api';
import { parseCSV, toCSV } from '@/lib/faq-csv';
import { FAQ_ITEMS, GROUPS, categoriesOf, itemAnchors } from '@/lib/faq-data';
import type { FAQGroup, FAQItem } from '@/lib/faq-types';
import { ConfirmDialog } from './confirm-dialog';
import { GroupSettingsDialog } from './group-settings-dialog';
import { QuestionDialog } from './question-dialog';
import { allQueryItems } from '@/lib/faq-query';

const emptyStats: ItemStats = { opens: 0, helpful: 0, notHelpful: 0 };
const CSV_HELP = 'Upload a spreadsheet saved as CSV. The first row needs "question" and "answer" columns; "category" and "published" are optional.';

const downloadFile = (name: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(link); link.click(); link.remove();
  URL.revokeObjectURL(url);
};

type GroupDetailProps = { group: FAQGroup; onBack: () => void; onGroupChanged: () => Promise<void> };

export const GroupDetail = ({ group, onBack, onGroupChanged }: GroupDetailProps) => {
  const [groupItems, setGroupItems] = useState<Array<FAQItem>>([]);
  const [stats, setStats] = useState<Record<string, ItemStats>>({});
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [editing, setEditing] = useState<FAQItem | null>(null);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<FAQItem | null>(null);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOrder, setDragOrder] = useState<Array<FAQItem> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadItems = useCallback(async () => {
    if (!group._id) return;
    try {
      const result = await allQueryItems(items.query(FAQ_ITEMS).eq('groupId', group._id).ascending('sortOrder'));
      setGroupItems(result as unknown as Array<FAQItem>);
    } catch (error) { console.error('Failed to load FAQ items:', error); toast.error('Could not load questions'); } finally { setLoading(false); }
  }, [group._id]);

  useEffect(() => {
    setLoading(true); void loadItems();
    if (group._id) void fetchFAQAnalytics({ groupId: group._id, range: 'all' }).then((result) => setStats(result.summary.byItem)).catch((error: unknown) => console.error('Failed to load FAQ stats:', error));
  }, [group._id, loadItems]);

  const refresh = async () => { await loadItems(); await onGroupChanged(); };
  const openQuestion = (item: FAQItem | null) => { setEditing(item); setQuestionOpen(true); };

  const togglePublishedGroup = async () => {
    if (!group._id) return;
    setPublishing(true);
    try { await items.update(GROUPS, { ...group, _id: group._id, published: !group.published }); toast.success(group.published ? 'Group unpublished' : 'Group published', { description: group.published ? 'It no longer appears on your live site.' : 'Live display requires Pro or an active trial.' }); await onGroupChanged(); }
    catch (error) { console.error('Failed to update FAQ group:', error); toast.error('Could not update the group'); } finally { setPublishing(false); }
  };

  const toggleItemPublished = async (item: FAQItem) => {
    if (!item._id) return;
    try { await items.update(FAQ_ITEMS, { ...item, _id: item._id, published: !item.published }); setGroupItems((current) => current.map((other) => (other._id === item._id ? { ...other, published: !item.published } : other))); toast.success(item.published ? 'Question hidden from your site' : 'Question visible on your site'); }
    catch (error) { console.error('Failed to update FAQ item:', error); toast.error('Could not update the question'); }
  };

  const deleteItem = async () => {
    if (!deletingItem?._id) return;
    try { await items.remove(FAQ_ITEMS, deletingItem._id); toast.success('Question deleted'); await refresh(); }
    catch (error) { console.error('Failed to delete FAQ item:', error); toast.error('Could not delete the question'); }
  };

  const deleteGroup = async () => {
    if (!group._id) return;
    try {
      const ids = groupItems.map((item) => item._id).filter((id): id is string => Boolean(id));
      if (ids.length) await items.bulkRemove(FAQ_ITEMS, ids);
      await items.remove(GROUPS, group._id);
      toast.success(`"${group.title}" deleted`);
      setSettingsOpen(false);
      await onGroupChanged();
      onBack();
    } catch (error) { console.error('Failed to delete FAQ group:', error); toast.error('Could not delete the group'); }
  };

  // Persists the current order, writing only the items whose position changed.
  const saveOrder = async (ordered: Array<FAQItem>) => {
    const changed = ordered.map((item, index) => ({ ...item, sortOrder: index })).filter((item, index) => groupItems.find((other) => other._id === item._id)?.sortOrder !== index);
    setGroupItems(ordered.map((item, index) => ({ ...item, sortOrder: index })));
    if (!changed.length) return;
    try { await items.bulkUpdate(FAQ_ITEMS, changed as Array<FAQItem & { _id: string }>); toast.success('New order saved'); }
    catch (error) { console.error('Failed to save FAQ order:', error); toast.error('Could not save the new order'); await loadItems(); }
  };
  const rows = dragOrder ?? groupItems;
  const onDragOver = (event: DragEvent, index: number) => {
    event.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const next = [...rows]; const [moved] = next.splice(dragIndex, 1); next.splice(index, 0, moved);
    setDragOrder(next); setDragIndex(index);
  };
  const onDragEnd = () => { if (dragOrder) void saveOrder(dragOrder); setDragOrder(null); setDragIndex(null); };
  const onHandleKey = (event: KeyboardEvent, index: number) => {
    const to = event.key === 'ArrowUp' ? index - 1 : event.key === 'ArrowDown' ? index + 1 : -1;
    if (to < 0 || to >= rows.length) return;
    event.preventDefault();
    const next = [...rows]; const [moved] = next.splice(index, 1); next.splice(to, 0, moved);
    void saveOrder(next);
  };

  const published = groupItems.filter((item) => item.published);
  const anchors = itemAnchors(published);
  const copyLink = async (item: FAQItem) => {
    const anchor = anchors[published.findIndex((other) => other._id === item._id)];
    if (!anchor) { toast.error('Show this question on your site first to link to it'); return; }
    const description = 'Paste it at the end of the address of the page that shows your FAQ.';
    try { await navigator.clipboard.writeText(`#${anchor}`); toast.success(`Copied #${anchor}`, { description }); }
    catch { toast.info(`Link: #${anchor}`, { description, duration: 10000 }); }
  };

  const exportCSV = () => downloadFile(`${group.connectionKey || 'faqs'}.csv`, `﻿${toCSV(groupItems)}`, 'text/csv;charset=utf-8');
  const importCSV = async (file: File) => {
    if (!group._id) return;
    setImporting(true);
    try {
      const parsed = parseCSV(await file.text());
      if (!parsed.length) { toast.error('No questions found', { description: 'Each row needs a question and an answer.' }); return; }
      await items.bulkInsert(FAQ_ITEMS, parsed.map((row, index) => ({ ...row, title: row.question, groupId: group._id, sortOrder: groupItems.length + index })));
      toast.success(`Imported ${parsed.length} question${parsed.length === 1 ? '' : 's'}`);
      await refresh();
    } catch (error) { console.error('Failed to import FAQ CSV:', error); toast.error('Could not import the file', { description: error instanceof Error ? error.message : undefined }); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return <section className="detail">
    <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCSV(file); }} />
    <button type="button" className="back-link" onClick={onBack}><ArrowLeft size={16} />All FAQ groups</button>

    <header className="detail-header">
      <div className="detail-title">
        <h2>{group.title}</h2>
        <div className="detail-meta">
          <Badge className={group.published ? 'badge-live' : 'badge-draft'}>{group.published ? 'Live' : 'Draft'}</Badge>
          <span>{groupItems.length} question{groupItems.length === 1 ? '' : 's'}</span>
          <InfoTip content={group.published ? 'Live: visible questions appear on your published site.' : 'Draft: questions only show in the Wix Editor preview. Publish the group to show them on your live site.'} />
        </div>
      </div>
      <div className="detail-actions">
        <Tooltip content="Rename, edit intro text or delete this group"><Button variant="ghost" size="sm" aria-label="Group settings" onClick={() => setSettingsOpen(true)}><Settings size={16} />Settings</Button></Tooltip>
        <Button variant="outline" loading={publishing} onClick={() => void togglePublishedGroup()}>{group.published ? 'Unpublish' : 'Publish'}</Button>
        <Button onClick={() => openQuestion(null)}><Plus size={16} />Add question</Button>
      </div>
    </header>

    {loading ? <div className="panel empty-state"><p>Loading questions…</p></div> : rows.length === 0 ? <div className="panel empty-state">
      <h3>No questions yet</h3>
      <p>Add your first question, or import a list you already have.</p>
      <div className="empty-actions"><Button onClick={() => openQuestion(null)}><Plus size={16} />Add question</Button><Tooltip content={CSV_HELP}><Button variant="outline" loading={importing} onClick={() => fileRef.current?.click()}><Upload size={16} />Import CSV</Button></Tooltip></div>
    </div> : <div className="panel">
      <div className="panel-toolbar">
        <span className="panel-hint">Drag <GripVertical size={14} aria-hidden="true" /> to reorder. Click a question to edit it.</span>
        <div className="toolbar-actions">
          <Tooltip content={CSV_HELP}><Button variant="ghost" size="sm" loading={importing} onClick={() => fileRef.current?.click()}><Upload size={15} />Import</Button></Tooltip>
          <Tooltip content="Download all questions as a CSV file you can open in Excel or Google Sheets"><Button variant="ghost" size="sm" onClick={exportCSV}><Download size={15} />Export</Button></Tooltip>
        </div>
      </div>
      <ol className="question-list">
        {rows.map((item, index) => { const itemStats = (item._id && stats[item._id]) || emptyStats; return <li
          key={item._id ?? item.question}
          className={`question-row${dragIndex === index ? ' is-dragging' : ''}${item.published ? '' : ' is-hidden'}`}
          onDragOver={(event) => onDragOver(event, index)} onDrop={(event) => event.preventDefault()}>
          <Tooltip content="Drag to reorder, or focus and use the arrow keys" side="left"><span className="drag-handle" role="button" tabIndex={0} aria-label={`Reorder "${item.question}"`} draggable onDragStart={(event) => { setDragIndex(index); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setDragImage(event.currentTarget.closest('li') ?? event.currentTarget, 20, 20); }} onDragEnd={onDragEnd} onKeyDown={(event) => onHandleKey(event, index)}><GripVertical size={16} /></span></Tooltip>
          <button type="button" className="question-main" onClick={() => openQuestion(item)}>
            <span className="question-text">{item.question}</span>
            <span className="question-meta">
              {item.category ? <Badge>{item.category}</Badge> : null}
              {item.published ? null : <Badge className="badge-draft">Hidden</Badge>}
            </span>
          </button>
          <Tooltip content={`Opened ${itemStats.opens} times · ${itemStats.helpful} found it helpful · ${itemStats.notHelpful} didn't`}>
            <span className="question-stats" tabIndex={0}><span><MousePointerClick size={13} />{itemStats.opens}</span><span><ThumbsUp size={13} />{itemStats.helpful}</span><span><ThumbsDown size={13} />{itemStats.notHelpful}</span></span>
          </Tooltip>
          <div className="row-actions">
            <Tooltip content="Edit"><button type="button" className="icon-button" aria-label="Edit question" onClick={() => openQuestion(item)}><Pencil size={15} /></button></Tooltip>
            <Tooltip content="Copy a link that opens this question on your site"><button type="button" className="icon-button" aria-label="Copy link to question" onClick={() => void copyLink(item)}><Link2 size={15} /></button></Tooltip>
            <Tooltip content={item.published ? 'Hide from your site' : 'Show on your site'}><button type="button" className="icon-button" aria-label={item.published ? 'Hide question' : 'Show question'} onClick={() => void toggleItemPublished(item)}>{item.published ? <Eye size={15} /> : <EyeOff size={15} />}</button></Tooltip>
            <Tooltip content="Delete"><button type="button" className="icon-button icon-danger" aria-label="Delete question" onClick={() => setDeletingItem(item)}><Trash2 size={15} /></button></Tooltip>
          </div>
        </li>; })}
      </ol>
    </div>}

    <QuestionDialog open={questionOpen} onOpenChange={setQuestionOpen} groupId={group._id ?? ''} item={editing} categories={categoriesOf(groupItems)} nextSortOrder={groupItems.length} onSaved={refresh} />
    <GroupSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} group={group} onSaved={onGroupChanged} onDelete={() => { setSettingsOpen(false); setDeletingGroup(true); }} />
    <ConfirmDialog open={Boolean(deletingItem)} onOpenChange={(open) => { if (!open) setDeletingItem(null); }} title="Delete this question?" description={`"${deletingItem?.question ?? ''}" will be removed from every widget. This can't be undone.`} confirmLabel="Delete question" onConfirm={deleteItem} />
    <ConfirmDialog open={deletingGroup} onOpenChange={setDeletingGroup} title={`Delete "${group.title}"?`} description={`This deletes the group and its ${groupItems.length} question${groupItems.length === 1 ? '' : 's'}. Widgets connected to it will stop showing FAQs. This can't be undone.`} confirmLabel="Delete group" onConfirm={deleteGroup} />
  </section>;
};
