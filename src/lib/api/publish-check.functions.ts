import { createServerFn } from "@tanstack/react-start";
import { APP_BUILT_AT, APP_COMMIT, PREVIEW_ORIGIN, PRODUCTION_ORIGIN } from "@/lib/build-info";

type VersionInfo = {
  origin: string;
  ok: boolean;
  commit: string | null;
  builtAt: string | null;
  error?: string;
};

async function fetchVersion(origin: string): Promise<VersionInfo> {
  try {
    const res = await fetch(`${origin}/api/public/version`, {
      headers: { "cache-control": "no-cache" },
    });
    if (!res.ok) {
      return { origin, ok: false, commit: null, builtAt: null, error: `HTTP ${res.status}` };
    }
    const json = (await res.json()) as { commit?: string; builtAt?: string };
    return {
      origin,
      ok: true,
      commit: json.commit ?? null,
      builtAt: json.builtAt ?? null,
    };
  } catch (e) {
    return {
      origin,
      ok: false,
      commit: null,
      builtAt: null,
      error: (e as Error).message,
    };
  }
}

export const getLocalVersion = createServerFn({ method: "GET" }).handler(async () => ({
  commit: APP_COMMIT,
  builtAt: APP_BUILT_AT,
}));

export const comparePreviewProduction = createServerFn({ method: "GET" }).handler(async () => {
  const [preview, production] = await Promise.all([
    fetchVersion(PREVIEW_ORIGIN),
    fetchVersion(PRODUCTION_ORIGIN),
  ]);
  return {
    preview,
    production,
    match: preview.ok && production.ok && !!preview.commit && preview.commit === production.commit,
    checkedAt: new Date().toISOString(),
  };
});

export const checkProductionCommit = createServerFn({ method: "POST" })
  .inputValidator((input: { targetCommit: string }) => input)
  .handler(async ({ data }) => {
    const info = await fetchVersion(PRODUCTION_ORIGIN);
    return {
      ...info,
      matches: info.ok && info.commit === data.targetCommit,
      targetCommit: data.targetCommit,
    };
  });
