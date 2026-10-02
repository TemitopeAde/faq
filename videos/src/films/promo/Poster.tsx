import React from "react";
import { AbsoluteFill } from "remotion";
import { End, SkyLayer } from "./acts/Brand";
import { b } from "./cues";

/** Poster / thumbnail: the finished end card (logo, line, "Add to Site"), without the cursor. */
export const Poster = () => {
  const t = b(21, 4);
  return <AbsoluteFill><SkyLayer t={t} /><End t={t} /></AbsoluteFill>;
};
