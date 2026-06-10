# CMSDATA-12 — Transactional email path audit

> Audit date: 2026-06-10 · branch `feat/convex-migration` · audit-first task: the deliverable is this
> document. **Result: zero live mail-sending flows exist.** Nothing to rebuild on a direct Resend
> client; the single remaining `@payloadcms/email-resend` reference is dormant and lives inside the
> Payload config whose deletion is already scoped to **TEARDOWN-02** (tasks.md, wave 17).

## Method

Repo-wide grep over `apps/`, `packages/`, `scripts/` (excluding `node_modules`, `dist`, `.next`,
`coverage`, and the base64-noise `react-payment-brand-icons` generated icons) for every transport
and config marker:

```
@payloadcms/email-resend · resendAdapter · from 'resend' · require('resend') · nodemailer
sendEmail( · .sendEmail · RESEND_API_KEY · EMAIL_FROM · smtp · mailgun · postmark · sendgrid
EmailProvider (NextAuth) · auth.verify / forgotPassword (Payload collections)
```

Hits (complete list):

| File | What |
| --- | --- |
| `packages/cms/src/config/index.ts:2,221-225` | the only `@payloadcms/email-resend` import + `resendAdapter` wiring |
| `packages/cms/package.json:150,167` | `@payloadcms/email-resend` peer + dev dependency rows |
| `.env.example:113-114` | `RESEND_API_KEY=` template entry |

No other transport client, SDK, or `sendEmail` call exists anywhere in the repo. There is no
`apps/admin/src/lib/email/` directory and — per the decisions below — none is created: a Resend
client with no caller would be dead code on day one.

## Flow inventory

| # | Flow | Who sends | Trigger | Template | Decision |
| --- | --- | --- | --- | --- | --- |
| 1 | Payload auth emails (forgot-password / verification) | Payload via `resendAdapter` in `buildPayloadConfig` | Payload local auth strategy (`/api/users/forgot-password`, `auth.verify`) | Payload built-ins | **REMOVE** — already dead; physical removal lands with TEARDOWN-02 |
| 2 | Admin sign-in (NextAuth) | — (no email provider) | — | — | **NO FLOW** — OAuth-only, nothing to rebuild |
| 3 | Storefront / landing transactional mail (contact, order, customer notifications) | — (no transport exists) | — | — | **NO FLOW** — Shopify owns commerce transactional email |
| 4 | Editor / revalidation notifications | — | — | — | **NO FLOW** — revalidation notifies via HMAC-signed HTTP webhooks (`convex/revalidate/notify.ts` → storefront `/api/revalidate/convex`), not mail |

## Flow 1 — Payload auth emails: REMOVE (deferred to TEARDOWN-02)

**Wiring.** `packages/cms/src/config/index.ts:221-225` registers
`resendAdapter({ defaultFromAddress: '', defaultFromName: '', apiKey: process.env.RESEND_API_KEY || '' })`
on every Payload boot. Two boot paths exist:

- `apps/admin/src/payload.config.ts` — the pre-cutover admin. It passes `disablePasswordLogin: true`,
  which `buildUsers` (`packages/cms/src/collections/build-users.ts:51`) turns into
  `disableLocalStrategy: { enableFields: true }`. That disables the password login flow — including
  the REST `/api/users/forgot-password` path that is the *only* Payload operation which would have
  sent mail here. Admin auth is NextAuth GitHub OAuth (flow 2).
- `packages/cms/src/api/get-payload-instance.ts` — the storefront-side read-only singleton
  (`includeAdmin: false`). Its default `users` collection technically keeps the local strategy, but
  this instance is only ever reached through the `get-*` data readers (`get-page.ts`,
  `get-header.ts`, …) and `packages/test-mongo/src/seed/cms.ts`; no route or call site invokes any
  auth operation against it.

No collection sets `auth.verify`, and no hook anywhere calls `payload.sendEmail` — the grep set
above returns zero hits for either. The adapter is also configured with an **empty from
address/name and an empty-string API key fallback**, so even an accidental send would fail at the
Resend API. The flow has been dead since the NextAuth cutover.

**Decision: REMOVE — but not in this task.** The import sits inside the live Payload config that
the admin still boots pre-cutover. Half-removing it now (deleting the `email:` block while the
Payload app survives) would only swap a dead Resend adapter for Payload's console fallback adapter
plus a boot-time warning, for zero behavior change — and it would put a Payload-config edit in this
wave that TEARDOWN-02 then re-touches. TEARDOWN-02 (tasks.md, wave 17, "Remove the full Payload
application surface") already lists `@payloadcms/email-resend` in its deletion set alongside
`payload` itself; the `resendAdapter` wiring, the two `package.json` rows in `packages/cms`, and
the `RESEND_API_KEY=` line in `.env.example` (plus its "# Email." section header) are removed
there. **Landing task: TEARDOWN-02.**

This satisfies the CMSDATA-12 acceptance shape "no `@payloadcms/email-resend` import remains
*outside* the Payload config slated for TEARDOWN-02": the config import is the only one in the
repo, and it is hereby explicitly documented as TEARDOWN-02 scope rather than half-removed.

## Flow 2 — Admin sign-in (NextAuth): NO FLOW

`apps/admin/src/utils/auth.config.ts` configures exactly one provider: GitHub OAuth. There is no
NextAuth `Email`/`Nodemailer`/`Resend` provider, so NextAuth never sends magic-link or verification
mail; the adapter (`auth.adapter.ts`) implements `getUserByEmail` as a lookup only and has no
`verificationToken` surface in use. The post-migration Convex admin auth stays OAuth-only. Nothing
to rebuild. If a magic-link sign-in is ever wanted, that is a new feature (Auth.js Resend provider
+ a direct client under `apps/admin/src/lib/email/`), not a migration concern.

## Flow 3 — Storefront / landing: NO FLOW

No transport client exists in `apps/storefront` or `apps/landing`. Order confirmations, customer
account mail, and every other commerce transactional message are sent by Shopify — the storefront
is headless over the Storefront API and never owned those sends. The only "email" in CMS content is
the `businessData.supportEmail` *field* (`packages/cms/src/collections/_globals/business-data.ts`),
which is rendered contact data, not a send path. There is no contact-form submission endpoint in
either app.

## Flow 4 — Editor / revalidation notifications: NO FLOW

Publish notifications travel as HMAC-signed HTTP webhooks (`packages/convex/convex/revalidate/`
→ the storefront's `/api/revalidate/convex` route), with the action-retrier + DLQ for durability.
No mail component exists or is planned for this path.

## Environment variables

`RESEND_API_KEY` (root `.env.example:114`) feeds only the dormant flow-1 adapter. It stays in the
template until TEARDOWN-02 deletes the adapter, then goes with it. No other email-related env var
(`EMAIL_FROM`, SMTP, etc.) exists in any env template.

## Conclusion

- Flows rebuilt on a direct Resend client: **none needed** — no live sender exists.
- Flows removed: flow 1, dead since the NextAuth cutover; physical deletion of the adapter, the
  `@payloadcms/email-resend` dependency rows, and `RESEND_API_KEY` is **TEARDOWN-02 scope**.
- `apps/admin/src/lib/email/` is deliberately **not** created in this task.
