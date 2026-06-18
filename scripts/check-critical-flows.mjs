import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const checks = [
  {
    name: "login link is present for signed-out users",
    file: "src/components/SiteLayout.tsx",
    test: (source) => source.includes('to="/login"') && source.includes('t("nav.loginRegister")'),
  },
  {
    name: "object cards navigate to object detail pages",
    file: "src/components/ObjectCard.tsx",
    test: (source) =>
      source.includes('to="/objects/$id"') &&
      source.includes("params={{ id }}") &&
      source.includes('t("objects.viewDetail")') &&
      !source.includes('to="/object/$id"') &&
      !source.includes("absolute inset-0"),
  },
  {
    name: "legacy singular object detail route redirects to canonical plural route",
    file: "src/routes/object.$id.tsx",
    test: (source) =>
      source.includes('createFileRoute("/object/$id")') &&
      source.includes("throw redirect") &&
      source.includes('to: "/objects/$id"') &&
      !source.includes("getPublicObjectDetail") &&
      !source.includes("canonical"),
  },
  {
    name: "object detail pages show complete object information",
    file: "src/routes/objects.$id.tsx",
    test: (source) =>
      source.includes('createFileRoute("/objects/$id")') &&
      source.includes("href: `/objects/${params.id}`") &&
      source.includes("TemperatureBreakdown") &&
      source.includes("ObjectTimeline") &&
      source.includes("ObjectComments") &&
      source.includes("getPublicObjectObservations") &&
      source.includes("loadMoreObservations") &&
      source.includes('t("objectDetail.allReviewed")') &&
      source.includes('t("objectDetail.showing"'),
  },
  {
    name: "approved object requests immediately create visible object cards",
    file: "src/lib/api/platform.functions.ts",
    test: (source) =>
      source.includes("async function createPublishedObject") &&
      source.includes('status: "published"') &&
      source.includes("hidden: false") &&
      source.includes("export const approveObjectRequest") &&
      source.includes("await createPublishedObject({") &&
      source.includes("已补建公开对象卡片"),
  },
  {
    name: "hidden or draft objects are not treated as public search hits",
    file: "src/lib/api/platform.functions.ts",
    test: (source) =>
      source.includes('.select("id,name,status,hidden")') &&
      source.includes('o.status === "published" && !o.hidden') &&
      source.includes('return { status: "object_exists" as const'),
  },
  {
    name: "home entry points use canonical object and submit routes",
    file: "src/routes/index.tsx",
    test: (source) =>
      source.includes('to="/objects"') &&
      source.includes('to="/objects/$id"') &&
      source.includes('to="/submit/$objectId"') &&
      source.includes("<HomeSubmitQuickAction") &&
      !source.includes('to="/object/$id"'),
  },
  {
    name: "topic observation object references link to detail pages",
    file: "src/routes/topics.$tag.tsx",
    test: (source) =>
      source.includes('to="/objects/$id"') &&
      source.includes("params={{ id: o.object.id }}") &&
      source.includes("data.observations.map"),
  },
  {
    name: "submit saves before AI and reports saved AI failures",
    file: "src/lib/api/platform.functions.ts",
    test: (source) => {
      const insertAt = source.indexOf("// 3. 先 INSERT observation");
      const aiAt = source.indexOf("callAIAnalyze(", insertAt);
      const failureAt = source.indexOf("AI 分析失败", aiAt);
      return (
        insertAt > 0 &&
        source.indexOf(".insert", insertAt) > insertAt &&
        aiAt > insertAt &&
        failureAt > aiAt
      );
    },
  },
  {
    name: "submit quota allows 50 observations per 24 hours",
    file: "src/lib/api/platform.functions.ts",
    test: (source) =>
      source.includes("const TOTAL_OBSERVATIONS_24H_LIMIT = 50") &&
      source.includes("const SAME_OBJECT_24H_LIMIT = 10") &&
      source.includes("const total24h = Number(limit.total_24h ?? 0)") &&
      source.includes("if (total24h >= TOTAL_OBSERVATIONS_24H_LIMIT)") &&
      source.includes("if (sameObject24h >= SAME_OBJECT_24H_LIMIT)") &&
      !source.includes("if (limit && !limit.allowed)") &&
      !source.includes("24 小时内最多提交 3 条观察"),
  },
  {
    name: "current user access does not blank screen when service role env is missing",
    file: "src/lib/api/platform.functions.ts",
    test: (source) =>
      source.includes("currentUserAccessFallback") &&
      source.includes("getSupabaseAdminConfigStatus") &&
      source.includes("if (!adminConfig.ready)") &&
      source.includes("return fallback"),
  },
  {
    name: "global auth provider does not call admin access server function during page load",
    file: "src/components/AuthProvider.tsx",
    test: (source) =>
      !source.includes("getCurrentUserAccess") &&
      !source.includes("useServerFn") &&
      source.includes('.from("notifications" as never)'),
  },
  {
    name: "non-admin users do not see the admin entry in site navigation",
    file: "src/components/SiteLayout.tsx",
    test: (source) =>
      source.includes("canSeeAdminNav") &&
      source.includes("access.isAdmin") &&
      source.includes('{t("nav.admin")}') &&
      !source.includes('t("nav.adminEntry")') &&
      !source.includes("email && !isAdmin"),
  },
  {
    name: "Supabase admin config can be checked before creating service role client",
    file: "src/integrations/supabase/client.server.ts",
    test: (source) =>
      source.includes("export function getSupabaseAdminConfigStatus") &&
      source.includes("ready: missing.length === 0") &&
      source.includes("SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY"),
  },
  {
    name: "database submit quota migration raises 24h total limit to 50 and object limit to 10",
    file: "supabase/migrations/20260607003000_raise_submit_limit_to_50.sql",
    test: (source) =>
      source.includes("CREATE OR REPLACE FUNCTION public.check_user_submit_limit") &&
      source.includes("total_24h < 50") &&
      source.includes("same_obj_24h < 10"),
  },
  {
    name: "AI provider supports Lovable defaults and DeepSeek configuration",
    file: "src/lib/api/platform.functions.ts",
    test: (source) =>
      source.includes("process.env.LOVABLE_API_KEY || process.env.AI_API_KEY") &&
      source.includes("DEFAULT_DEEPSEEK_GATEWAY") &&
      source.includes("https://api.deepseek.com/chat/completions") &&
      source.includes("DEFAULT_DEEPSEEK_MODEL") &&
      source.includes("deepseek-chat") &&
      source.includes("AI_BASE_URL") &&
      source.includes("AI_MODEL"),
  },
  {
    name: "public object detail only returns public object columns",
    file: "src/lib/api/platform.functions.ts",
    test: (source) => {
      const detailAt = source.indexOf("export const getPublicObjectDetail");
      const observationsAt = source.indexOf("export const getPublicObjectObservations", detailAt);
      const detailSource = source.slice(detailAt, observationsAt);
      return (
        detailAt > 0 &&
        observationsAt > detailAt &&
        detailSource.includes(".select(PUBLIC_OBJECT_COLUMNS)") &&
        !detailSource.includes('.select("*")')
      );
    },
  },
  {
    name: "saved AI failure page retries the saved observation",
    file: "src/routes/submit.$objectId.tsx",
    test: (source) =>
      source.includes("retrySavedAnalysis") &&
      source.includes("retryObservationAnalysis") &&
      source.includes('t("submit.retryAI")') &&
      source.includes("savedId"),
  },
  {
    name: "first admin self-claim is gated by a production-disabled environment switch",
    file: "src/lib/api/platform.functions.ts",
    test: (source) =>
      source.includes("function firstAdminClaimEnabled") &&
      source.includes('process.env.ALLOW_FIRST_ADMIN_CLAIM === "true"') &&
      source.includes("getFirstAdminClaimAvailability") &&
      source.includes("初始管理员自助声明未启用") &&
      source.includes("export const claimFirstAdmin"),
  },
  {
    name: "admin UI only shows first admin claim when server says it is available",
    file: "src/routes/admin.tsx",
    test: (source) =>
      source.includes("getFirstAdminClaimAvailability") &&
      source.includes("claimAvailable") &&
      source.includes("当前账户没有管理员权限") &&
      source.includes("声明为初始管理员"),
  },
  {
    name: "production readiness fails if first admin self-claim is enabled",
    file: "scripts/check-production-readiness.mjs",
    test: (source) =>
      source.includes('env.ALLOW_FIRST_ADMIN_CLAIM === "true"') &&
      source.includes("ALLOW_FIRST_ADMIN_CLAIM must be disabled for production readiness."),
  },
  {
    name: "browser E2E uses Playwright instead of static flow checks",
    file: "package.json",
    test: (source) => {
      const pkg = JSON.parse(source);
      return (
        pkg.scripts?.["test:e2e"] === "playwright test" &&
        Boolean(pkg.devDependencies?.["@playwright/test"])
      );
    },
  },
  {
    name: "production readiness checks are available",
    file: "package.json",
    test: (source) => {
      const pkg = JSON.parse(source);
      return (
        pkg.scripts?.["check:production"] === "node scripts/check-production-readiness.mjs" &&
        pkg.scripts?.["check:public"] ===
          "node scripts/check-production-readiness.mjs --public-only"
      );
    },
  },
  {
    name: "Supabase service role key accepts Lovable short env name",
    file: "src/integrations/supabase/client.server.ts",
    test: (source) =>
      source.includes("process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY") &&
      source.includes("SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY"),
  },
  {
    name: "Supabase auth middleware accepts public VITE env names",
    file: "src/integrations/supabase/auth-middleware.ts",
    test: (source) =>
      source.includes("process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL") &&
      source.includes(
        "process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY",
      ),
  },
];

const failures = checks.filter((check) => !check.test(read(check.file)));

if (failures.length) {
  console.error("Critical flow checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure.name} (${failure.file})`);
  }
  process.exit(1);
}

console.log(`Critical flow checks passed (${checks.length}).`);
