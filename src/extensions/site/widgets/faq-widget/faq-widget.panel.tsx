import React, { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { items } from '@wix/data';
import { inputs, widget } from '@wix/editor';
import { Accordion, Box, Button, Dropdown, FillPreview, FormField, Input, SectionHelper, SidePanel, Slider, ToggleSwitch, WixDesignSystemProvider, listItemSelectBuilder } from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { FAQ_PRESETS, presetById, presetProps } from '../../../../lib/faq-presets';
import { FAQ_ICONS, iconById } from '../../../../lib/faq-icons';
import { SUPPORTED_LANGUAGES, getUIStrings } from '../../../../lib/faq-i18n';
import { detectHostLanguage, displayLanguage, setDashboardLanguage, t, tOr, useDashboardLanguage, type UIKey } from '../../../../lib/dashboard-i18n';
import type { FontValue } from '../../../../lib/faq-types';
import { allQueryItems } from '../../../../lib/faq-query';
import { PricingStatus } from './pricing-status';

type PanelValues = Record<string, string>;
type ConnectionOption = { id: string; value: string; label: string };
const GROUPS = '@admin14744/faq/faq-groups';
const defaults = presetById('classic');
const initialValues: PanelValues = {
  // Text fields start empty: the widget then shows its default text translated into each visitor's language.
  'connection-key': '', layout: defaults.id, heading: '', description: defaults.description,
  'background-color': 'transparent', 'question-color': defaults.questionColor, 'answer-color': defaults.answerColor,
  'accent-color': defaults.accentColor, 'border-color': defaults.borderColor, 'question-font': JSON.stringify(defaults.questionFont),
  'answer-font': JSON.stringify(defaults.answerFont), icon: defaults.icon, 'icon-color': defaults.iconColor,
  'icon-size': String(defaults.iconSize), radius: String(defaults.radius), gap: String(defaults.gap), padding: String(defaults.padding),
  'margin-top': '0', 'margin-right': '0', 'margin-bottom': '0', 'margin-left': '0', 'initially-open': 'false',
  display: 'accordion', 'show-search': 'true', 'search-placeholder': '', 'show-categories': 'true', 'show-expand-all': 'false',
  'single-open': 'false', 'show-feedback': 'true', 'seo-schema': 'true', animation: 'fade', 'hover-effect': 'lift',
  'show-help': 'false', 'help-text': '', 'help-label': '', 'help-link': '',
  'show-heading': 'true', 'show-description': 'true', 'show-icon': 'true', language: '',
};
const options = (ids: Array<string>, prefix: string) => ids.map((id) => ({ id, value: id === 'none' ? t('common.none') : t(`${prefix}.${id}` as UIKey) }));

const IconPreview: FC<{ path: string }> = ({ path }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>;
const iconName = (icon: { id: string; name: string }) => tOr(`icon.${icon.id}`, icon.name);

const readFont = (value: string): FontValue => { try { const parsed: unknown = JSON.parse(value); if (typeof parsed === 'object' && parsed !== null && 'font' in parsed && typeof parsed.font === 'string') return { font: parsed.font, textDecoration: 'textDecoration' in parsed && typeof parsed.textDecoration === 'string' ? parsed.textDecoration : '' }; } catch (error) { console.error('Failed to parse widget font:', error); } return defaults.questionFont; };

const fontFamilyLabel = (value: string): string => {
  const { font } = readFont(value);
  if (typeof document === 'undefined') return font;
  const style = document.createElement('span').style;
  style.font = font;
  return style.fontFamily || font;
};

const Panel: FC = () => {
  const uiLanguage = useDashboardLanguage();
  useEffect(() => { void setDashboardLanguage(detectHostLanguage()); }, []);
  const defaultsText = getUIStrings(uiLanguage);
  const iconOptions = FAQ_ICONS.map((icon) => listItemSelectBuilder({ id: icon.id, label: iconName(icon), title: iconName(icon), prefix: <IconPreview path={icon.path} /> }));
  const [values, setValues] = useState<PanelValues>(initialValues);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const fontPreloadQueue = useRef<Promise<void>>(Promise.resolve());
  const [connectionOptions, setConnectionOptions] = useState<Array<ConnectionOption>>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  useEffect(() => { void Promise.all(Object.keys(initialValues).map(async (key) => { try { const value = await widget.getProp(key); if (value) setValues((current) => ({ ...current, [key]: value })); } catch (error) { console.error(`Failed to load widget property ${key}:`, error); } })).then(() => setSettingsLoaded(true)); }, []);
  const questionFontValue = values['question-font'] ?? initialValues['question-font'];
  const answerFontValue = values['answer-font'] ?? initialValues['answer-font'];
  useEffect(() => {
    if (!settingsLoaded) return;
    const fonts = [...new Set([
      readFont(questionFontValue ?? JSON.stringify(defaults.questionFont)).font,
      readFont(answerFontValue ?? JSON.stringify(defaults.answerFont)).font,
    ])];
    // Each call replaces the list; serialize updates so the latest selection wins.
    fontPreloadQueue.current = fontPreloadQueue.current
      .then(() => widget.setPreloadFonts(fonts))
      .catch((error) => { console.error('Failed to preload FAQ widget fonts:', error); });
  }, [settingsLoaded, questionFontValue, answerFontValue]);
  useEffect(() => { void allQueryItems(items.query(GROUPS).ascending('title')).then((result) => { setConnectionOptions(result.map((group) => ({ id: String(group.connectionKey ?? ''), value: String(group.title ?? group.connectionKey ?? ''), label: String(group.title ?? group.connectionKey ?? '') })).filter((option) => option.id)); }).catch((error) => { console.error('Failed to load FAQ groups for the connection dropdown:', error); }).finally(() => setConnectionsLoading(false)); }, []);
  const setValue = useCallback((key: string, value: string) => { setValues((current) => ({ ...current, [key]: value })); void widget.setProp(key, value); }, []);
  // A preset only writes the props it owns (look, display, spacing, fonts). Writing the whole panel state used to
  // overwrite the connection key and text with stale defaults when a preset was picked before settings finished loading.
  const applyPreset = useCallback(async (id: string) => {
    const changes = presetProps(presetById(id));
    setValues((current) => ({ ...current, ...changes }));
    for (const [key, value] of Object.entries(changes)) {
      try { await widget.setProp(key, value); } catch (error) { console.error(`Failed to apply preset property ${key}:`, error); }
    }
  }, []);
  const chooseColor = useCallback((key: string) => { const value = values[key] ?? '#ffffff'; void inputs.selectColor(value, { onChange: (next) => { if (next) setValue(key, next); } }); }, [setValue, values]);
  const chooseFont = useCallback((key: string) => { const value = readFont(values[key] ?? JSON.stringify(defaults.questionFont)); void inputs.selectFont(value, { onChange: (next) => { const font = { font: next.font, textDecoration: next.textDecoration ?? '' }; setValue(key, JSON.stringify(font)); } }); }, [setValue, values]);
  const toggle = (key: string, label: string, info?: string) => <SidePanel.Field><FormField label={label} infoContent={info} labelPlacement="left" stretchContent={false}><ToggleSwitch size="small" checked={values[key] === 'true'} onChange={(event) => setValue(key, String(event.target.checked))} /></FormField></SidePanel.Field>;
  const select = (key: string, label: string, options: Array<{ id: string; value: string }>) => <SidePanel.Field><FormField label={label}><Dropdown ariaLabel={label} size="small" selectedId={values[key]} options={options} onSelect={(option) => setValue(key, String(option.id))} /></FormField></SidePanel.Field>;
  const toggleable = values.display === 'accordion' || values.display === 'grid';
  const shown = (key: string) => values[key] === 'true';
  const hasIcon = values.display !== 'cards';
  const showIcon = hasIcon && shown('show-icon');
  const colorKeys = ['background-color', 'question-color', 'answer-color', 'accent-color', 'border-color', ...(showIcon ? ['icon-color'] : [])];
  const selectedPreset = values.layout ?? defaults.id;
  const selectedConnectionKey = values['connection-key'] ?? '';
  const selectedConnectionOption = connectionOptions.some((option) => option.id === selectedConnectionKey) || !selectedConnectionKey ? connectionOptions : [{ id: selectedConnectionKey, value: selectedConnectionKey, label: selectedConnectionKey }, ...connectionOptions];
  const presetOptions = FAQ_PRESETS.map((preset) => ({ id: preset.id, value: tOr(`preset.${preset.id}`, preset.name), label: tOr(`preset.${preset.id}`, preset.name) }));
  const languageOptions = SUPPORTED_LANGUAGES.map((lang) => ({
    id: lang.code,
    value: lang.code ? displayLanguage(lang.code) : t('common.autoLanguage'),
    label: lang.code ? displayLanguage(lang.code) : t('common.autoLanguage'),
  }));
  return <WixDesignSystemProvider><SidePanel width="320" height="100vh"><SidePanel.Header title={t('panel.title')}/><SidePanel.Content noPadding stretchVertically>
    <PricingStatus />
    <Accordion
      skin="light"
      hideShadow
      size="small"
      multiple
      items={[
        {
          title: t('panel.sectionConnection'),
          initiallyOpen: false,
          children: <>
            <SidePanel.Field><FormField label={t('panel.connectionKey')} infoContent={t('panel.connectionInfo')}><Dropdown ariaLabel={t('panel.connectionKey')} placeholder={connectionsLoading ? t('panel.loadingGroups') : t('panel.selectGroup')} size="small" selectedId={selectedConnectionKey} options={selectedConnectionOption} valueParser={(option) => option.value} onSelect={(option) => setValue('connection-key', String(option.id))} /></FormField></SidePanel.Field>
            <SidePanel.Field><FormField label={t('panel.preset')}><Dropdown ariaLabel={t('panel.preset')} placeholder={t('panel.selectPreset')} size="small" selectedId={selectedPreset} options={presetOptions} valueParser={(option) => option.value} disabled={!settingsLoaded} onSelect={(option) => void applyPreset(String(option.id))} /></FormField></SidePanel.Field>
            <SidePanel.Field><FormField label={t('panel.language')} infoContent={t('panel.languageInfo')}><Dropdown ariaLabel={t('panel.language')} placeholder={t('common.autoLanguage')} size="small" selectedId={values.language || ''} options={languageOptions} valueParser={(option) => option.value} onSelect={(option) => setValue('language', String(option.id))} /></FormField></SidePanel.Field>
          </>,
        },
        {
          title: t('panel.sectionShow'),
          initiallyOpen: true,
          children: <>
            {toggle('show-heading', t('panel.showHeading'))}
            {toggle('show-description', t('panel.showDescription'))}
            {toggle('show-search', t('panel.showSearch'), t('panel.showSearchInfo'))}
            {toggle('show-categories', t('panel.showCategories'), t('panel.showCategoriesInfo'))}
            {toggleable && toggle('show-expand-all', t('panel.showExpandAll'))}
            {hasIcon && toggle('show-icon', t('panel.showIcon'))}
            {toggle('show-feedback', t('panel.showFeedback'), t('panel.showFeedbackInfo'))}
            {toggle('show-help', t('panel.showHelp'))}
            <SidePanel.Field><SectionHelper size="small">{t('panel.showHint')}</SectionHelper></SidePanel.Field>
          </>,
        },
        {
          title: t('panel.sectionContent'),
          initiallyOpen: false,
          children: <>
            {shown('show-heading') && <SidePanel.Field><FormField label={t('panel.heading')}><Input value={values.heading} placeholder={defaultsText.heading} onChange={(event) => setValue('heading', event.target.value)} /></FormField></SidePanel.Field>}
            {shown('show-description') && <SidePanel.Field><FormField label={t('panel.description')}><Input value={values.description} onChange={(event) => setValue('description', event.target.value)} /></FormField></SidePanel.Field>}
            {shown('show-search') && <SidePanel.Field><FormField label={t('panel.searchPlaceholder')}><Input value={values['search-placeholder']} placeholder={defaultsText.searchPlaceholder} onChange={(event) => setValue('search-placeholder', event.target.value)} /></FormField></SidePanel.Field>}
            {!shown('show-heading') && !shown('show-description') && !shown('show-search') ? <SidePanel.Field><SectionHelper size="small">{t('panel.contentHidden')}</SectionHelper></SidePanel.Field> : <SidePanel.Field><SectionHelper size="small">{t('panel.autoTextHint')}</SectionHelper></SidePanel.Field>}
          </>,
        },
        {
          title: t('panel.sectionTypography'),
          initiallyOpen: false,
          children: <>
            <SidePanel.Field><FormField label={t('panel.questionFont')}><Button fullWidth ellipsis priority="secondary" onClick={() => chooseFont('question-font')}>{fontFamilyLabel(values['question-font'] ?? JSON.stringify(defaults.questionFont))}</Button></FormField></SidePanel.Field>
            <SidePanel.Field><FormField label={t('panel.answerFont')}><Button fullWidth ellipsis priority="secondary" onClick={() => chooseFont('answer-font')}>{fontFamilyLabel(values['answer-font'] ?? JSON.stringify(defaults.answerFont))}</Button></FormField></SidePanel.Field>
          </>,
        },
        {
          title: t('panel.sectionColors'),
          initiallyOpen: false,
          children: <>{colorKeys.map((key) => <SidePanel.Field key={key}><FormField label={t(`panel.color.${key}` as UIKey)}><Box width="32px"><FillPreview fill={values[key]} size="tiny" aspectRatio={1} onClick={() => chooseColor(key)} /></Box></FormField></SidePanel.Field>)}</>,
        },
        {
          title: t('panel.sectionContainer'),
          initiallyOpen: false,
          children: <>
            <SidePanel.Field><FormField label={t('panel.radius')}><Input type="number" min={0} value={values.radius} onChange={(event) => setValue('radius', event.target.value)} /></FormField></SidePanel.Field>
            <SidePanel.Field><FormField label={t('panel.gap')}><Input type="number" min={0} value={values.gap} onChange={(event) => setValue('gap', event.target.value)} /></FormField></SidePanel.Field>
            <SidePanel.Field><FormField label={t('panel.padding')}><Input type="number" min={0} value={values.padding} onChange={(event) => setValue('padding', event.target.value)} /></FormField></SidePanel.Field>
            {(['margin-top', 'margin-right', 'margin-bottom', 'margin-left'] as Array<string>).map((key) => <SidePanel.Field key={key}><FormField label={t(`panel.margin.${key}` as UIKey)}><Input type="number" min={0} value={values[key]} onChange={(event) => setValue(key, event.target.value)} /></FormField></SidePanel.Field>)}
          </>,
        },
        {
          title: t('panel.sectionBehavior'),
          initiallyOpen: false,
          children: <>
            {showIcon && <><SidePanel.Field><FormField label={t('panel.icon')}><Dropdown ariaLabel={t('panel.icon')} size="small" selectedId={iconById(values.icon).id} options={iconOptions} prefix={<Box paddingLeft="SP1" verticalAlign="middle"><IconPreview path={iconById(values.icon).path} /></Box>} onSelect={(option) => setValue('icon', String(option.id))} /></FormField></SidePanel.Field>
            <SidePanel.Field><FormField label={t('panel.iconSize')}><Slider min={10} max={40} step={1} displayMarks={false} value={Number(values['icon-size']) || defaults.iconSize} onChange={(value) => setValue('icon-size', String(Array.isArray(value) ? value[0] : value))} /></FormField></SidePanel.Field></>}
            {toggleable && toggle('initially-open', t('panel.initiallyOpen'))}
            {toggleable && toggle('single-open', t('panel.singleOpen'), t('panel.singleOpenInfo'))}
            {!showIcon && !toggleable && <SidePanel.Field><SectionHelper size="small">{hasIcon ? t('panel.iconHidden') : t('panel.cardsNoIcon')}</SectionHelper></SidePanel.Field>}
          </>,
        },
        {
          title: t('panel.sectionLayout'),
          initiallyOpen: false,
          children: <>
            {select('display', t('panel.display'), options(['accordion', 'grid', 'cards', 'tabs'], 'panel.display'))}
            {toggle('seo-schema', t('panel.seo'), t('panel.seoInfo'))}
          </>,
        },
        {
          title: t('panel.sectionAnimation'),
          initiallyOpen: false,
          children: <>
            {select('animation', t('panel.animation'), options(['none', 'fade', 'slide', 'zoom'], 'panel.animation'))}
            {select('hover-effect', t('panel.hover'), options(['none', 'lift', 'highlight', 'accent'], 'panel.hover'))}
          </>,
        },
        {
          title: t('panel.sectionHelp'),
          initiallyOpen: false,
          children: <>
            {!shown('show-help') && <SidePanel.Field><SectionHelper size="small">{t('panel.helpOff')}</SectionHelper></SidePanel.Field>}
            {shown('show-help') && <>
              <SidePanel.Field><FormField label={t('panel.helpMessage')}><Input size="small" value={values['help-text']} placeholder={defaultsText.helpText} onChange={(event) => setValue('help-text', event.target.value)} /></FormField></SidePanel.Field>
              <SidePanel.Field><FormField label={t('panel.helpLabel')}><Input size="small" value={values['help-label']} placeholder={defaultsText.helpLabel} onChange={(event) => setValue('help-label', event.target.value)} /></FormField></SidePanel.Field>
              <SidePanel.Field><FormField label={t('panel.helpLink')} infoContent={t('panel.helpLinkInfo')}><Input size="small" placeholder="https://… or mailto:hello@…" value={values['help-link']} onChange={(event) => setValue('help-link', event.target.value)} /></FormField></SidePanel.Field>
            </>}
          </>,
        },
      ]}
    />
  </SidePanel.Content></SidePanel></WixDesignSystemProvider>;
};

export default Panel;
