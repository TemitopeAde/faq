import React, { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { items } from '@wix/data';
import { inputs, widget } from '@wix/editor';
import { Accordion, Box, Button, Dropdown, FillPreview, FormField, Input, SectionHelper, SidePanel, Slider, ToggleSwitch, WixDesignSystemProvider, listItemSelectBuilder } from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { FAQ_PRESETS, presetById } from '../../../../lib/faq-presets';
import { FAQ_ICONS, iconById } from '../../../../lib/faq-icons';
import type { FontValue } from '../../../../lib/faq-types';
import { allQueryItems } from '../../../../lib/faq-query';
import { PricingStatus } from './pricing-status';

type PanelValues = Record<string, string>;
type ConnectionOption = { id: string; value: string; label: string };
const GROUPS = '@admin14744/faq/faq-groups';
const defaults = presetById('classic');
const initialValues: PanelValues = {
  'connection-key': '', layout: defaults.id, heading: defaults.heading, description: defaults.description,
  'background-color': 'transparent', 'question-color': defaults.questionColor, 'answer-color': defaults.answerColor,
  'accent-color': defaults.accentColor, 'border-color': defaults.borderColor, 'question-font': JSON.stringify(defaults.questionFont),
  'answer-font': JSON.stringify(defaults.answerFont), icon: defaults.icon, 'icon-color': defaults.iconColor,
  'icon-size': String(defaults.iconSize), radius: String(defaults.radius), gap: String(defaults.gap), padding: '28',
  'margin-top': '0', 'margin-right': '0', 'margin-bottom': '0', 'margin-left': '0', 'initially-open': 'false',
  display: 'accordion', 'show-search': 'true', 'search-placeholder': 'Search questions…', 'show-categories': 'true', 'show-expand-all': 'false',
  'single-open': 'false', 'show-feedback': 'true', 'seo-schema': 'true', animation: 'fade', 'hover-effect': 'lift',
  'show-help': 'false', 'help-text': 'Still have questions?', 'help-label': 'Contact us', 'help-link': '',
  'show-heading': 'true', 'show-description': 'true', 'show-icon': 'true',
};
const displayOptions = [
  { id: 'accordion', value: 'Accordion (list)' }, { id: 'grid', value: 'Two-column grid' },
  { id: 'cards', value: 'Cards (answers always visible)' }, { id: 'tabs', value: 'Tabbed (questions beside answer)' },
];
const animationOptions = [{ id: 'none', value: 'None' }, { id: 'fade', value: 'Fade in' }, { id: 'slide', value: 'Slide up' }, { id: 'zoom', value: 'Zoom in' }];
const hoverOptions = [{ id: 'none', value: 'None' }, { id: 'lift', value: 'Lift' }, { id: 'highlight', value: 'Highlight' }, { id: 'accent', value: 'Accent border' }];

const IconPreview: FC<{ path: string }> = ({ path }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>;
const iconOptions = FAQ_ICONS.map((icon) => listItemSelectBuilder({ id: icon.id, label: icon.name, title: icon.name, prefix: <IconPreview path={icon.path} /> }));

const readFont = (value: string): FontValue => { try { const parsed: unknown = JSON.parse(value); if (typeof parsed === 'object' && parsed !== null && 'font' in parsed && typeof parsed.font === 'string') return { font: parsed.font, textDecoration: 'textDecoration' in parsed && typeof parsed.textDecoration === 'string' ? parsed.textDecoration : '' }; } catch (error) { console.error('Failed to parse widget font:', error); } return defaults.questionFont; };

const fontFamilyLabel = (value: string): string => {
  const { font } = readFont(value);
  if (typeof document === 'undefined') return font;
  const style = document.createElement('span').style;
  style.font = font;
  return style.fontFamily || font;
};

const Panel: FC = () => {
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
  const applyPreset = useCallback((id: string) => { const preset = presetById(id); const next: PanelValues = { ...values, layout: preset.id, 'background-color': preset.backgroundColor, 'question-color': preset.questionColor, 'answer-color': preset.answerColor, 'accent-color': preset.accentColor, 'border-color': preset.borderColor, 'icon-color': preset.iconColor, 'icon': preset.icon, 'icon-size': String(preset.iconSize), radius: String(preset.radius), gap: String(preset.gap), 'question-font': JSON.stringify(preset.questionFont), 'answer-font': JSON.stringify(preset.answerFont) }; setValues(next); void Promise.all(Object.entries(next).map(([key, value]) => widget.setProp(key, value))); }, [values]);
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
  const presetOptions = FAQ_PRESETS.map((preset) => ({ id: preset.id, value: preset.name, label: preset.name }));
  return <WixDesignSystemProvider><SidePanel width="320" height="100vh"><SidePanel.Header title="FAQ Widget"/><SidePanel.Content noPadding stretchVertically>
    <PricingStatus />
    <Accordion
      skin="light"
      hideShadow
      size="small"
      multiple
      items={[
        {
          title: 'Connection',
          initiallyOpen: false,
          children: <>
            <SidePanel.Field><FormField label="FAQ connection key" infoContent="Each widget has its own settings. To link to a question, append its anchor from the dashboard to the page URL."><Dropdown ariaLabel="FAQ connection key" placeholder={connectionsLoading ? 'Loading FAQ groups…' : 'Select an FAQ group'} size="small" selectedId={selectedConnectionKey} options={selectedConnectionOption} valueParser={(option) => option.value} onSelect={(option) => setValue('connection-key', String(option.id))} /></FormField></SidePanel.Field>
            <SidePanel.Field><FormField label="Layout preset"><Dropdown ariaLabel="Layout preset" placeholder="Select a layout preset" size="small" selectedId={selectedPreset} options={presetOptions} valueParser={(option) => option.value} onSelect={(option) => applyPreset(String(option.id))} /></FormField></SidePanel.Field>
          </>,
        },
        {
          title: 'Show on widget',
          initiallyOpen: true,
          children: <>
            {toggle('show-heading', 'Heading')}
            {toggle('show-description', 'Description')}
            {toggle('show-search', 'Search box', 'Visitors can filter questions as they type. Matches are highlighted.')}
            {toggle('show-categories', 'Category filter', 'Shows category chips when the FAQ group uses two or more categories.')}
            {toggleable && toggle('show-expand-all', 'Expand / collapse all buttons')}
            {hasIcon && toggle('show-icon', 'Open / close icon')}
            {toggle('show-feedback', '"Was this helpful?" votes', 'Votes appear in the dashboard Analytics tab.')}
            {toggle('show-help', '"Still need help?" box')}
            <SidePanel.Field><SectionHelper size="small">Questions and answers always show. Switch off any extra element you don't need.</SectionHelper></SidePanel.Field>
          </>,
        },
        {
          title: 'Content',
          initiallyOpen: false,
          children: <>
            {shown('show-heading') && <SidePanel.Field><FormField label="Heading"><Input value={values.heading} onChange={(event) => setValue('heading', event.target.value)} /></FormField></SidePanel.Field>}
            {shown('show-description') && <SidePanel.Field><FormField label="Description"><Input value={values.description} onChange={(event) => setValue('description', event.target.value)} /></FormField></SidePanel.Field>}
            {shown('show-search') && <SidePanel.Field><FormField label="Search placeholder"><Input value={values['search-placeholder']} onChange={(event) => setValue('search-placeholder', event.target.value)} /></FormField></SidePanel.Field>}
            {!shown('show-heading') && !shown('show-description') && !shown('show-search') && <SidePanel.Field><SectionHelper size="small">The heading, description and search box are hidden. Turn them on in Show on widget to edit their text.</SectionHelper></SidePanel.Field>}
          </>,
        },
        {
          title: 'Typography',
          initiallyOpen: false,
          children: <>
            <SidePanel.Field><FormField label="Question font"><Button fullWidth ellipsis priority="secondary" onClick={() => chooseFont('question-font')}>{fontFamilyLabel(values['question-font'] ?? JSON.stringify(defaults.questionFont))}</Button></FormField></SidePanel.Field>
            <SidePanel.Field><FormField label="Answer font"><Button fullWidth ellipsis priority="secondary" onClick={() => chooseFont('answer-font')}>{fontFamilyLabel(values['answer-font'] ?? JSON.stringify(defaults.answerFont))}</Button></FormField></SidePanel.Field>
          </>,
        },
        {
          title: 'Colors',
          initiallyOpen: false,
          children: <>{colorKeys.map((key) => <SidePanel.Field key={key}><FormField label={key.replaceAll('-', ' ')}><Box width="32px"><FillPreview fill={values[key]} size="tiny" aspectRatio={1} onClick={() => chooseColor(key)} /></Box></FormField></SidePanel.Field>)}</>,
        },
        {
          title: 'Container',
          initiallyOpen: false,
          children: <>
            <SidePanel.Field><FormField label="Corner radius"><Input type="number" min={0} value={values.radius} onChange={(event) => setValue('radius', event.target.value)} /></FormField></SidePanel.Field>
            <SidePanel.Field><FormField label="Item gap"><Input type="number" min={0} value={values.gap} onChange={(event) => setValue('gap', event.target.value)} /></FormField></SidePanel.Field>
            <SidePanel.Field><FormField label="Container padding"><Input type="number" min={0} value={values.padding} onChange={(event) => setValue('padding', event.target.value)} /></FormField></SidePanel.Field>
            {(['margin-top', 'margin-right', 'margin-bottom', 'margin-left'] as Array<string>).map((key) => <SidePanel.Field key={key}><FormField label={key.replace('-', ' ')}><Input type="number" min={0} value={values[key]} onChange={(event) => setValue(key, event.target.value)} /></FormField></SidePanel.Field>)}
          </>,
        },
        {
          title: 'Icon & behavior',
          initiallyOpen: false,
          children: <>
            {showIcon && <><SidePanel.Field><FormField label="Icon"><Dropdown ariaLabel="Icon" size="small" selectedId={iconById(values.icon).id} options={iconOptions} prefix={<Box paddingLeft="SP1" verticalAlign="middle"><IconPreview path={iconById(values.icon).path} /></Box>} onSelect={(option) => setValue('icon', String(option.id))} /></FormField></SidePanel.Field>
            <SidePanel.Field><FormField label="Icon size"><Slider min={10} max={40} step={1} displayMarks={false} value={Number(values['icon-size']) || defaults.iconSize} onChange={(value) => setValue('icon-size', String(Array.isArray(value) ? value[0] : value))} /></FormField></SidePanel.Field></>}
            {toggleable && toggle('initially-open', 'Open first question')}
            {toggleable && toggle('single-open', 'One answer open at a time', 'Opening a question closes the one that was open.')}
            {!showIcon && !toggleable && <SidePanel.Field><SectionHelper size="small">{hasIcon ? 'The icon is hidden. Turn it on in Show on widget to change it.' : 'Cards show every answer, so there is no icon or open/close behavior.'}</SectionHelper></SidePanel.Field>}
          </>,
        },
        {
          title: 'Layout & features',
          initiallyOpen: false,
          children: <>
            {select('display', 'Display style', displayOptions)}
            {toggle('seo-schema', 'Search engine FAQ data', 'Adds FAQPage structured data to the page. It is invisible to visitors and helps search engines understand your questions.')}
          </>,
        },
        {
          title: 'Animation',
          initiallyOpen: false,
          children: <>
            {select('animation', 'Entrance animation', animationOptions)}
            {select('hover-effect', 'Hover effect', hoverOptions)}
          </>,
        },
        {
          title: 'Help box',
          initiallyOpen: false,
          children: <>
            {!shown('show-help') && <SidePanel.Field><SectionHelper size="small">Turn on "Still need help?" in Show on widget to set up the box.</SectionHelper></SidePanel.Field>}
            {shown('show-help') && <>
              <SidePanel.Field><FormField label="Message"><Input size="small" value={values['help-text']} onChange={(event) => setValue('help-text', event.target.value)} /></FormField></SidePanel.Field>
              <SidePanel.Field><FormField label="Button label"><Input size="small" value={values['help-label']} onChange={(event) => setValue('help-label', event.target.value)} /></FormField></SidePanel.Field>
              <SidePanel.Field><FormField label="Button link" infoContent="A page URL, mailto: or tel: link. Leave empty to hide the button."><Input size="small" placeholder="https://… or mailto:hello@…" value={values['help-link']} onChange={(event) => setValue('help-link', event.target.value)} /></FormField></SidePanel.Field>
            </>}
          </>,
        },
      ]}
    />
  </SidePanel.Content></SidePanel></WixDesignSystemProvider>;
};

export default Panel;
