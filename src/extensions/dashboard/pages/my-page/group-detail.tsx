import { useCallback, useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { items } from '@wix/data';
import { ArrowLeft, Download, Eye, EyeOff, GripVertical, MousePointerClick, Pencil, Plus, Settings, ThumbsDown, ThumbsUp, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InfoTip, Tooltip } from '@/components/ui/tooltip';
import type { ItemStats } from '@/lib/faq-analytics';
import { fetchFAQAnalytics } from '@/lib/faq-api';
import { parseCSV, toCSV } from '@/lib/faq-csv';
import { FAQ_ITEMS, GROUPS, categoriesOf } from '@/lib/faq-data';
import type { FAQGroup, FAQItem } from '@/lib/faq-types';
import { ConfirmDialog } from './confirm-dialog';
import { GroupSettingsDialog } from './group-settings-dialog';
import { QuestionDialog } from './question-dialog';
import { allQueryItems } from '@/lib/faq-query';
import { displayLanguage, t, tn } from '@/lib/dashboard-i18n';

const emptyStats: ItemStats = { opens: 0, helpful: 0, notHelpful: 0 };

const downloadFile = (name: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(link); link.click(); link.remove();
  URL.revokeObjectURL(url);
};

type GroupDetailProps = { group: FAQGroup; onBack: () => void; onGroupChanged: () => Promise<void> };

export const GroupDetail = ({ group, onBack, onGroupChanged }: GroupDetailProps) => {
  const [groupItems, setGroupItems] = useState<Array<FAQItem>>([]);
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
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
    } catch (error) { console.error('Failed to load FAQ items:', error); toast.error(t('detail.loadError')); } finally { setLoading(false); }
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
    try { await items.update(GROUPS, { ...group, _id: group._id, published: !group.published }); toast.success(group.published ? t('detail.groupUnpublished') : t('detail.groupPublished'), { description: group.published ? t('detail.groupUnpublishedBody') : t('detail.groupPublishedBody') }); await onGroupChanged(); }
    catch (error) { console.error('Failed to update FAQ group:', error); toast.error(t('detail.groupUpdateError')); } finally { setPublishing(false); }
  };

  const toggleItemPublished = async (item: FAQItem) => {
    if (!item._id) return;
    try { await items.update(FAQ_ITEMS, { ...item, _id: item._id, published: !item.published }); setGroupItems((current) => current.map((other) => (other._id === item._id ? { ...other, published: !item.published } : other))); toast.success(item.published ? t('detail.questionHidden') : t('detail.questionVisible')); }
    catch (error) { console.error('Failed to update FAQ item:', error); toast.error(t('detail.questionUpdateError')); }
  };

  const deleteItem = async () => {
    if (!deletingItem?._id) return;
    try { await items.remove(FAQ_ITEMS, deletingItem._id); toast.success(t('detail.questionDeleted')); await refresh(); }
    catch (error) { console.error('Failed to delete FAQ item:', error); toast.error(t('detail.questionDeleteError')); }
  };

  const deleteGroup = async () => {
    if (!group._id) return;
    try {
      const ids = groupItems.map((item) => item._id).filter((id): id is string => Boolean(id));
      if (ids.length) await items.bulkRemove(FAQ_ITEMS, ids);
      await items.remove(GROUPS, group._id);
      toast.success(t('detail.groupDeleted', { title: group.title }));
      setSettingsOpen(false);
      await onGroupChanged();
      onBack();
    } catch (error) { console.error('Failed to delete FAQ group:', error); toast.error(t('detail.groupDeleteError')); }
  };

  // Persists the current order, writing only the items whose position changed.
  const saveOrder = async (ordered: Array<FAQItem>) => {
    const changed = ordered.map((item, index) => ({ ...item, sortOrder: index })).filter((item, index) => groupItems.find((other) => other._id === item._id)?.sortOrder !== index);
    setGroupItems(ordered.map((item, index) => ({ ...item, sortOrder: index })));
    if (!changed.length) return;
    try { await items.bulkUpdate(FAQ_ITEMS, changed as Array<FAQItem & { _id: string }>); toast.success(t('detail.orderSaved')); }
    catch (error) { console.error('Failed to save FAQ order:', error); toast.error(t('detail.orderError')); await loadItems(); }
  };
  const usedLanguages = Array.from(new Set(groupItems.map((item) => (item.language || '').toLowerCase()).filter(Boolean)));
  const visibleItems = filterLanguage === 'all'
    ? groupItems
    : groupItems.filter((item) => (item.language || '').toLowerCase() === filterLanguage);
  const rows = dragOrder ?? visibleItems;
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

  const exportCSV = () => downloadFile(`${group.connectionKey || 'faqs'}.csv`, `﻿${toCSV(groupItems)}`, 'text/csv;charset=utf-8');
  const importCSV = async (file: File) => {
    if (!group._id) return;
    setImporting(true);
    try {
      const parsed = parseCSV(await file.text());
      if (!parsed.length) { toast.error(t('detail.importEmpty'), { description: t('detail.importEmptyBody') }); return; }
      await items.bulkInsert(FAQ_ITEMS, parsed.map((row, index) => ({ ...row, title: row.question, groupId: group._id, sortOrder: groupItems.length + index })));
      toast.success(tn('detail.imported', parsed.length));
      await refresh();
    } catch (error) { console.error('Failed to import FAQ CSV:', error); toast.error(t('detail.importError'), { description: error instanceof Error ? error.message : undefined }); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return <section className="detail">
    <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCSV(file); }} />
    <button type="button" className="back-link" onClick={onBack}><ArrowLeft size={16} className="flip-rtl" />{t('detail.back')}</button>

    <header className="detail-header">
      <div className="detail-title">
        <h2>{group.title}</h2>
        <div className="detail-meta">
          <Badge className={group.published ? 'badge-live' : 'badge-draft'}>{group.published ? t('common.live') : t('common.draft')}</Badge>
          <span>{tn('common.questionCount', groupItems.length)}</span>
          <InfoTip content={group.published ? t('detail.liveInfo') : t('detail.draftInfo')} />
        </div>
      </div>
      <div className="detail-actions">
        <Tooltip content={t('detail.settingsTip')}><Button variant="ghost" size="sm" aria-label={t('detail.settingsLabel')} onClick={() => setSettingsOpen(true)}><Settings size={16} />{t('common.settings')}</Button></Tooltip>
        <Button variant="outline" loading={publishing} onClick={() => void togglePublishedGroup()}>{group.published ? t('common.unpublish') : t('common.publish')}</Button>
        <Button onClick={() => openQuestion(null)}><Plus size={16} />{t('detail.addQuestion')}</Button>
      </div>
    </header>

    {loading ? <div className="panel empty-state"><p>{t('detail.loadingQuestions')}</p></div> : rows.length === 0 ? <div className="panel empty-state">
      <h3>{t('detail.emptyTitle')}</h3>
      <p>{t('detail.emptyBody')}</p>
      <div className="empty-actions"><Button onClick={() => openQuestion(null)}><Plus size={16} />{t('detail.addQuestion')}</Button><Tooltip content={t('detail.csvHelp')}><Button variant="outline" loading={importing} onClick={() => fileRef.current?.click()}><Upload size={16} />{t('detail.importCsv')}</Button></Tooltip></div>
    </div> : <div className="panel">
      {usedLanguages.length > 0 ? (
        <div className="language-filter-bar">
          <span className="language-filter-label">{t('detail.filterLanguage')}</span>
          <button type="button" className={`lang-chip ${filterLanguage === 'all' ? 'active' : ''}`} onClick={() => setFilterLanguage('all')}>{t('detail.all', { count: groupItems.length })}</button>
          {usedLanguages.map((code) => {
            const count = groupItems.filter((item) => (item.language || '').toLowerCase() === code).length;
            return <button key={code} type="button" className={`lang-chip ${filterLanguage === code ? 'active' : ''}`} onClick={() => setFilterLanguage(code)}>{displayLanguage(code)} ({count})</button>;
          })}
        </div>
      ) : null}
      <div className="panel-toolbar">
        <span className="panel-hint">{t('detail.reorderHintBefore')} <GripVertical size={14} aria-hidden="true" /> {t('detail.reorderHintAfter')}</span>
        <div className="toolbar-actions">
          <Tooltip content={t('detail.csvHelp')}><Button variant="ghost" size="sm" loading={importing} onClick={() => fileRef.current?.click()}><Upload size={15} />{t('common.import')}</Button></Tooltip>
          <Tooltip content={t('detail.exportTip')}><Button variant="ghost" size="sm" onClick={exportCSV}><Download size={15} />{t('common.export')}</Button></Tooltip>
        </div>
      </div>
      <ol className="question-list">
        {rows.map((item, index) => { const itemStats = (item._id && stats[item._id]) || emptyStats; return <li
          key={item._id ?? item.question}
          className={`question-row${dragIndex === index ? ' is-dragging' : ''}${item.published ? '' : ' is-hidden'}`}
          onDragOver={(event) => onDragOver(event, index)} onDrop={(event) => event.preventDefault()}>
          <Tooltip content={t('detail.dragTip')} side="left"><span className="drag-handle" role="button" tabIndex={0} aria-label={t('detail.reorderLabel', { question: item.question })} draggable onDragStart={(event) => { setDragIndex(index); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setDragImage(event.currentTarget.closest('li') ?? event.currentTarget, 20, 20); }} onDragEnd={onDragEnd} onKeyDown={(event) => onHandleKey(event, index)}><GripVertical size={16} /></span></Tooltip>
          <button type="button" className="question-main" onClick={() => openQuestion(item)}>
            <span className="question-text">{item.question}</span>
            <span className="question-meta">
              {item.language ? <Badge className="badge-lang">{item.language.toUpperCase()}</Badge> : null}
              {item.category ? <Badge>{item.category}</Badge> : null}
              {item.published ? null : <Badge className="badge-draft">{t('common.hidden')}</Badge>}
            </span>
          </button>
          <Tooltip content={t('detail.statsTip', { opens: itemStats.opens, helpful: itemStats.helpful, notHelpful: itemStats.notHelpful })}>
            <span className="question-stats" tabIndex={0}><span><MousePointerClick size={13} />{itemStats.opens}</span><span><ThumbsUp size={13} />{itemStats.helpful}</span><span><ThumbsDown size={13} />{itemStats.notHelpful}</span></span>
          </Tooltip>
          <div className="row-actions">
            <Tooltip content={t('common.edit')}><button type="button" className="icon-button" aria-label={t('detail.editQuestion')} onClick={() => openQuestion(item)}><Pencil size={15} /></button></Tooltip>
            <Tooltip content={item.published ? t('detail.hideTip') : t('detail.showTip')}><button type="button" className="icon-button" aria-label={item.published ? t('detail.hideQuestion') : t('detail.showQuestion')} onClick={() => void toggleItemPublished(item)}>{item.published ? <Eye size={15} /> : <EyeOff size={15} />}</button></Tooltip>
            <Tooltip content={t('common.delete')}><button type="button" className="icon-button icon-danger" aria-label={t('detail.deleteQuestion')} onClick={() => setDeletingItem(item)}><Trash2 size={15} /></button></Tooltip>
          </div>
        </li>; })}
      </ol>
    </div>}

    <QuestionDialog open={questionOpen} onOpenChange={setQuestionOpen} groupId={group._id ?? ''} item={editing} categories={categoriesOf(groupItems)} defaultLanguage={filterLanguage !== 'all' ? filterLanguage : ''} nextSortOrder={groupItems.length} onSaved={refresh} />
    <GroupSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} group={group} onSaved={onGroupChanged} onDelete={() => { setSettingsOpen(false); setDeletingGroup(true); }} />
    <ConfirmDialog open={Boolean(deletingItem)} onOpenChange={(open) => { if (!open) setDeletingItem(null); }} title={t('detail.confirmDeleteQuestionTitle')} description={t('detail.confirmDeleteQuestionBody', { question: deletingItem?.question ?? '' })} confirmLabel={t('detail.deleteQuestion')} onConfirm={deleteItem} />
    <ConfirmDialog open={deletingGroup} onOpenChange={setDeletingGroup} title={t('detail.confirmDeleteGroupTitle', { title: group.title })} description={tn('detail.confirmDeleteGroupBody', groupItems.length)} confirmLabel={t('detail.deleteGroup')} onConfirm={deleteGroup} />
  </section>;
};
