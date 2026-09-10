import React, { type FC, useCallback, useEffect, useState } from 'react';
import { items } from '@wix/data';
import { inputs, widget } from '@wix/editor';
import { Accordion, Box, Button, Dropdown, FillPreview, FormField, Input, SectionHelper, SidePanel, ToggleSwitch, WixDesignSystemProvider } from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { FAQ_PRESETS, presetById } from '../../../../lib/faq-presets';
import type { FontValue } from '../../../../lib/faq-types';

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
};

const readFont = (value: string): FontValue => { try { const parsed: unknown = JSON.parse(value); if (typeof parsed === 'object' && parsed !== null && 'font' in parsed && typeof parsed.font === 'string') return { font: parsed.font, textDecoration: 'textDecoration' in parsed && typeof parsed.textDecoration === 'string' ? parsed.textDecoration : '' }; } catch (error) { console.error('Failed to parse widget font:', error); } return defaults.questionFont; };

const Panel: FC = () => {
  const [values, setValues] = useState<PanelValues>(initialValues);
  const [connectionOptions, setConnectionOptions] = useState<Array<ConnectionOption>>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  useEffect(() => { void Promise.all(Object.keys(initialValues).map(async (key) => { try { const value = await widget.getProp(key); if (value) setValues((current) => ({ ...current, [key]: value })); } catch (error) { console.error(`Failed to load widget property ${key}:`, error); } })); }, []);
  useEffect(() => { void items.query(GROUPS).ascending('title').limit(100).find().then((result) => { setConnectionOptions(result.items.map((group) => ({ id: String(group.connectionKey ?? ''), value: String(group.title ?? group.connectionKey ?? ''), label: String(group.title ?? group.connectionKey ?? '') })).filter((option) => option.id)); }).catch((error) => { console.error('Failed to load FAQ groups for the connection dropdown:', error); }).finally(() => setConnectionsLoading(false)); }, []);
  const setValue = useCallback((key: string, value: string) => { setValues((current) => ({ ...current, [key]: value })); void widget.setProp(key, value); }, []);
  const applyPreset = useCallback((id: string) => { const preset = presetById(id); const next: PanelValues = { ...values, layout: preset.id, 'background-color': preset.backgroundColor, 'question-color': preset.questionColor, 'answer-color': preset.answerColor, 'accent-color': preset.accentColor, 'border-color': preset.borderColor, 'icon-color': preset.iconColor, 'icon': preset.icon, 'icon-size': String(preset.iconSize), radius: String(preset.radius), gap: String(preset.gap), 'question-font': JSON.stringify(preset.questionFont), 'answer-font': JSON.stringify(preset.answerFont) }; setValues(next); void Promise.all(Object.entries(next).map(([key, value]) => widget.setProp(key, value))); }, [values]);
  const chooseColor = useCallback((key: string) => { const value = values[key] ?? '#ffffff'; void inputs.selectColor(value, { onChange: (next) => { if (next) setValue(key, next); } }); }, [setValue, values]);
  const chooseFont = useCallback((key: string) => { const value = readFont(values[key] ?? JSON.stringify(defaults.questionFont)); void inputs.selectFont(value, { onChange: (next) => { const font = { font: next.font, textDecoration: next.textDecoration ?? '' }; setValue(key, JSON.stringify(font)); void widget.setPreloadFonts([font.font]); } }); }, [setValue, values]);
  const selectedPreset = values.layout ?? defaults.id;
  const selectedConnectionKey = values['connection-key'] ?? '';
  const selectedConnectionOption = connectionOptions.some((option) => option.id === selectedConnectionKey) || !selectedConnectionKey ? connectionOptions : [{ id: selectedConnectionKey, value: selectedConnectionKey, label: selectedConnectionKey }, ...connectionOptions];
  const presetOptions = FAQ_PRESETS.map((preset) => ({ id: preset.id, value: preset.name, label: preset.name }));
  return <WixDesignSystemProvider><SidePanel width="320" height="100vh"><SidePanel.Header title="FAQ Widget"/><SidePanel.Content noPadding stretchVertically>
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
            <SidePanel.Field><FormField label="FAQ connection key"><Dropdown ariaLabel="FAQ connection key" placeholder={connectionsLoading ? 'Loading FAQ groups…' : 'Select an FAQ group'} size="small" selectedId={selectedConnectionKey} options={selectedConnectionOption} valueParser={(option) => option.value} onSelect={(option) => setValue('connection-key', String(option.id))} /></FormField></SidePanel.Field>
            <SidePanel.Field><FormField label="Layout preset"><Dropdown ariaLabel="Layout preset" placeholder="Select a layout preset" size="small" selectedId={selectedPreset} options={presetOptions} valueParser={(option) => option.value} onSelect={(option) => applyPreset(String(option.id))} /></FormField></SidePanel.Field>
          </>,
        },
        {
          title: 'Content',
          initiallyOpen: false,
          children: <>
            <SidePanel.Field><FormField label="Heading"><Input value={values.heading} onChange={(event) => setValue('heading', event.target.value)} /></FormField></SidePanel.Field>
            <SidePanel.Field><FormField label="Description"><Input value={values.description} onChange={(event) => setValue('description', event.target.value)} /></FormField></SidePanel.Field>
          </>,
        },
        {
          title: 'Typography',
          initiallyOpen: false,
          children: <>
            <SidePanel.Field><FormField label="Question font"><Button fullWidth priority="secondary" onClick={() => chooseFont('question-font')}>Change question font</Button></FormField></SidePanel.Field>
            <SidePanel.Field><FormField label="Answer font"><Button fullWidth priority="secondary" onClick={() => chooseFont('answer-font')}>Change answer font</Button></FormField></SidePanel.Field>
          </>,
        },
        {
          title: 'Colors',
          initiallyOpen: false,
          children: <>{(['background-color', 'question-color', 'answer-color', 'accent-color', 'border-color', 'icon-color'] as Array<string>).map((key) => <SidePanel.Field key={key}><FormField label={key.replaceAll('-', ' ')}><Box width="32px"><FillPreview fill={values[key]} size="tiny" aspectRatio={1} onClick={() => chooseColor(key)} /></Box></FormField></SidePanel.Field>)}</>,
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
            <SidePanel.Field><FormField label="Icon"><Input value={values.icon} placeholder="plus, chevron, arrow, or minus" onChange={(event) => setValue('icon', event.target.value)} /></FormField></SidePanel.Field>
            <SidePanel.Field><FormField label="Icon size"><Input type="number" min={0} value={values['icon-size']} onChange={(event) => setValue('icon-size', event.target.value)} /></FormField></SidePanel.Field>
            <SidePanel.Field><FormField label="Open first item"><ToggleSwitch checked={values['initially-open'] === 'true'} onChange={(event) => setValue('initially-open', String(event.target.checked))} /></FormField></SidePanel.Field>
          </>,
        },
      ]}
    />
  </SidePanel.Content><SidePanel.Footer><SectionHelper>Each widget keeps its own connection, layout, font, color, and icon settings.</SectionHelper></SidePanel.Footer></SidePanel></WixDesignSystemProvider>;
};

export default Panel;
