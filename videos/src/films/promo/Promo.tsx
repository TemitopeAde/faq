import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile } from "remotion";
import { TargetLog } from "../../kit/debug";
import { UserCursor, cursorAt } from "../../kit/cursor";
import { useTime } from "../../kit/time";
import { Dashboard } from "./acts/Dashboard";
import { Editor } from "./acts/Editor";
import { End, Hello, SkyLayer } from "./acts/Brand";
import { Site } from "./acts/Site";
import { WidgetLayer } from "./acts/Widget";
import { cursorKeys, cursorVisible } from "./cursor";
import { b, DURATION, MUSIC_FILE, MUSIC_OFFSET } from "./cues";

export type PromoProps = { fps: number; debug?: boolean };

/**
 * FAQ Studio · App Market promo. Layers, bottom to top:
 * sky backdrop → hello → site page → editor (bg, canvas, panel) → the traveling widget → dashboard → end card → cursor.
 */
export const Promo = ({ fps, debug }: PromoProps) => {
  const t = useTime();
  const cursor = cursorAt(t, cursorKeys, (x, y) => ({ x, y }));
  return (
    <AbsoluteFill style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Music: starts at track bar 3 (drop on film bar 8); a short fade-in and a fade-out across the last bar. */}
      <Audio
        src={staticFile(MUSIC_FILE)}
        trimBefore={Math.round(MUSIC_OFFSET * fps)}
        volume={(frame) => interpolate(frame / fps, [0, 0.15, b(21, 3), DURATION], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
      <SkyLayer t={t} />
      <Hello t={t} />
      <Site t={t} />
      <Editor t={t} />
      <WidgetLayer t={t} />
      <Dashboard t={t} />
      <End t={t} />
      {cursorVisible(t) > 0 ? <div style={{ opacity: cursorVisible(t) }}><UserCursor x={cursor.x} y={cursor.y} squash={cursor.squash} /></div> : null}
      {debug ? <TargetLog /> : null}
    </AbsoluteFill>
  );
};
