# Female Friendly optimized package v7

This package integrates the Female Friendly Lovable code with the submit-flow, object-browsing,
deployment-readiness, and E2E verification fixes.

## Included fixes

- Save observations before AI analysis, so AI errors no longer erase submissions.
- Legal or regulatory penalty observations are treated as A-level evidence even if AI fails.
- Legal or regulatory penalty observations are included in temperature calculation immediately.
- Public object cards navigate to independent object detail pages.
- Object detail pages show approved observations and support pagination.
- Signed-out users can see the login/register entry.
- AI failure pages now tell the truth: the observation is saved when `ai_failed` is returned.
- Users can retry AI analysis for their own saved observations through `retryObservationAnalysis`.
- The retry button re-analyzes the existing observation instead of re-submitting and hitting the 24h quota.
- AI calls support Lovable Gateway by default, and DeepSeek/custom OpenAI-compatible providers through `AI_PROVIDER`, `AI_BASE_URL`, `AI_MODEL`, and `AI_API_KEY`.
- Public object detail reads now use an explicit public field allowlist instead of `select("*")`.
- `test:e2e` now runs Playwright browser tests instead of static source checks.
- `check:env` verifies required deploy environment variables before production rollout.
- `check:public` verifies anonymous Supabase reads when public env vars are available.
- `check:production` verifies service role access, admin role presence, and public-vs-service visibility when production secrets are configured.
- Supabase service role access accepts either `SUPABASE_SERVICE_ROLE_KEY` or `SERVICE_ROLE_KEY`.
- Supabase auth middleware accepts either `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` or the public `VITE_` variants.
- Unused Recharts/chart code was removed to reduce the client bundle.
- `.gitignore` excludes `.env`, `.env.*`, macOS `._*` files, build output, dependencies, and old zip packages.

## Key files

- `src/lib/api/platform.functions.ts`
- `src/routes/submit.$objectId.tsx`
- `src/routes/objects.$id.tsx`
- `src/components/ObjectCard.tsx`
- `scripts/check-critical-flows.mjs`
- `scripts/check-env.mjs`
- `scripts/check-production-readiness.mjs`
- `playwright.config.ts`
- `e2e/critical-public-flows.spec.ts`
- `docs/production-migration-checklist.md`
- `.env.example`
- `.gitignore`

## Verification

- `npm run lint`
- `npm run check:types`
- `npm run test:critical`
- `npm run build`
- `npm run test:e2e` runs browser checks when `E2E_BASE_URL` or local Supabase env vars are present.
