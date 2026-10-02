import React from "react";
import { AbsoluteFill } from "remotion";
import { Accordion, Dropdown, DropdownLayout, FormField, SidePanel, ToggleSwitch, WixDesignSystemProvider } from "@wix/design-system";
import "@wix/design-system/styles.global.css";
import { presetById } from "@/lib/faq-presets";
import { fadeIn, fadeOut } from "../../../kit/anim";
import { progress } from "../../../kit/time";
import { color } from "../../../kit/tokens";
import { Caption } from "../Caption";
import { acts, cue } from "../cues";
import { editorCanvas, PANEL } from "../layout";

// Real presets from src/lib/faq-presets.ts, in the order the list shows them here.
const LIST = ["classic", "dark", "pastel", "help-center", "pricing", "conversation"];
const options = LIST.map((id) => ({ id, value: presetById(id).name }));

/**
 * Act 3 · Fully styleable: a neutral editing canvas (not a copy of the Wix Editor) and the widget's
 * real settings panel built from the same Wix Design System components as faq-widget.panel.tsx.
 * The dropdown list and toggle are driven by the cues; WDS transitions are frozen by [data-film].
 */
export const Editor = ({ t }: { t: number }) => {
  if (t < acts.editor[0] || t >= acts.editor[1]) return null;
  const bg = fadeIn(t, cue.widgetLift, 0.5);
  const enter = fadeIn(t, cue.editorIn, 0.5);
  const out = fadeOut(t, cue.editorOut, 0.4);
  const selected = t < cue.presetPick1 ? "classic" : t < cue.presetPick2 ? "dark" : "pastel";
  const listOpen = (t >= cue.presetOpen1 && t < cue.presetPick1 + 0.12) || (t >= cue.presetOpen2 && t < cue.presetPick2 + 0.12);
  const hovered = t < cue.presetPick1 ? (t > cue.presetPick1 - 0.35 ? "dark" : undefined) : t > cue.presetPick2 - 0.35 ? "pastel" : undefined;
  const chipsOn = t < cue.toggleSearch;
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <AbsoluteFill style={{ background: color.canvas, opacity: bg }} />
      <Caption text="Make it yours. 24 styles." x={120} y={70} width={1300} size={60} reveal={progress(t, cue.editorCaption, 0.6)} />
      <div style={{ position: "absolute", left: editorCanvas.x, top: editorCanvas.y, width: editorCanvas.w, height: editorCanvas.h, background: color.surface, borderRadius: 18, border: `1px solid ${color.line}`, opacity: enter }} />
      <div data-film style={{ position: "absolute", left: PANEL.x + (1 - enter) * 80, top: PANEL.y, width: PANEL.width, scale: String(PANEL.scale), transformOrigin: "0 0", opacity: enter }}>
        <WixDesignSystemProvider>
          <SidePanel width={String(PANEL.width)} height="540px">
            <SidePanel.Header title="FAQ Widget" />
            <SidePanel.Content noPadding>
              <Accordion skin="light" hideShadow size="small" items={[
                { title: "Connection", initiallyOpen: true, children: (
                  <SidePanel.Field>
                    <div data-target="preset-dropdown"><FormField label="Layout preset"><Dropdown size="small" selectedId={selected} options={options} /></FormField></div>
                  </SidePanel.Field>
                ) },
                { title: "Show on widget", initiallyOpen: true, children: (
                  <>
                    <SidePanel.Field><FormField label="Heading" labelPlacement="left" stretchContent={false}><ToggleSwitch size="small" checked /></FormField></SidePanel.Field>
                    <SidePanel.Field><FormField label="Search box" labelPlacement="left" stretchContent={false}><ToggleSwitch size="small" checked /></FormField></SidePanel.Field>
                    <SidePanel.Field><FormField label="Category filter" labelPlacement="left" stretchContent={false}><span data-target="toggle-chips"><ToggleSwitch size="small" checked={chipsOn} /></span></FormField></SidePanel.Field>
                  </>
                ) },
              ]} />
            </SidePanel.Content>
          </SidePanel>
          {listOpen ? (
            <div style={{ position: "absolute", left: 24, top: 178, width: 272, zIndex: 5, background: "#fff", borderRadius: 8, boxShadow: "0 6px 24px rgba(22, 45, 61, .18)" }}>
              <DropdownLayout visible inContainer selectedId={selected} options={options.map((option) => ({ ...option, value: <span data-target={`opt-${option.id}`} style={hovered === option.id ? { fontWeight: 600 } : undefined}>{option.value}</span> }))} />
            </div>
          ) : null}
        </WixDesignSystemProvider>
      </div>
    </AbsoluteFill>
  );
};
