import React from "react";
import { AbsoluteFill } from "remotion";
import { fadeIn, fadeOut } from "../../../kit/anim";
import { progress } from "../../../kit/time";
import { color } from "../../../kit/tokens";
import { Caption } from "../Caption";
import { acts, cue } from "../cues";
import { sitePage } from "../layout";

/** Act 2 · Smart FAQ on your site: a plain website page (no real brand); the widget layer sits on top. */
export const Site = ({ t }: { t: number }) => {
  if (t < acts.site[0] || t >= acts.site[1]) return null;
  const enter = fadeIn(t, cue.siteIn, 0.5);
  const leave = fadeOut(t, cue.widgetLift, 0.35);
  return (
    <AbsoluteFill>
      <Caption text="Answers, found instantly." x={120} y={420} width={560} reveal={progress(t, cue.siteCaption, 0.6) * leave} />
      <div style={{ position: "absolute", left: sitePage.x, top: sitePage.y + (1 - enter) * 60 + (1 - leave) * 30, width: sitePage.w, height: sitePage.h, opacity: enter * leave, background: color.surface, borderRadius: 18, boxShadow: "0 30px 80px rgba(31, 48, 80, .14)", overflow: "hidden" }}>
        <div style={{ height: 64, borderBottom: `1px solid ${color.line}`, display: "flex", alignItems: "center", gap: 18, padding: "0 32px" }}>
          <div style={{ width: 120, height: 14, borderRadius: 7, background: color.ink, opacity: 0.85 }} />
          <div style={{ flex: 1 }} />
          {[70, 60, 80].map((width, index) => <div key={index} style={{ width, height: 10, borderRadius: 5, background: color.lineStrong }} />)}
        </div>
      </div>
    </AbsoluteFill>
  );
};
