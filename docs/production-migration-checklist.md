# Production Migration Checklist

Required production migration:

`supabase/migrations/20260606143000_restore_public_object_browsing.sql`

Why it matters:

- Published, non-hidden objects must be readable by both anonymous and logged-in users.
- Object detail pages depend on public object reads plus approved observation reads.
- Without this migration, the UI can look correct locally while deployed anonymous users still cannot browse full object pages.

Pre-upload migration check:

```bash
npm run check:migrations
```

Expected result:

```text
supabase/migrations/20260606143000_restore_public_object_browsing.sql is present and restores public object browsing.
```

Production environment check:

```bash
npm run check:env
npm run check:production
```

Expected result in the configured production or deployment environment:

```text
Deployment environment check passed.
```

Required environment variables:

- `VITE_SUPABASE_URL` or `SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` or `SERVICE_ROLE_KEY`
- AI provider:
  - Lovable Gateway default: `LOVABLE_API_KEY` or `AI_API_KEY`
  - DeepSeek: `AI_PROVIDER=deepseek` and `AI_API_KEY`
  - Custom OpenAI-compatible endpoint: `AI_BASE_URL`, `AI_MODEL`, and `AI_API_KEY`

DeepSeek example:

```bash
AI_PROVIDER=deepseek
AI_API_KEY=sk-...
# Optional; defaults are already built in:
AI_BASE_URL=https://api.deepseek.com/chat/completions
AI_MODEL=deepseek-chat
```

Production verification after deployment:

- Open `/objects` while logged out.
- Open any published object detail page while logged out.
- Confirm the object profile and approved observations are visible.
- Run public read verification if only public Supabase env vars are available:

```bash
npm run check:public
```

- Run full production verification when service role and AI keys are configured:

```bash
npm run check:production
```

- Run browser E2E against the deployed site:

```bash
E2E_BASE_URL=https://your-production-domain npm run test:e2e
```

Manual dashboard checks that cannot be completed from this package alone:

- Supabase Auth email or magic-link login provider is enabled.
- Supabase Auth redirect URLs include the production domain.
- At least one real user has `admin` in `user_roles`.
