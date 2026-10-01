import { useEffect, useState } from 'react';
import { items } from '@wix/data';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { InfoTip } from '@/components/ui/tooltip';
import { GROUPS } from '@/lib/faq-data';
import type { FAQGroup } from '@/lib/faq-types';

type GroupSettingsDialogProps = { open: boolean; group: FAQGroup; onOpenChange: (open: boolean) => void; onSaved: () => Promise<void>; onDelete: () => void };

export const GroupSettingsDialog = ({ open, group, onOpenChange, onSaved, onDelete }: GroupSettingsDialogProps) => {
  const [title, setTitle] = useState(group.title);
  const [description, setDescription] = useState(group.description ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setTitle(group.title); setDescription(group.description ?? ''); } }, [open, group]);

  const save = async () => {
    if (!group._id || !title.trim()) { toast.error('The group needs a name'); return; }
    setSaving(true);
    try {
      await items.update(GROUPS, { ...group, _id: group._id, title: title.trim(), description: description.trim() });
      toast.success('Group settings saved');
      await onSaved();
      onOpenChange(false);
    } catch (error) { console.error('Failed to update FAQ group:', error); toast.error('Could not save the group'); } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="dialog-medium">
      <DialogHeader><DialogTitle>Group settings</DialogTitle><DialogDescription>Only you see the group name. Visitors see the heading set in the widget.</DialogDescription></DialogHeader>
      <div className="form-stack">
        <label className="field"><span className="field-label">Group name</span><Input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <div className="field"><span className="field-label"><label htmlFor="group-intro">Intro text</label> <span className="field-optional">optional</span><InfoTip content="Shown under the FAQ heading, unless the widget has its own description set in the Editor." /></span><Input id="group-intro" placeholder="e.g. Answers to the questions we hear most often." value={description} onChange={(event) => setDescription(event.target.value)} /></div>
        <div className="field"><span className="field-label">Connection key<InfoTip content="Identifies this group. In the Wix Editor, pick the group by name in the widget's settings panel; you don't need to type this key." /></span><code className="key-display">{group.connectionKey}</code></div>
      </div>
      <div className="danger-zone">
        <div><strong>Delete this group</strong><p>Removes the group and all of its questions. Widgets connected to it will show a message instead.</p></div>
        <Button variant="destructive" size="sm" onClick={onDelete}>Delete group</Button>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button loading={saving} onClick={() => void save()}>Save</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
};
