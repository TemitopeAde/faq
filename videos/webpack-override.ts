import path from "node:path";
import type { WebpackOverrideFn } from "@remotion/bundler";

// Shared by remotion.config.ts and scripts/*.ts.
// - "@" resolves to the app's src/, so the film imports the real components, CSS and data.
// - react / react-dom resolve to this package's copy, so app files and Remotion share one React.
// - App imports (lucide-react, clsx…) fall back to the app's node_modules.
// process.cwd() (not import.meta.dirname): the Remotion CLI loads the config as CommonJS.
export const webpackOverride: WebpackOverrideFn = (config) => {
  const root = process.cwd();
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias ?? {}),
        "@": path.resolve(root, "../src"),
        react: path.resolve(root, "node_modules/react"),
        "react-dom": path.resolve(root, "node_modules/react-dom"),
      },
      modules: [...(config.resolve?.modules ?? ["node_modules"]), path.resolve(root, "../node_modules")],
    },
  };
};
