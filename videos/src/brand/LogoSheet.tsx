import React from "react";
import { AbsoluteFill } from "remotion";
import { color } from "../kit/tokens";
import { Backdrop } from "../scenes/Backdrop";
import { Lockup, Logo, type LogoVariant } from "./Logo";

const VARIANTS: Array<{ id: LogoVariant; name: string }> = [
  { id: "flat", name: "A · Flat" },
  { id: "gradient", name: "B · Gradient" },
  { id: "question", name: "C · Question badge" },
];

const label: React.CSSProperties = { fontFamily: "Inter, system-ui, sans-serif", fontSize: 22, fontWeight: 650, color: color.muted };

/** Review sheet: the three variants on white and on the widget backdrop, small sizes, and the lockup. */
export const LogoSheet = () => (
  <AbsoluteFill style={{ background: color.surface }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 520, display: "flex", justifyContent: "space-around", alignItems: "center" }}>
      {VARIANTS.map((variant) => (
        <div key={variant.id} style={{ display: "grid", justifyItems: "center", gap: 18 }}>
          <Logo size={340} variant={variant.id} />
          <div style={{ display: "flex", alignItems: "end", gap: 22 }}><Logo size={64} variant={variant.id} /><Logo size={32} variant={variant.id} /></div>
          <span style={label}>{variant.name}</span>
        </div>
      ))}
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 520, bottom: 0 }}>
      <Backdrop />
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-around", alignItems: "center" }}>
        {VARIANTS.map((variant) => <Lockup key={variant.id} height={150} variant={variant.id} />)}
      </div>
    </div>
  </AbsoluteFill>
);

/** 1000×1000 export with a transparent background. */
export const LogoExport = ({ variant }: { variant: LogoVariant }) => (
  <AbsoluteFill style={{ background: "transparent" }}><Logo size={1000} variant={variant} /></AbsoluteFill>
);
