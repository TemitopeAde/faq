import React, { type FC, useEffect, useState } from 'react';
import { items } from '@wix/data';
import { reactElements } from '@wix/editor';
import { Accordion, Dropdown, FormField, Input, SectionHelper, SidePanel, ToggleSwitch, WixDesignSystemProvider } from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { allQueryItems } from '../../../../lib/faq-query';
import { FAQ_PRESETS, presetById } from '../../../../lib/faq-presets';
import { SUPPORTED_LANGUAGES } from '../../../../lib/faq-i18n';
import { displayLanguage, t } from '../../../../lib/dashboard-i18n';

type Data = Record<string, string | boolean | number | undefined>;
type Option = { id: string; value: string; label: string };
const GROUPS = '@admin14744/faq/faq-groups';
const asString = (value: unknown) => typeof value === 'string' ? value : '';
const asBool = (value: unknown, fallback: boolean) => typeof value === 'boolean' ? value : fallback;

const Panel: FC = () => {
  const [data, setData] = useState<Data>({});
  const [groups, setGroups] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void reactElements.getData().then((current) => { if (active) setData(current as Data); }).catch((error) => console.error('Failed to load FAQ component settings:', error));
    let unsubscribe: (() => void) | undefined;
    void reactElements.onChange((patch) => {
      if (patch.type === 'data') void reactElements.getData().then((current) => { if (active) setData(current as Data); });
    }).then((stop) => { unsubscribe = stop; }).catch((error) => console.error('Failed to subscribe to FAQ component changes:', error));
    void allQueryItems(items.query(GROUPS).ascending('title')).then((result) => {
      if (!active) return;
      setGroups(result.map((group) => ({ id: String(group.connectionKey ?? ''), value: String(group.title ?? group.connectionKey ?? ''), label: String(group.title ?? group.connectionKey ?? '') })).filter((option) => option.id));
    }).catch((error) => console.error('Failed to load FAQ groups for the connection dropdown:', error)).finally(() => { if (active) setLoading(false); });
    return () => { active = false; unsubscribe?.(); };
  }, []);

  const update = (key: string, value: string | boolean | number) => {
    setData((current) => ({ ...current, [key]: value }));
    void reactElements.setData({ [key]: value }).catch((error) => console.error(`Failed to update FAQ setting ${key}:`, error));
  };
  const connectionKey = asString(data.connectionKey);
  const connectionOptions = groups.some((option) => option.id === connectionKey) || !connectionKey ? groups : [{ id: connectionKey, value: connectionKey, label: connectionKey }, ...groups];
  const languageOptions = SUPPORTED_LANGUAGES.map((language) => ({ id: language.code, value: language.code ? displayLanguage(language.code) : t('common.autoLanguage'), label: language.code ? displayLanguage(language.code) : t('common.autoLanguage') }));
  const select = (key: string, label: string, options: Option[], placeholder?: string) => <SidePanel.Field key={key}><FormField label={label}><Dropdown ariaLabel={label} size="small" selectedId={asString(data[key])} options={options} valueParser={(option) => option.value} placeholder={placeholder} onSelect={(option) => update(key, String(option.id))} /></FormField></SidePanel.Field>;
  const toggle = (key: string, label: string, fallback: boolean) => <SidePanel.Field key={key}><FormField label={label} labelPlacement="left" stretchContent={false}><ToggleSwitch size="small" checked={asBool(data[key], fallback)} onChange={(event) => update(key, event.target.checked)} /></FormField></SidePanel.Field>;
  const displayOptions = ['accordion', 'grid', 'cards', 'tabs'].map((id) => ({ id, value: id[0].toUpperCase() + id.slice(1), label: id[0].toUpperCase() + id.slice(1) }));
  const presetOptions = FAQ_PRESETS.map((preset) => ({ id: preset.id, value: preset.name, label: preset.name }));
  const applyPreset = (id: string) => {
    const preset = presetById(id);
    const extraData: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(preset.extras)) {
      const dataKey = key === 'show-categories' ? 'showCategories' : key === 'show-search' ? 'showSearch' : key === 'show-expand-all' ? 'showExpandAll' : key === 'single-open' ? 'singleOpen' : undefined;
      if (dataKey) extraData[dataKey] = value === 'true';
    }
    void reactElements.setData({
      layout: preset.id, display: preset.display, backgroundColor: preset.backgroundColor,
      questionColor: preset.questionColor, answerColor: preset.answerColor, accentColor: preset.accentColor,
      borderColor: preset.borderColor, questionFont: preset.questionFont.font, answerFont: preset.answerFont.font,
      icon: preset.icon, iconColor: preset.iconColor, iconSize: preset.iconSize,
      radius: preset.radius, gap: preset.gap, padding: preset.padding, ...extraData,
    }).catch((error) => console.error('Failed to apply FAQ preset:', error));
  };

  return <WixDesignSystemProvider><SidePanel width="320" height="100vh"><SidePanel.Header title="FAQ settings"/><SidePanel.Content noPadding stretchVertically>
    <Accordion skin="light" hideShadow size="small" multiple items={[
      { title: t('panel.sectionConnection'), initiallyOpen: true, children: <>
        {select('connectionKey', t('panel.connectionKey'), connectionOptions, loading ? t('panel.loadingGroups') : t('panel.selectGroup'))}
        <SidePanel.Field><FormField label={t('panel.preset')}><Dropdown ariaLabel={t('panel.preset')} size="small" selectedId={asString(data.layout) || 'classic'} options={presetOptions} valueParser={(option) => option.value} onSelect={(option) => applyPreset(String(option.id))} /></FormField></SidePanel.Field>
        <SidePanel.Field><FormField label={t('panel.language')} infoContent={t('panel.languageInfo')}><Dropdown ariaLabel={t('panel.language')} size="small" selectedId={asString(data.language)} options={languageOptions} valueParser={(option) => option.value} placeholder={t('common.autoLanguage')} onSelect={(option) => update('language', String(option.id))} /></FormField></SidePanel.Field>
        {!connectionKey && <SidePanel.Field><SectionHelper size="small">{t('panel.connectionInfo')}</SectionHelper></SidePanel.Field>}
      </> },
      { title: t('panel.sectionContent'), initiallyOpen: false, children: <>
        <SidePanel.Field><FormField label={t('panel.heading')}><Input value={asString(data.heading)} onChange={(event) => update('heading', event.target.value)} /></FormField></SidePanel.Field>
        <SidePanel.Field><FormField label={t('panel.description')}><Input value={asString(data.description)} onChange={(event) => update('description', event.target.value)} /></FormField></SidePanel.Field>
        <SidePanel.Field><FormField label={t('panel.searchPlaceholder')}><Input value={asString(data.searchPlaceholder)} onChange={(event) => update('searchPlaceholder', event.target.value)} /></FormField></SidePanel.Field>
      </> },
      { title: t('panel.sectionShow'), initiallyOpen: false, children: <>
        {toggle('showHeading', t('panel.showHeading'), true)}
        {toggle('showDescription', t('panel.showDescription'), true)}
        {toggle('showSearch', t('panel.showSearch'), true)}
        {toggle('showCategories', t('panel.showCategories'), true)}
        {toggle('showExpandAll', t('panel.showExpandAll'), false)}
        {toggle('showIcon', t('panel.showIcon'), true)}
        {toggle('collectFeedback', t('panel.showFeedback'), true)}
        {toggle('showHelp', t('panel.showHelp'), false)}
      </> },
      { title: t('panel.sectionBehavior'), initiallyOpen: false, children: <>
        {select('display', t('panel.display'), displayOptions)}
        {select('icon', t('panel.icon'), ['plus', 'chevron', 'arrow', 'minus', 'caret', 'circle-plus', 'circle-chevron'].map((id) => ({ id, value: id, label: id })))}
        {select('animation', t('panel.animation'), ['none', 'fade', 'slide', 'zoom'].map((id) => ({ id, value: id, label: id })))}
        {select('hoverEffect', t('panel.hover'), ['none', 'lift', 'highlight', 'accent'].map((id) => ({ id, value: id, label: id })))}
        {toggle('initiallyOpen', t('panel.initiallyOpen'), false)}
        {toggle('singleOpen', t('panel.singleOpen'), false)}
        {toggle('seoSchema', t('panel.seo'), true)}
      </> },
      { title: t('panel.sectionColors'), initiallyOpen: false, children: <>
        {(['backgroundColor', 'questionColor', 'answerColor', 'accentColor', 'borderColor', 'iconColor'] as const).map((key) => <SidePanel.Field key={key}><FormField label={t(`panel.color.${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}` as never)}><input aria-label={key} type="color" value={asString(data[key]) || '#ffffff'} onChange={(event) => update(key, event.target.value)} /></FormField></SidePanel.Field>)}
      </> },
      { title: t('panel.sectionContainer'), initiallyOpen: false, children: <>
        {(['radius', 'gap', 'padding', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'iconSize'] as const).map((key) => {
          const label = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
          return <SidePanel.Field key={key}><FormField label={label === 'icon-size' ? t('panel.iconSize') : label.startsWith('margin-') ? t(`panel.margin.${label}` as never) : t(`panel.${label}` as never)}><Input type="number" min={0} value={typeof data[key] === 'number' ? String(data[key]) : ''} onChange={(event) => update(key, Number(event.target.value))} /></FormField></SidePanel.Field>;
        })}
      </> },
      { title: t('panel.sectionTypography'), initiallyOpen: false, children: <>
        <SidePanel.Field><FormField label={t('panel.questionFont')}><Input value={asString(data.questionFont)} onChange={(event) => update('questionFont', event.target.value)} /></FormField></SidePanel.Field>
        <SidePanel.Field><FormField label={t('panel.answerFont')}><Input value={asString(data.answerFont)} onChange={(event) => update('answerFont', event.target.value)} /></FormField></SidePanel.Field>
      </> },
      { title: t('panel.sectionHelp'), initiallyOpen: false, children: <>
        {!asBool(data.showHelp, false) ? <SidePanel.Field><SectionHelper size="small">{t('panel.helpOff')}</SectionHelper></SidePanel.Field> : <>
          <SidePanel.Field><FormField label={t('panel.helpMessage')}><Input size="small" value={asString(data.helpText)} onChange={(event) => update('helpText', event.target.value)} /></FormField></SidePanel.Field>
          <SidePanel.Field><FormField label={t('panel.helpLabel')}><Input size="small" value={asString(data.helpLabel)} onChange={(event) => update('helpLabel', event.target.value)} /></FormField></SidePanel.Field>
          <SidePanel.Field><FormField label={t('panel.helpLink')} infoContent={t('panel.helpLinkInfo')}><Input size="small" value={asString(data.helpLink)} onChange={(event) => update('helpLink', event.target.value)} /></FormField></SidePanel.Field>
        </>}
      </> },
    ]}/>
  </SidePanel.Content></SidePanel></WixDesignSystemProvider>;
};

export default Panel;
