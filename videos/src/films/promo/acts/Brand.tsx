import React from "react";
import { AbsoluteFill } from "remotion";
import { Logo } from "../../../brand/Logo";
import { easeOut, fadeIn, fadeOut } from "../../../kit/anim";
import { progress } from "../../../kit/time";
import { color } from "../../../kit/tokens";
import { Backdrop } from "../../../scenes/Backdrop";
import { acts, cue } from "../cues";

const font = "Inter, system-ui, sans-serif";

/** Word-by-word reveal that keeps every word's slot, so the line never re-centers while it builds. */
const Words = ({ words, reveal, style }: { words: Array<{ text: string; color: string }>; reveal: number; style: React.CSSProperties }) => (
  <div style={{ display: "flex", gap: "0.26em", ...style }}>
    {words.map((word, index) => {
      const v = easeOut(reveal * words.length - index);
      return <span key={index} style={{ color: word.color, opacity: v, translate: `0 ${(1 - v) * 0.25}em` }}>{word.text}</span>;
    })}
  </div>
);

type BrandCardProps = { build: number; rows: number; open: number; wordmark: number; tagline: number };

const BrandCard = ({ build, rows, open, wordmark, tagline, children }: BrandCardProps & { children?: React.ReactNode }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
      <Logo size={240} build={build} rows={rows} open={open} />
      <Words reveal={wordmark} words={[{ text: "FAQ", color: color.ink }, { text: "Studio", color: color.brand }]} style={{ fontFamily: font, fontWeight: 750, fontSize: 132, letterSpacing: "-0.035em", lineHeight: 1 }} />
    </div>
    <Words reveal={tagline} words={"Answers, beautifully organized.".split(" ").map((text) => ({ text, color: color.text }))} style={{ fontFamily: font, fontWeight: 500, fontSize: 44, letterSpacing: "-0.015em" }} />
    {children}
  </AbsoluteFill>
);

/** Act 1 · Hello: the mark builds (bubble, rows, the top row opens), then the wordmark and line. */
export const Hello = ({ t }: { t: number }) => {
  if (t < acts.hello[0] || t >= acts.hello[1]) return null;
  const out = fadeOut(t, cue.helloOut, 0.4);
  return (
    <AbsoluteFill style={{ opacity: out, scale: String(0.97 + 0.03 * out) }}>
      <BrandCard
        build={progress(t, cue.logoBuild, 0.55)}
        rows={progress(t, cue.logoRows, 0.7)}
        open={progress(t, cue.logoOpen, 0.45)}
        wordmark={progress(t, cue.wordmark, 0.45)}
        tagline={progress(t, cue.tagline, 0.7)}
      />
    </AbsoluteFill>
  );
};

/** Act 6 · End card: the same lockup, then "Add to Site", pressed by the cursor. */
export const End = ({ t }: { t: number }) => {
  if (t < acts.end[0]) return null;
  const pressed = t >= cue.ctaClick && t < cue.ctaClick + 0.2;
  const button = fadeIn(t, cue.endButton, 0.4);
  return (
    <AbsoluteFill style={{ opacity: fadeIn(t, acts.end[0], 0.35) }}>
      <BrandCard
        build={progress(t, cue.endIn, 0.5)}
        rows={progress(t, cue.endIn + 0.2, 0.6)}
        open={progress(t, cue.endIn + 0.7, 0.4)}
        wordmark={progress(t, cue.endWordmark, 0.4)}
        tagline={progress(t, cue.endTagline, 0.6)}
      >
        <div data-target="cta" style={{ marginTop: 6, opacity: button, translate: `0 ${(1 - button) * 16}px`, scale: pressed ? "0.97" : "1", fontFamily: font, fontSize: 32, fontWeight: 650, color: "#ffffff", background: pressed ? color.brandHover : color.brand, borderRadius: 999, padding: "22px 52px" }}>Add to Site</div>
      </BrandCard>
    </AbsoluteFill>
  );
};

/** The widget-world backdrop under acts 1, 2 and 6. */
export const SkyLayer = ({ t }: { t: number }) => <Backdrop drift={Math.min(1, t / 42)} />;
