import { useEffect, useState } from 'react';
import { items } from '@wix/data';
import { FilePlus2, LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { InfoTip } from '@/components/ui/tooltip';
import { FAQ_ITEMS, GROUPS } from '@/lib/faq-data';
import { FAQ_PRESETS } from '@/lib/faq-presets';
import { FAQ_TEMPLATES } from '@/lib/faq-templates';

const connectionKeyFor = (title: string) => `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${Math.random().toString(36).slice(2, 8)}`;

type CreateGroupDialogProps = { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (groupId: string) => Promise<void> };

export const CreateGroupDialog = ({ open, onOpenChange, onCreated }: CreateGroupDialogProps) => {
  const [mode, setMode] = useState<'blank' | 'template'>('blank');
  const [title, setTitle] = useState('');
  const [preset, setPreset] = useState('classic');
  const [templateId, setTemplateId] = useState(FAQ_TEMPLATES[0].id);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setMode('blank'); setTitle(''); setPreset('classic'); setTemplateId(FAQ_TEMPLATES[0].id); } }, [open]);

  const create = async () => {
    const template = mode === 'template' ? FAQ_TEMPLATES.find((option) => option.id === templateId) : undefined;
    const name = template?.name ?? title.trim();
    if (!name) { toast.error('Give your FAQ group a name'); return; }
    setSaving(true);
    try {
      const style = template?.preset ?? preset;
      const group = await items.insert(GROUPS, { title: name, connectionKey: connectionKeyFor(name), description: template?.description ?? '', published: false, defaultLayout: style, defaultPreset: style, usageCount: 0 });
      if (template) await items.bulkInsert(FAQ_ITEMS, template.items.map((item, index) => ({ ...item, title: item.question, groupId: group._id, sortOrder: index, published: true })));
      toast.success(template ? `${template.name} FAQ created` : 'FAQ group created', { description: template ? 'Edit the answers to match your business, then publish.' : 'Now add your first question.' });
      onOpenChange(false);
      if (group._id) await onCreated(group._id);
    } catch (error) { console.error('Failed to create FAQ group:', error); toast.error('Could not create the FAQ group'); } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="dialog-medium">
      <DialogHeader><DialogTitle>New FAQ group</DialogTitle><DialogDescription>A group is a set of questions you can show in one or more FAQ widgets on your site.</DialogDescription></DialogHeader>
      <div className="choice-row" role="radiogroup" aria-label="How to start">
        <button type="button" role="radio" aria-checked={mode === 'blank'} className="choice" onClick={() => setMode('blank')}><FilePlus2 size={20} /><strong>Start blank</strong><span>Write your own questions</span></button>
        <button type="button" role="radio" aria-checked={mode === 'template'} className="choice" onClick={() => setMode('template')}><LayoutTemplate size={20} /><strong>Use a template</strong><span>Ready-made questions to edit</span></button>
      </div>
      {mode === 'blank' ? <div className="form-stack">
        <label className="field"><span className="field-label">Group name</span><Input autoFocus placeholder="e.g. Shipping & returns" value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void create(); }} /></label>
        <div className="field"><span className="field-label"><label htmlFor="group-style">Starting style</label><InfoTip content="You can change every color, font and layout later in the widget's settings panel in the Wix Editor." /></span><select id="group-style" className="dashboard-select" value={preset} onChange={(event) => setPreset(event.target.value)}>{FAQ_PRESETS.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>
      </div> : <div className="template-list" role="radiogroup" aria-label="Templates">
        {FAQ_TEMPLATES.map((template) => <button type="button" role="radio" aria-checked={templateId === template.id} className="template-option" key={template.id} onClick={() => setTemplateId(template.id)}>
          <span className="template-emoji" aria-hidden="true">{template.emoji}</span>
          <span><strong>{template.name}</strong><small>{template.description} · {template.items.length} questions</small></span>
        </button>)}
      </div>}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button loading={saving} onClick={() => void create()}>Create group</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
};
