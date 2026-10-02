import { Easing } from "remotion";
import type { CursorKey } from "../../kit/cursor";
import { during } from "../../kit/anim";
import { progress } from "../../kit/time";
import { acts, cue } from "./cues";

/** The cursor's glide curve (kit/cursor.tsx); a dragged row uses it too, so the row stays under the cursor. */
export const GLIDE = 0.46;
export const glide = Easing.bezier(0.42, 0, 0.12, 1);
export const dragAmount = (t: number) => glide(progress(t, cue.dragEnd - GLIDE, GLIDE));

// Targets measured from --debug stills (out/promo/debug, TargetLog), screen px at 1920×1080.
const ROW_STEP = 65.6; // dashboard .question-row pitch on screen (57 × 1.15)
export const cursorKeys: CursorKey[] = [
  // 2 · Site (page moved up 30px after measuring): search (1270,372) → "How long do refunds take?" (q-q4 y566) → 👍 Yes (988,668)
  { t: cue.searchClick - 0.9, x: 1760, y: 1010 },
  { t: cue.searchClick, x: 1010, y: 374, click: true },
  { t: cue.openClick, x: 1320, y: 570, click: true }, // right of the question text, so the highlight stays visible
  { t: cue.voteClick, x: 990, y: 670, click: true },
  { t: cue.voteClick + 0.9, x: 1240, y: 830 },
  // 3 · Editor: preset dropdown (control ~1600,450) → Midnight Support (1456,549) → again → Pastel Rounded (1448,603) → Category filter toggle (1535,765)
  { t: cue.presetOpen1 - 0.55, x: 1680, y: 920 },
  { t: cue.presetOpen1, x: 1600, y: 452, click: true },
  { t: cue.presetPick1, x: 1462, y: 551, click: true },
  { t: cue.presetOpen2, x: 1600, y: 452, click: true },
  { t: cue.presetPick2, x: 1452, y: 605, click: true },
  { t: cue.toggleSearch, x: 1537, y: 767, click: true },
  { t: cue.toggleSearch + 0.9, x: 1690, y: 900 },
  // 4 · Dashboard: New FAQ group (1466,254) → Use a template (1109,497) → Online store (961,615) → Create group (1180,878)
  { t: cue.newGroupClick - 0.55, x: 1720, y: 560 },
  { t: cue.newGroupClick, x: 1470, y: 256, click: true },
  { t: cue.templateModeClick, x: 1110, y: 500, click: true },
  { t: cue.templatePick, x: 940, y: 616, click: true },
  { t: cue.createClick, x: 1180, y: 880, click: true },
  { t: cue.createClick + 0.7, x: 1640, y: 700 },
  // drag "What is your return policy?" (handle 387,789) to the top of the list
  { t: cue.dragStart, x: 389, y: 791, click: true, release: cue.dragEnd },
  { t: cue.dragEnd, x: 389, y: 791 - 3 * ROW_STEP },
  // 5 · Analytics tab (551,353)
  { t: cue.analyticsClick, x: 553, y: 355, click: true },
  { t: cue.analyticsClick + 0.9, x: 1720, y: 760 },
  // 6 · Add to Site (visible center 960,730)
  { t: cue.ctaClick - 0.6, x: 1480, y: 960 },
  { t: cue.ctaClick, x: 975, y: 738, click: true },
];

/** The cursor shows only while it works: in the site, editor and dashboard acts, and on the CTA. */
export const cursorVisible = (t: number) => Math.max(
  during(t, cue.searchClick - 0.6, cue.widgetLift, 0.25),
  during(t, cue.presetOpen1 - 0.6, cue.editorOut, 0.25),
  during(t, cue.newGroupClick - 0.6, cue.dashOut, 0.25),
  during(t, cue.ctaClick - 0.7, acts.end[1] + 1, 0.25),
);
