import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = "supabase/migrations/20260606143000_restore_public_object_browsing.sql";
const sql = readFileSync(join(process.cwd(), migrationPath), "utf8");
const normalizedSql = sql.replace(/\s+/g, " ");

const requiredSnippets = [
  'DROP POLICY IF EXISTS "anon reads preview only" ON public.objects;',
  'DROP POLICY IF EXISTS "authenticated reads published" ON public.objects;',
  'CREATE POLICY "anyone reads published"',
  "status = 'published'::object_status AND hidden = false",
];

const missing = requiredSnippets.filter((snippet) => !sql.includes(snippet));
if (!normalizedSql.includes("FOR SELECT TO anon, authenticated")) {
  missing.push("FOR SELECT TO anon, authenticated");
}

if (missing.length) {
  console.error(`${migrationPath} is missing required public browsing migration SQL:`);
  for (const snippet of missing) console.error(`- ${snippet}`);
  process.exit(1);
}

console.log(`${migrationPath} is present and restores public object browsing.`);
