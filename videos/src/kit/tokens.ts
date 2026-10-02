// FAQ Studio brand tokens, as hex so they can animate (interpolateColors can't parse color-mix()).
// Sources: src/extensions/dashboard/pages/my-page/my-page.css (dashboard :root tokens),
// public/faq-widget-thumbnail-v2.png (widget world), src/lib/faq-presets.ts (widget presets).
export const color = {
  ink: "#16233b",
  text: "#3c4a62",
  muted: "#6b7a90",
  faint: "#98a4b6",
  line: "#e5e9f0",
  lineStrong: "#cfd7e3",
  surface: "#ffffff",
  canvas: "#f6f8fb",
  brand: "#4f5fe0",
  brandHover: "#4150cc",
  brandSoft: "#eef0ff",
  live: "#1f7a48",
  liveSoft: "#e6f6ed",
  // Widget world (thumbnail backdrop)
  skyTop: "#f3f7fd",
  skyBlue: "#dbe8fb",
  skyTeal: "#d3f1ee",
  teal: "#5ad6c0",
} as const;

export const radius = { control: 9, panel: 14, dialog: 16 } as const;

// The widget's own open/close curve (faq-widget.module.css: cubic-bezier(.4, 0, .2, 1)).
export const easeStandard = [0.4, 0, 0.2, 1] as const;
