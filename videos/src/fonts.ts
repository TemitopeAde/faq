import { loadFont } from "@remotion/google-fonts/Inter";

// The dashboard's font (my-page.css: --faq-font). Loaded once; Remotion waits for it before rendering.
export const { fontFamily: inter } = loadFont("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });
