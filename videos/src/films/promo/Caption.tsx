import React from "react";
import { color } from "../../kit/tokens";

/** Short caption: Inter, ink on light, at most 5 words. Words keep their slots while they build. */
export const Caption = ({ text, x, y, size = 68, reveal = 1, width = 640 }: { text: string; x: number; y: number; size?: number; reveal?: number; width?: number }) => {
  const words = text.split(" ");
  return (
    <div style={{ position: "absolute", left: x, top: y, width, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 750, fontSize: size, lineHeight: 1.08, letterSpacing: "-0.035em", color: color.ink }}>
      {words.map((word, index) => {
        const v = Math.min(1, Math.max(0, reveal * words.length - index));
        return <span key={index} style={{ display: "inline-block", marginRight: "0.24em", opacity: v, translate: `0 ${(1 - v) * 18}px` }}>{word}</span>;
      })}
    </div>
  );
};
