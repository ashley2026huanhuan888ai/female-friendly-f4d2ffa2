import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

const publicUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY;
const aiProvider = (env.AI_PROVIDER || "").trim().toLowerCase() || "lovable";
const aiKey =
  aiProvider === "deepseek" || env.AI_BASE_URL || env.AI_GATEWAY_URL
    ? env.AI_API_KEY
    : env.LOVABLE_API_KEY || env.AI_API_KEY;

const publicOnly = process.argv.includes("--public-only");
const failures = [];
const warnings = [];

if (!publicUrl) failures.push("Missing VITE_SUPABASE_URL or SUPABASE_URL.");
if (!publishableKey)
  failures.push("Missing VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_PUBLISHABLE_KEY.");
if (!publicOnly && !serviceRoleKey) {
  failures.push("Missing SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY.");
}
if (!publicOnly && !aiKey) {
  failures.push("Missing AI key for the configured provider.");
}
if (!publicOnly && env.ALLOW_FIRST_ADMIN_CLAIM === "true") {
  failures.push("ALLOW_FIRST_ADMIN_CLAIM must be disabled for production readiness.");
}

if (failures.length) {
  console.error("Production readiness check failed before database checks:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const anonClient = createClient(publicUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { count: anonObjectCount, error: anonObjectsError } = await anonClient
  .from("objects")
  .select("id", { count: "exact", head: true })
  .eq("status", "published")
  .eq("hidden", false);

if (anonObjectsError) {
  failures.push(`Anonymous published object read failed: ${anonObjectsError.message}`);
}

const { error: anonObservationError } = await anonClient
  .from("observations")
  .select("id", { count: "exact", head: true })
  .eq("status", "approved");

if (anonObservationError) {
  failures.push(`Anonymous approved observation read failed: ${anonObservationError.message}`);
}

if (!publicOnly && serviceRoleKey) {
  const adminClient = createClient(publicUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { count: adminObjectCount, error: adminObjectsError } = await adminClient
    .from("objects")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .eq("hidden", false);

  if (adminObjectsError) {
    failures.push(`Service role published object read failed: ${adminObjectsError.message}`);
  } else if (typeof anonObjectCount === "number" && typeof adminObjectCount === "number") {
    if (adminObjectCount > anonObjectCount) {
      failures.push(
        `Anonymous object visibility is lower than service role visibility (${anonObjectCount}/${adminObjectCount}). Run the public browsing migration.`,
      );
    }
    if (adminObjectCount === 0) {
      warnings.push(
        "No published non-hidden objects found. Object browsing can work, but there is no published content yet.",
      );
    }
  }

  const { count: adminRoleCount, error: adminRoleError } = await adminClient
    .from("user_roles")
    .select("user_id", { count: "exact", head: true })
    .eq("role", "admin");

  if (adminRoleError) {
    failures.push(`Admin role check failed: ${adminRoleError.message}`);
  } else if (!adminRoleCount) {
    failures.push("No admin user found in user_roles.");
  }

  const { error: authAdminError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (authAdminError) {
    failures.push(`Service role Auth admin check failed: ${authAdminError.message}`);
  }
}

if (failures.length) {
  console.error("Production readiness check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  for (const warning of warnings) console.warn(`Warning: ${warning}`);
  process.exit(1);
}

for (const warning of warnings) console.warn(`Warning: ${warning}`);
console.log(
  `Production readiness check passed. Public objects visible: ${anonObjectCount ?? "unknown"}. Mode: ${
    publicOnly ? "public-only" : "full"
  }.`,
);
