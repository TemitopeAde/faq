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
import { getDashboardLanguage, t, tn, tOr } from '@/lib/dashboard-i18n';
import { localizedTemplateItems } from '@/lib/i18n/template-content';

const templateName = (template: { id: string; name: string }) => tOr(`template.${template.id}`, template.name);

// Non-Latin names (e.g. Chinese, Arabic) leave no slug characters, so fall back to a generic prefix.
const connectionKeyFor = (title: string) => `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'faq'}-${Math.random().toString(36).slice(2, 8)}`;

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
    const name = template ? templateName(template) : title.trim();
    if (!name) { toast.error(t('create.nameRequired')); return; }
    setSaving(true);
    try {
      const style = template?.preset ?? preset;
      // Templates are seeded in the dashboard language so the starter questions match the site owner's language.
      const templateItems = template ? await localizedTemplateItems(template, getDashboardLanguage()) : [];
      const description = template ? tOr(`template.${template.id}.description`, template.description) : '';
      const group = await items.insert(GROUPS, { title: name, connectionKey: connectionKeyFor(name), description, published: false, defaultLayout: style, defaultPreset: style, usageCount: 0 });
      if (template) await items.bulkInsert(FAQ_ITEMS, templateItems.map((item, index) => ({ ...item, title: item.question, groupId: group._id, sortOrder: index, published: true })));
      toast.success(template ? t('create.createdTemplate', { name }) : t('create.created'), { description: template ? t('create.createdTemplateBody') : t('create.createdBody') });
      onOpenChange(false);
      if (group._id) await onCreated(group._id);
    } catch (error) { console.error('Failed to create FAQ group:', error); toast.error(t('create.error')); } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="dialog-medium">
      <DialogHeader><DialogTitle>{t('create.title')}</DialogTitle><DialogDescription>{t('create.description')}</DialogDescription></DialogHeader>
      <div className="choice-row" role="radiogroup" aria-label={t('create.howToStart')}>
        <button type="button" role="radio" aria-checked={mode === 'blank'} className="choice" onClick={() => setMode('blank')}><FilePlus2 size={20} /><strong>{t('create.blank')}</strong><span>{t('create.blankBody')}</span></button>
        <button type="button" role="radio" aria-checked={mode === 'template'} className="choice" onClick={() => setMode('template')}><LayoutTemplate size={20} /><strong>{t('create.template')}</strong><span>{t('create.templateBody')}</span></button>
      </div>
      {mode === 'blank' ? <div className="form-stack">
        <label className="field"><span className="field-label">{t('create.groupName')}</span><Input autoFocus placeholder={t('create.groupNamePlaceholder')} value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void create(); }} /></label>
        <div className="field"><span className="field-label"><label htmlFor="group-style">{t('create.style')}</label><InfoTip content={t('create.styleInfo')} /></span><select id="group-style" className="dashboard-select" value={preset} onChange={(event) => setPreset(event.target.value)}>{FAQ_PRESETS.map((option) => <option key={option.id} value={option.id}>{tOr(`preset.${option.id}`, option.name)}</option>)}</select></div>
      </div> : <div className="template-list" role="radiogroup" aria-label={t('create.templates')}>
        {FAQ_TEMPLATES.map((template) => <button type="button" role="radio" aria-checked={templateId === template.id} className="template-option" key={template.id} onClick={() => setTemplateId(template.id)}>
          <span className="template-emoji" aria-hidden="true">{template.emoji}</span>
          <span><strong>{templateName(template)}</strong><small>{tOr(`template.${template.id}.description`, template.description)} · {tn('common.questionCount', template.items.length)}</small></span>
        </button>)}
      </div>}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
        <Button loading={saving} onClick={() => void create()}>{t('create.submit')}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
};
