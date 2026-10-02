import React from "react";
import { Composition, Still } from "remotion";
import "./fonts";
import { LogoExport, LogoSheet } from "./brand/LogoSheet";
import type { LogoVariant } from "./brand/Logo";
import { StyleFrames } from "./films/promo/StyleFrames";
import { Promo, type PromoProps } from "./films/promo/Promo";
import { DURATION } from "./films/promo/cues";
import { ContactSheet } from "./ContactSheet";
import { Poster } from "./films/promo/Poster";

export const Root = () => (
  <>
    <Composition
      id="Promo"
      component={Promo}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={Math.round(DURATION * 30)}
      defaultProps={{ fps: 30, debug: false } as PromoProps}
      calculateMetadata={({ props }) => ({ fps: props.fps, durationInFrames: Math.round(DURATION * props.fps) })}
    />
    <Still id="ContactSheet" component={ContactSheet} width={1920} height={1400} defaultProps={{ frames: [] as Array<number>, fps: 30, columns: 4 }} />
    <Still id="Poster" component={Poster} width={1920} height={1080} />
    <Still id="LogoSheet" component={LogoSheet} width={1920} height={1080} />
    <Still id="StyleSite" component={StyleFrames} width={1920} height={1080} defaultProps={{ which: 0 }} />
    <Still id="StyleEditor" component={StyleFrames} width={1920} height={1080} defaultProps={{ which: 1 }} />
    <Still id="StyleEnd" component={StyleFrames} width={1920} height={1080} defaultProps={{ which: 2 }} />
    <Still id="Logo1000" component={LogoExport} width={1000} height={1000} defaultProps={{ variant: "flat" as LogoVariant }} />
  </>
);
