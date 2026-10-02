import React from "react";
import { AbsoluteFill } from "remotion";
import { fadeIn, fadeOut } from "../../../kit/anim";
import { progress } from "../../../kit/time";
import { color } from "../../../kit/tokens";
import { DashboardTwin, type DashboardState } from "../../../twins/DashboardTwin";
import { Caption } from "../Caption";
import { acts, cue } from "../cues";
import { DASH } from "../layout";
import { dragAmount } from "../cursor";

/** Acts 4 + 5 · Set up in minutes, then Visitor analytics, in one dashboard window. */
export const Dashboard = ({ t }: { t: number }) => {
  if (t < acts.dashboard[0] || t >= acts.dashboard[1]) return null;
  const enter = fadeIn(t, cue.dashIn, 0.5);
  const out = fadeOut(t, cue.dashOut, 0.4);
  const created = t >= cue.createClick + 0.12;
  const state: DashboardState = {
    view: t >= cue.analyticsClick + 0.05 ? "analytics" : created ? "detail" : "empty",
    dialog: created ? 1 - progress(t, cue.createClick + 0.12, 0.2) : progress(t, cue.newGroupClick + 0.08, 0.25),
    dialogMode: t >= cue.templateModeClick ? "template" : "blank",
    rows: (t - cue.rowsStart) / cue.rowStep,
    drag: dragAmount(t),
    dragFrom: 3,
    count: progress(t, cue.countStart, cue.countLength),
    missing: (t - cue.missingStart) / 0.25,
    pressed: t >= cue.newGroupClick && t < cue.newGroupClick + 0.15 ? "new" : t >= cue.createClick && t < cue.createClick + 0.15 ? "create" : undefined,
  };
  const analytics = t >= cue.analyticsCaption;
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <AbsoluteFill style={{ background: color.canvas, opacity: enter }} />
      <Caption text="Ready in minutes." x={120} y={56} width={1500} size={60} reveal={progress(t, cue.dashCaption, 0.5) * (analytics ? fadeOut(t, cue.analyticsCaption - 0.2, 0.2) : 1)} />
      {analytics ? <Caption text="See what visitors need." x={120} y={56} width={1500} size={60} reveal={progress(t, cue.analyticsCaption, 0.5)} /> : null}
      <div style={{ position: "absolute", left: DASH.x, top: DASH.y + (1 - enter) * 60, width: DASH.width, height: DASH.height, scale: String(DASH.scale), transformOrigin: "0 0", opacity: enter, borderRadius: 16, overflow: "hidden", boxShadow: "0 30px 80px rgba(31, 48, 80, .16)", border: `1px solid ${color.line}` }}>
        <DashboardTwin state={state} width={DASH.width} height={DASH.height} />
      </div>
    </AbsoluteFill>
  );
};
