# Lovable Payments handoff

This branch intentionally keeps the payment work small and reversible.

## What changed

- Added `src/routes/pricing.tsx`.
- Added `nav.pricing` to `src/components/SiteLayout.tsx`.
- Added bilingual pricing copy in `src/lib/i18n.tsx`.

## What did not change

- No Supabase migrations.
- No payment secrets.
- No Stripe Connector code.
- No changes to object pages, observation submission, feedback, admin review, auth, or AI analysis.

## Lovable prompt for the next step

```text
Please connect the existing /pricing page to Lovable built-in Payments only.

Hard constraints:
1. Do not delete, rename, move, or rewrite any existing routes, components, styles, database tables, or Supabase policies.
2. Do not refactor the app structure.
3. Do not use the legacy Stripe Connector.
4. Do not add Stripe or Paddle secret keys to source code.
5. Before changing code, confirm whether this project is compatible with Lovable built-in Payments. If the project uses external Supabase and built-in Payments is unsupported, stop and explain the blocker.
6. Reuse the existing buttons that have:
   - data-lovable-payment-plan="basic"
   - data-lovable-payment-plan="pro"
   - data-lovable-payment-plan="one-time"
   - data-lovable-customer-portal
7. Only replace the placeholder click handlers with Lovable Payments checkout / customer portal calls.
8. After finishing, list every file changed.
```
