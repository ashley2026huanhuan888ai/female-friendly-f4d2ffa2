// Build-time constants injected via Vite `define` in vite.config.ts.
declare const __APP_COMMIT__: string;
declare const __APP_BUILT_AT__: string;

export const APP_COMMIT: string =
  typeof __APP_COMMIT__ !== "undefined" ? __APP_COMMIT__ : "unknown";
export const APP_BUILT_AT: string =
  typeof __APP_BUILT_AT__ !== "undefined" ? __APP_BUILT_AT__ : "";

export const APP_COMMIT_SHORT = APP_COMMIT.slice(0, 7);

export const PREVIEW_ORIGIN = "https://id-preview--521cf5fe-4250-44d0-8d80-2645e28c5002.lovable.app";
export const PRODUCTION_ORIGIN = "https://female-friendly.lovable.app";
