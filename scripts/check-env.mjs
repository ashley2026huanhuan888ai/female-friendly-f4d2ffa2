import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const env = { ...process.env };

for (const file of [".env", ".env.local"]) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (env[key]) continue;
    env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

const explicitProvider = (env.AI_PROVIDER || "").trim().toLowerCase();
const explicitEndpoint = (env.AI_BASE_URL || env.AI_GATEWAY_URL || "").trim().toLowerCase();
const aiProvider =
  explicitProvider === "deepseek" || explicitEndpoint.includes("deepseek")
    ? "deepseek"
    : explicitProvider && explicitProvider !== "lovable"
      ? "custom"
      : explicitEndpoint
        ? "custom"
        : "lovable";

const aiKeyRequirement =
  aiProvider === "lovable"
    ? {
        label: "AI provider key",
        names: ["LOVABLE_API_KEY", "AI_API_KEY"],
      }
    : {
        label: `${aiProvider} AI provider key`,
        names: ["AI_API_KEY"],
      };

const requirements = [
  {
    label: "Supabase public URL",
    names: ["VITE_SUPABASE_URL", "SUPABASE_URL"],
  },
  {
    label: "Supabase publishable key",
    names: ["VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY"],
  },
  {
    label: "Supabase service role key",
    names: ["SUPABASE_SERVICE_ROLE_KEY", "SERVICE_ROLE_KEY"],
  },
  aiKeyRequirement,
];

const missing = requirements.filter((item) => !item.names.some((name) => Boolean(env[name])));

if (missing.length) {
  console.error("Deployment environment check failed. Missing:");
  for (const item of missing) {
    console.error(`- ${item.label}: set one of ${item.names.join(" / ")}`);
  }
  process.exit(1);
}

console.log(`Deployment environment check passed. AI provider: ${aiProvider}.`);
