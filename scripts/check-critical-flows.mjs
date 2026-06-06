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
      !source.includes("absolute inset-0"),
  },
  {
    name: "object detail supports paginated observation browsing",
    file: "src/routes/objects.$id.tsx",
    test: (source) =>
      source.includes("getPublicObjectObservations") &&
      source.includes("loadMoreObservations") &&
      source.includes("当前展示 {obs.length} / {obsTotal} 条已审核观察"),
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
