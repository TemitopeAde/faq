import { useCallback, useEffect, useState } from 'react';
import { items } from '@wix/data';
import { ChevronRight, Plus } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InfoTip, TooltipProvider } from '@/components/ui/tooltip';
import { FAQ_PRESETS } from '@/lib/faq-presets';
import { iconById } from '@/lib/faq-icons';
import { FAQ_ITEMS, GROUPS } from '@/lib/faq-data';
import type { FAQGroup, FAQItem } from '@/lib/faq-types';
import { AnalyticsTab } from './analytics-tab';
import { CreateGroupDialog } from './create-group-dialog';
import { GroupDetail } from './group-detail';
import { PricingPanel } from './pricing-panel';
import { allQueryItems } from '@/lib/faq-query';
import '@/styles/globals.css';
import 'react-quill/dist/quill.snow.css';
import './my-page.css';

const sampleQuestions = ['How does this work?', 'Can I customize it?', 'Where can I get help?'];

const Preview = ({ presetId }: { presetId: string }) => {
  const preset = FAQ_PRESETS.find((item) => item.id === presetId) ?? FAQ_PRESETS[0];
  const icon = iconById(preset.icon);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return <div className="preset-preview" style={{ background: preset.backgroundColor === 'transparent' ? '#fff' : preset.backgroundColor, color: preset.questionColor, borderColor: preset.borderColor }}>{sampleQuestions.map((question, index) => { const isOpen = openIndex === index; return <div className="preview-item" key={question} style={{ borderColor: preset.borderColor }}><button className="preview-row" type="button" aria-expanded={isOpen} onClick={() => setOpenIndex(isOpen ? null : index)} style={{ color: preset.questionColor }}><span>{question}</span><svg className={isOpen ? 'preview-icon-open' : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={preset.accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon.path} /></svg></button>{isOpen ? <div className="preview-answer" style={{ color: preset.answerColor }}>A sample answer in the {preset.name} style.</div> : null}</div>; })}</div>;
};

const DashboardPage = () => {
  const [groups, setGroups] = useState<Array<FAQGroup>>([]);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [activeTab, setActiveTab] = useState('groups');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const selectedGroup = groups.find((group) => group._id === selectedGroupId) ?? null;

  const loadGroups = useCallback(async () => {
    try {
      const [groupResult, itemResult] = await Promise.all([allQueryItems(items.query(GROUPS).descending('_createdDate')), allQueryItems(items.query(FAQ_ITEMS))]);
      setGroups(groupResult as unknown as Array<FAQGroup>);
      const next = new Map<string, number>();
      for (const item of itemResult as unknown as Array<FAQItem>) next.set(item.groupId, (next.get(item.groupId) ?? 0) + 1);
      setCounts(next);
    } catch (error) { console.error('Failed to load FAQ groups:', error); toast.error('Could not load FAQ groups'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadGroups(); }, [loadGroups]);

  const openGroup = (groupId: string) => { setSelectedGroupId(groupId); setActiveTab('groups'); window.scrollTo({ top: 0 }); };

  return <TooltipProvider delayDuration={250}><main className="dashboard-shell"><Toaster position="top-right" richColors />
    <header className="page-header">
      <div>
        <h1>FAQ</h1>
        <p>Write your questions here, then add the FAQ widget to any page in the Wix Editor.</p>
      </div>
      <Button onClick={() => setCreateOpen(true)}><Plus size={16} />New FAQ group</Button>
    </header>

    <PricingPanel />
    <Tabs value={activeTab} onValueChange={setActiveTab} className="dashboard-tabs">
      <TabsList><TabsTrigger value="groups">FAQ groups</TabsTrigger><TabsTrigger value="analytics">Analytics</TabsTrigger><TabsTrigger value="styles">Styles</TabsTrigger></TabsList>

      <TabsContent value="groups">
        {selectedGroup ? <GroupDetail group={selectedGroup} onBack={() => setSelectedGroupId(null)} onGroupChanged={loadGroups} />
          : loading ? <div className="panel empty-state"><p>Loading…</p></div>
          : groups.length === 0 ? <div className="panel empty-state empty-hero">
            <span className="empty-emoji" aria-hidden="true">💬</span>
            <h3>Create your first FAQ</h3>
            <p>Start from scratch or pick a ready-made template for stores, restaurants, bookings and more.</p>
            <Button onClick={() => setCreateOpen(true)}><Plus size={16} />New FAQ group</Button>
          </div>
          : <div className="group-grid">
            {groups.map((group) => <button type="button" className="group-card" key={group._id ?? group.connectionKey} onClick={() => group._id && openGroup(group._id)}>
              <span className="group-card-top"><Badge className={group.published ? 'badge-live' : 'badge-draft'}>{group.published ? 'Published' : 'Draft'}</Badge><ChevronRight size={18} className="group-card-arrow" aria-hidden="true" /></span>
              <strong>{group.title}</strong>
              <span className="group-card-count">{counts.get(group._id ?? '') ?? 0} questions</span>
            </button>)}
          </div>}
        {!selectedGroup && groups.length > 0 ? <p className="page-tip">Tip: in the Wix Editor, add the <strong>FAQ Widget</strong> to a page, open its settings and choose a group under <em>Connection</em>.</p> : null}
      </TabsContent>

      <TabsContent value="analytics">{activeTab === 'analytics' ? <AnalyticsTab groups={groups} /> : null}</TabsContent>

      <TabsContent value="styles">
        <div className="section-intro"><h2>Style presets <InfoTip content="To apply a style, select the FAQ widget in the Wix Editor, open Settings → Connection → Layout preset. You can then fine-tune colors, fonts and icons." /></h2><p>Preview the {FAQ_PRESETS.length} built-in looks. Click questions to see them open.</p></div>
        <div className="preset-grid">{FAQ_PRESETS.map((preset) => <div className="preset-card" key={preset.id}><Preview presetId={preset.id} /><div className="preset-meta"><strong>{preset.name}</strong><span>{preset.category}</span></div></div>)}</div>
      </TabsContent>
    </Tabs>

    <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={async (groupId) => { await loadGroups(); openGroup(groupId); }} />
  </main></TooltipProvider>;
};
export default DashboardPage;
