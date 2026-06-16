import { createFileRoute } from "@tanstack/react-router";
import { APP_BUILT_AT, APP_COMMIT } from "@/lib/build-info";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/version")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify({
            commit: APP_COMMIT,
            commitShort: APP_COMMIT.slice(0, 7),
            builtAt: APP_BUILT_AT,
          }),
          { status: 200, headers: CORS_HEADERS },
        ),
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
    },
  },
});
