import { useEffect, useState } from 'react';
import { items } from '@wix/data';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { InfoTip } from '@/components/ui/tooltip';
import { GROUPS } from '@/lib/faq-data';
import type { FAQGroup } from '@/lib/faq-types';
import { t } from '@/lib/dashboard-i18n';

type GroupSettingsDialogProps = { open: boolean; group: FAQGroup; onOpenChange: (open: boolean) => void; onSaved: () => Promise<void>; onDelete: () => void };

export const GroupSettingsDialog = ({ open, group, onOpenChange, onSaved, onDelete }: GroupSettingsDialogProps) => {
  const [title, setTitle] = useState(group.title);
  const [description, setDescription] = useState(group.description ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setTitle(group.title); setDescription(group.description ?? ''); } }, [open, group]);

  const save = async () => {
    if (!group._id || !title.trim()) { toast.error(t('groupSettings.nameRequired')); return; }
    setSaving(true);
    try {
      await items.update(GROUPS, { ...group, _id: group._id, title: title.trim(), description: description.trim() });
      toast.success(t('groupSettings.saved'));
      await onSaved();
      onOpenChange(false);
    } catch (error) { console.error('Failed to update FAQ group:', error); toast.error(t('groupSettings.saveError')); } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="dialog-medium">
      <DialogHeader><DialogTitle>{t('groupSettings.title')}</DialogTitle><DialogDescription>{t('groupSettings.description')}</DialogDescription></DialogHeader>
      <div className="form-stack">
        <label className="field"><span className="field-label">{t('create.groupName')}</span><Input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <div className="field"><span className="field-label"><label htmlFor="group-intro">{t('groupSettings.intro')}</label> <span className="field-optional">{t('common.optional')}</span><InfoTip content={t('groupSettings.introInfo')} /></span><Input id="group-intro" placeholder={t('groupSettings.introPlaceholder')} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
        <div className="field"><span className="field-label">{t('groupSettings.key')}<InfoTip content={t('groupSettings.keyInfo')} /></span><code className="key-display">{group.connectionKey}</code></div>
      </div>
      <div className="danger-zone">
        <div><strong>{t('groupSettings.deleteTitle')}</strong><p>{t('groupSettings.deleteBody')}</p></div>
        <Button variant="destructive" size="sm" onClick={onDelete}>{t('detail.deleteGroup')}</Button>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
        <Button loading={saving} onClick={() => void save()}>{t('common.save')}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
};
