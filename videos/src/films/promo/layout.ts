import type { Rect } from "../../kit/move";

// Screen layout at 1920×1080. Cursor targets are measured with --debug stills (TargetLog) and noted here.
export const sitePage: Rect = { x: 720, y: 170, w: 1100, h: 760 };
export const WIDGET_WIDTH = 960;
// Widget inside the site page: page x + (page w − widget w) / 2, page y + nav 64 + padding 36.
export const widgetOnSite: Rect = { x: 790, y: 270, w: WIDGET_WIDTH, h: 0 };
export const editorCanvas: Rect = { x: 120, y: 200, w: 1100, h: 820 };
export const widgetInEditor: Rect = { x: 190, y: 270, w: WIDGET_WIDTH, h: 0 };
export const PANEL = { x: 1290, y: 200, scale: 1.5, width: 320 };
// Dashboard window: rendered at 1250×750 and scaled ×1.15 → 1437×862.
export const DASH = { x: 241, y: 178, width: 1250, height: 750, scale: 1.15 };
