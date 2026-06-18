import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// Sync Cloudflare Workers `env` bindings into `process.env` so SSR code
// (including the Supabase client) can read them via the standard Node API.
const ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY",
  "LOVABLE_API_KEY",
  "ALLOW_FIRST_ADMIN_CLAIM",
] as const;

function syncRuntimeEnv(env: unknown) {
  if (!env || typeof env !== "object") return;
  const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
  if (!g.process) g.process = { env: {} };
  if (!g.process.env) g.process.env = {};
  const target = g.process.env;
  const source = env as Record<string, unknown>;
  for (const key of ENV_KEYS) {
    const v = source[key];
    if (typeof v === "string" && v && !target[key]) {
      target[key] = v;
    }
  }
}

function getPublicSupabaseConfig(): { url?: string; anonKey?: string } {
  const e =
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const url = e.VITE_SUPABASE_URL || e.SUPABASE_URL;
  const anonKey =
    e.VITE_SUPABASE_PUBLISHABLE_KEY ||
    e.SUPABASE_PUBLISHABLE_KEY ||
    e.VITE_SUPABASE_ANON_KEY ||
    e.SUPABASE_ANON_KEY;
  return { url, anonKey };
}

async function injectPublicSupabaseConfig(response: Response): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;
  const { url, anonKey } = getPublicSupabaseConfig();
  if (!url || !anonKey) return response;
  const html = await response.text();
  const snippet = `<script>window.__FF_SUPABASE_CONFIG__=${JSON.stringify({ url, anonKey })};</script>`;
  const injected = html.includes("</head>")
    ? html.replace("</head>", `${snippet}</head>`)
    : snippet + html;
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(injected, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      syncRuntimeEnv(env);
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return await injectPublicSupabaseConfig(normalized);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
