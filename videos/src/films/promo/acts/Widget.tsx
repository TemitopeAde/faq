import React from "react";
import { AbsoluteFill } from "remotion";
import { fadeIn, fadeOut, standard } from "../../../kit/anim";
import { move } from "../../../kit/move";
import { progress } from "../../../kit/time";
import { color } from "../../../kit/tokens";
import { WidgetTwin } from "../../../twins/WidgetTwin";
import { siteItems } from "../content";
import { acts, cue } from "../cues";
import { widgetInEditor, widgetOnSite } from "../layout";

const QUERY = "refund";
const OPEN_ID = "q4"; // "How long do refunds take?" (Online store template)

/** The preset shown at t, with a short cross-fade when the cursor picks a new one. */
const presetAt = (t: number): [string, string, number] => {
  if (t < cue.presetPick1) return ["classic", "classic", 1];
  if (t < cue.presetPick2) return ["classic", "dark", standard(progress(t, cue.presetPick1, 0.3))];
  return ["dark", "pastel", standard(progress(t, cue.presetPick2, 0.3))];
};

/**
 * The FAQ widget as one traveler across acts 2 and 3: it sits on the site page, then glides into the
 * editor canvas (magic move) and is restyled there. Its state is all derived from the cues.
 */
export const WidgetLayer = ({ t }: { t: number }) => {
  if (t < acts.site[0] || t >= acts.editor[1]) return null;
  const typed = t < cue.typeStart ? 0 : Math.min(QUERY.length, Math.floor((t - cue.typeStart) / cue.typeStep) + 1);
  const enter = fadeIn(t, cue.siteIn + 0.15, 0.5);
  const rect = move(t, cue.widgetLift, { ...widgetOnSite, y: widgetOnSite.y + (1 - enter) * 60 }, widgetInEditor);
  const [from, to, mix] = presetAt(t);
  const selected = fadeIn(t, cue.widgetLand, 0.3);
  const out = fadeOut(t, cue.editorOut, 0.4);
  const props = {
    items: siteItems,
    heading: "Frequently asked questions",
    query: QUERY.slice(0, typed),
    caret: t >= cue.searchClick && t < cue.widgetLift,
    openId: t >= cue.openClick ? OPEN_ID : "",
    open: standard(progress(t, cue.openClick + 0.05, 0.35)),
    voted: t >= cue.voteClick + 0.12 ? 1 : t >= cue.voteClick ? 0.5 : 0,
    showCategories: t < cue.toggleSearch + 0.05,
    width: rect.w,
  };
  return (
    <AbsoluteFill style={{ opacity: enter * out }}>
      <div style={{ position: "absolute", left: rect.x, top: rect.y, borderRadius: 14, outline: `2px solid ${color.brand}`, outlineOffset: 8, outlineColor: `rgba(79, 95, 224, ${selected})` }}>
        <WidgetTwin {...props} preset={to} />
        {mix < 1 ? <div style={{ position: "absolute", inset: 0, opacity: 1 - mix }}><WidgetTwin {...props} preset={from} /></div> : null}
      </div>
    </AbsoluteFill>
  );
};
