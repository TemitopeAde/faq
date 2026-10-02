import React from "react";
import { color } from "../kit/tokens";

/**
 * The widget's world, redrawn from public/faq-widget-thumbnail-v2.png: a pale sky with large soft
 * blue and teal circles in the corners. Static, so it never runs its own clock; `drift` (0..1)
 * lets a scene slide the shapes slightly from time.
 */
export const Backdrop = ({ drift = 0 }: { drift?: number }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: `linear-gradient(180deg, ${color.skyTop} 0%, #eaf2fd 100%)` }}>
    <div style={{ position: "absolute", width: 1100, height: 1100, borderRadius: "50%", left: -520, top: 260 - drift * 30, background: `radial-gradient(circle at 60% 40%, ${color.skyBlue} 0%, #e6effc 70%)` }} />
    <div style={{ position: "absolute", width: 900, height: 900, borderRadius: "50%", right: -380, bottom: -420 + drift * 30, background: `radial-gradient(circle at 35% 35%, ${color.skyTeal} 0%, #dceefa 75%)` }} />
  </div>
);
