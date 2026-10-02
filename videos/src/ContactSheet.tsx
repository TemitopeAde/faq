import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";

/** Review aid: lays out frames copied into public/review/ as a grid with their timestamps. */
export const ContactSheet = ({ frames, fps, columns }: { frames: Array<number>; fps: number; columns: number }) => (
  <AbsoluteFill style={{ background: "#111", display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 8, padding: 8, alignContent: "start" }}>
    {frames.map((frame) => (
      <div key={frame} style={{ position: "relative" }}>
        <Img src={staticFile(`review/f${frame}.png`)} style={{ width: "100%", display: "block" }} />
        <span style={{ position: "absolute", left: 6, top: 4, color: "#0f0", font: "600 20px monospace", background: "#000a", padding: "0 6px" }}>{(frame / fps).toFixed(1)}s</span>
      </div>
    ))}
  </AbsoluteFill>
);
