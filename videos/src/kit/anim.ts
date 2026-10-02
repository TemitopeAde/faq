import { clamp01, progress } from "./time";

/** Frame-driven easing helpers (pure functions of t). */
export const easeOut = (p: number) => 1 - Math.pow(1 - clamp01(p), 3);
export const easeInOut = (p: number) => { const x = clamp01(p); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
// The widget's own curve, cubic-bezier(.4, 0, .2, 1), approximated for scalar use.
export const standard = (p: number) => { const x = clamp01(p); return 1 - Math.pow(1 - x, 2.4) * (1 - x * 0.15); };

export const fadeIn = (t: number, start: number, length = 0.35) => easeOut(progress(t, start, length));
export const fadeOut = (t: number, start: number, length = 0.35) => 1 - easeInOut(progress(t, start, length));
/** 0 → 1 → 0 over a window. */
export const during = (t: number, start: number, end: number, fade = 0.3) => fadeIn(t, start, fade) * fadeOut(t, end - fade, fade);
