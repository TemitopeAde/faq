import React from "react";
import { AbsoluteFill } from "remotion";
import { Accordion, Box, Dropdown, DropdownLayout, FormField, SidePanel, ToggleSwitch, WixDesignSystemProvider } from "@wix/design-system";
import "@wix/design-system/styles.global.css";
import { FAQ_PRESETS } from "@/lib/faq-presets";
import { color } from "../../kit/tokens";
import { Lockup } from "../../brand/Logo";
import { Backdrop } from "../../scenes/Backdrop";
import { WidgetTwin } from "../../twins/WidgetTwin";
import { Caption } from "./Caption";
import { storeItems } from "./content";

/** A plain website page the widget sits on (neutral, not any real brand). */
const SitePage = ({ children, x, y, w, h }: { children: React.ReactNode; x: number; y: number; w: number; h: number }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: color.surface, borderRadius: 18, boxShadow: "0 30px 80px rgba(31, 48, 80, .14)", overflow: "hidden" }}>
    <div style={{ height: 64, borderBottom: `1px solid ${color.line}`, display: "flex", alignItems: "center", gap: 18, padding: "0 32px" }}>
      <div style={{ width: 120, height: 14, borderRadius: 7, background: color.ink, opacity: 0.85 }} />
      <div style={{ flex: 1 }} />
      {[70, 60, 80].map((wd, i) => <div key={i} style={{ width: wd, height: 10, borderRadius: 5, background: color.lineStrong }} />)}
    </div>
    <div style={{ padding: "36px 56px", display: "flex", justifyContent: "center" }}>{children}</div>
  </div>
);

const SiteFrame = () => (
  <AbsoluteFill>
    <Backdrop />
    <Caption text="Answers, found instantly." x={120} y={420} width={560} />
    <SitePage x={720} y={200} w={1100} h={680}>
      <WidgetTwin items={storeItems} preset="classic" heading="Frequently asked questions" query="refund" caret openId="q3" open={1} voted={0} width={960} />
    </SitePage>
  </AbsoluteFill>
);

const presetOptions = FAQ_PRESETS.slice(0, 7).map((preset) => ({ id: preset.id, value: preset.name }));

const EditorFrame = () => (
  <AbsoluteFill style={{ background: color.canvas }}>
    <Caption text="Make it yours. 24 styles." x={120} y={90} width={1200} size={60} />
    {/* Canvas with the selected widget */}
    <div style={{ position: "absolute", left: 120, top: 220, width: 1080, height: 780, background: color.surface, borderRadius: 18, border: `1px solid ${color.line}`, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 60, top: 50, outline: `2px solid ${color.brand}`, outlineOffset: 6, borderRadius: 12 }}>
        <WidgetTwin items={storeItems.slice(0, 5)} preset="dark" heading="Frequently asked questions" showSearch={false} openId="q0" open={1} voted={1} width={940} />
      </div>
    </div>
    {/* The widget's real settings panel components (Wix Design System), scaled for legibility */}
    <div data-film style={{ position: "absolute", left: 1290, top: 220, width: 320, transform: "scale(1.5)", transformOrigin: "0 0" }}>
      <WixDesignSystemProvider>
        <SidePanel width="320" height="520px">
          <SidePanel.Header title="FAQ Widget" />
          <SidePanel.Content noPadding>
            <Accordion skin="light" hideShadow size="small" items={[{ title: "Connection", initiallyOpen: true, children: <>
              <SidePanel.Field><FormField label="Layout preset"><Dropdown size="small" selectedId="dark" options={presetOptions} /></FormField></SidePanel.Field>
              <Box paddingLeft="SP4" paddingRight="SP4"><DropdownLayout visible inContainer selectedId="dark" options={presetOptions} /></Box>
            </> }, { title: "Show on widget", initiallyOpen: true, children: <>
              <SidePanel.Field><FormField label="Search box" labelPlacement="left" stretchContent={false}><ToggleSwitch size="small" checked={false} /></FormField></SidePanel.Field>
            </> }]} />
          </SidePanel.Content>
        </SidePanel>
      </WixDesignSystemProvider>
    </div>
  </AbsoluteFill>
);

const EndFrame = () => (
  <AbsoluteFill>
    <Backdrop />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34, flexDirection: "column" }}>
      <Lockup height={190} />
      <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 36, fontWeight: 500, color: color.text, letterSpacing: "-0.01em" }}>Answers, beautifully organized.</div>
      <div style={{ marginTop: 10, fontFamily: "Inter, system-ui, sans-serif", fontSize: 28, fontWeight: 650, color: "#fff", background: color.brand, borderRadius: 999, padding: "20px 44px" }}>Add to Site</div>
    </AbsoluteFill>
  </AbsoluteFill>
);

/** Checkpoint stills: frame 0 = site, 1 = editor, 2 = end card. */
export const StyleFrames = ({ which }: { which: number }) => (which === 0 ? <SiteFrame /> : which === 1 ? <EditorFrame /> : <EndFrame />);
