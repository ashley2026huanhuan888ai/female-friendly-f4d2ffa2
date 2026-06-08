import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const checks = [
  {
    name: "login link is present for signed-out users",
    file: "src/components/SiteLayout.tsx",
    test: (source) => source.includes('to="/login"') && source.includes("登录 / 注册"),
  },
  {
    name: "object cards navigate to object detail pages",
    file: "src/components/ObjectCard.tsx",
    test: (source) =>
      source.includes('to="/objects/$id"') &&
      source.includes("params={{ id }}") &&
      source.includes("查看详情") &&
      !source.includes("absolute inset-0"),
  },
  {
    name: "object detail pages show complete object information",
    file: "src/routes/objects.$id.tsx",
    test: (source) =>
      source.includes('createFileRoute("/objects/$id")') &&
      source.includes("AI 总结") &&
      source.includes("主要争议标签") &&
      source.includes("为什么是这个温度？") &&
      source.includes("案例时间线") &&
      source.includes("全部已审核观察") &&
      source.includes("getPublicObjectObservations") &&
      source.includes("loadMoreObservations") &&
      source.includes("当前展示 {obs.length} / {obsTotal} 条已审核观察"),
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
    name: "object references on home and topic pages link to detail pages",
    file: "src/routes/index.tsx",
    test: (source) =>
      source.includes('to="/objects/$id"') &&
      source.includes("params={{ id: o.object.id }}") &&
      source.includes("summary.latest_observations"),
  },
  {
    name: "topic observation object references link to detail pages",
    file: "src/routes/topics.$tag.tsx",
    test: (source) =>
      source.includes('to="/objects/$id"') &&
      source.includes("params={{ id: o.object.id }}") &&
      source.includes("data.observations.slice"),
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
      source.includes("24 小时内最多提交 50 条观察") &&
      source.includes("const total24h = Number(limit.total_24h ?? 0)") &&
      source.includes("if (total24h >= 50)") &&
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
      const selectAt = source.indexOf(".select(PUBLIC_OBJECT_COLUMNS)", detailAt);
      const starAt = source.indexOf('.select("*")', detailAt);
      return (
        detailAt > 0 &&
        selectAt > detailAt &&
        (starAt === -1 || starAt > source.indexOf("// ===== 删除对象", detailAt))
      );
    },
  },
  {
    name: "saved AI failure page retries the saved observation",
    file: "src/routes/submit.$objectId.tsx",
    test: (source) =>
      source.includes("retrySavedAnalysis") &&
      source.includes("观察已保存为待审") &&
      source.includes("重试 AI 分析"),
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
