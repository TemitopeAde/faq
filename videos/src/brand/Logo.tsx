import React from "react";
import { color } from "../kit/tokens";

/**
 * FAQ Studio mark: a speech bubble holding an accordion (one row open, two closed).
 * One rig for the static logo and the film: every visual value comes from props in 0..1,
 * so the film drives it from time and the PNG export renders it fully built.
 */
export type LogoVariant = "flat" | "gradient" | "question";

type LogoProps = {
  size: number;
  variant?: LogoVariant;
  /** Bubble scale-in, 0..1. */
  build?: number;
  /** Rows stacking in, 0..1 (staggered across the three rows). */
  rows?: number;
  /** Top row opening, 0..1. */
  open?: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => { const v = clamp01(value); return v * v * (3 - 2 * v); };

// Geometry on a 1000×1000 board.
// Body (rounded rect) and tail are separate shapes; the tail overlaps into the body so the join is seamless.
const BODY = "M310 150 H690 A170 170 0 0 1 860 320 V590 A170 170 0 0 1 690 760 H310 A170 170 0 0 1 140 590 V320 A170 170 0 0 1 310 150 Z";
const TAIL = "M285 690 L430 690 L252 878 Q232 894 236 868 L262 690 Z";
const ROW_X = 255;
const ROW_W = 490;
const ROW_R = 45;
const CLOSED_H = 86;
const OPEN_H = 216;
const GAP = 28;

const Chevron = ({ x, y, up, stroke }: { x: number; y: number; up: number; stroke: string }) => (
  <path d="M-20 -10 L0 10 L20 -10" transform={`translate(${x} ${y}) rotate(${180 * up})`} fill="none" stroke={stroke} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
);

export const Logo = ({ size, variant = "flat", build = 1, rows = 1, open = 1 }: LogoProps) => {
  const b = ease(build);
  const o = ease(open);
  const rowIn = (index: number) => ease(rows * 1.6 - index * 0.3);
  const openH = CLOSED_H + (OPEN_H - CLOSED_H) * o;
  const total = openH + 2 * CLOSED_H + 2 * GAP;
  const top = 455 - total / 2; // centered in the bubble body (150..760)
  const rowsY = [top, top + openH + GAP, top + openH + GAP + CLOSED_H + GAP];
  const headTint = variant === "gradient" ? "#c9cffb" : "#bcc3f8";
  const id = `faq-logo-${variant}`;

  return (
    <svg width={size} height={size} viewBox="0 0 1000 1000" role="img" aria-label="FAQ Studio logo">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6574f2" />
          <stop offset="1" stopColor="#4150cc" />
        </linearGradient>
        <clipPath id={`${id}-clip`}><path d={BODY} /></clipPath>
      </defs>
      {/* Scales in from the bubble's tail: translate + scale = scale about (260, 870). */}
      <g transform={`translate(${260 * (1 - b)} ${870 * (1 - b)}) scale(${b})`}>
        <path d={`${BODY} ${TAIL}`} fill={variant === "gradient" ? `url(#${id}-fill)` : color.brand} />
        <g clipPath={`url(#${id}-clip)`}>
          {rowsY.map((y, index) => {
            const isOpen = index === 0;
            const h = isOpen ? openH : CLOSED_H;
            const show = rowIn(index);
            const headY = y + CLOSED_H / 2;
            return (
              <g key={index} opacity={show} transform={`translate(0 ${(1 - show) * 40})`}>
                <rect x={ROW_X} y={y} width={ROW_W} height={h} rx={ROW_R} fill="#ffffff" />
                {variant === "question" && isOpen ? (
                  <g>
                    <circle cx={ROW_X + 62} cy={headY} r={28} fill={color.brand} />
                    <text x={ROW_X + 62} y={headY + 15} textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight={800} fontSize={44} fill="#ffffff">?</text>
                    <rect x={ROW_X + 110} y={headY - 16} width={190} height={32} rx={16} fill={color.brand} />
                  </g>
                ) : (
                  <rect x={ROW_X + 44} y={headY - 16} width={isOpen ? 250 : 210 - index * 30} height={32} rx={16} fill={isOpen ? color.brand : headTint} />
                )}
                <Chevron x={ROW_X + ROW_W - 62} y={headY} up={isOpen ? o : 0} stroke={isOpen ? color.brand : headTint} />
                {isOpen ? (
                  <g opacity={clamp01((o - 0.35) / 0.65)}>
                    <rect x={ROW_X + 44} y={y + 104} width={360} height={26} rx={13} fill="#dfe3fb" />
                    <rect x={ROW_X + 44} y={y + 150} width={270} height={26} rx={13} fill="#dfe3fb" />
                  </g>
                ) : null}
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
};

/** Logo + wordmark, as used on the end card. "FAQ" in ink, "Studio" in brand indigo (dashboard tokens). */
export const Lockup = ({ height, variant = "flat", color: ink = color.ink }: { height: number; variant?: LogoVariant; color?: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: height * 0.16 }}>
    <Logo size={height} variant={variant} />
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 750, fontSize: height * 0.46, letterSpacing: "-0.035em", color: ink, lineHeight: 1 }}>
      FAQ <span style={{ color: color.brand }}>Studio</span>
    </div>
  </div>
);
