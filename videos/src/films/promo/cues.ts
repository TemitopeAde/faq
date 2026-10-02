import { at, type Grid } from "../../kit/time";
import beats from "./beats.json";

/**
 * Measured grid (scripts/beats-lite.py → beats.json): "Upbeat Corporate" by The_Mountain, 119.95 BPM, 4/4,
 * first downbeat at 0.00 s; median onset offset 10 ms. Song map: light intro bars 1–9, the full groove drops
 * at track bar 10 (18.0 s) and runs to bar 41, breakdown 42–49.
 *
 * The music starts at track bar 3 (MUSIC_FROM_BAR), so the drop lands on film bar 8: the widget landing in the
 * editor ("Make it yours."). Film bar 1 is at film time 0; every cue below is on this grid.
 */
export const MUSIC_FROM_BAR = 3;
export const MUSIC_OFFSET = beats.bars[MUSIC_FROM_BAR - 1].start; // seconds into the track
export const MUSIC_FILE = "audio/promo/the_mountain-upbeat-corporate-576594.mp3";
export const grid: Grid = { bpm: beats.bpm, firstBeat: 0, pickupBeats: 0, beatsPerBar: 4 };
export const b = (bar: number, beat = 1, fraction = 0) => at(grid, bar, beat, fraction);
export const BEAT = 60 / grid.bpm;
export const BARS = 21;
export const DURATION = b(BARS + 1);

// Act windows (start inclusive, end exclusive).
export const acts = {
  hello: [b(1), b(3)],
  site: [b(3), b(8)],
  editor: [b(7, 4), b(13)],
  dashboard: [b(13), b(20)],
  end: [b(19, 4), DURATION],
} as const;

export const cue = {
  // 1 · Hello
  logoBuild: b(1, 1, 0.25),
  logoRows: b(1, 2),
  logoOpen: b(1, 4),
  wordmark: b(1, 3),
  tagline: b(2, 1),
  helloOut: b(2, 4),

  // 2 · Smart FAQ on your site
  siteIn: b(3, 1),
  siteCaption: b(3, 2),
  searchClick: b(3, 4),
  typeStart: b(4, 1),
  typeStep: BEAT / 2.5,
  openClick: b(5, 2),
  voteClick: b(6, 2),
  widgetLift: b(7, 4), // widget travels from the site into the editor canvas
  widgetLand: b(8, 2),

  // 3 · Fully styleable in the Editor
  editorIn: b(8, 1),
  editorCaption: b(8, 2),
  presetOpen1: b(9, 1),
  presetPick1: b(9, 3),
  presetOpen2: b(10, 1),
  presetPick2: b(10, 3),
  toggleSearch: b(11, 2),
  editorOut: b(12, 4),

  // 4 · Set up in minutes
  dashIn: b(13, 1),
  dashCaption: b(13, 2),
  newGroupClick: b(13, 4),
  templateModeClick: b(14, 2),
  templatePick: b(14, 3),
  createClick: b(15, 1),
  rowsStart: b(15, 1, 0.5),
  rowStep: BEAT / 3,
  dragStart: b(16, 2),
  dragEnd: b(16, 4),

  // 5 · Visitor analytics
  analyticsClick: b(17, 2),
  analyticsCaption: b(17, 2),
  countStart: b(17, 3),
  countLength: BEAT * 4,
  missingStart: b(18, 3),
  dashOut: b(19, 4),

  // 6 · End card
  endIn: b(20, 1),
  endWordmark: b(20, 2),
  endTagline: b(20, 3),
  endButton: b(20, 4),
  ctaClick: b(21, 2),
} as const;
