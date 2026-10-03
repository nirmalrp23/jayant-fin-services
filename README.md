# JN Fin Services

Internal administration for roughly 10 branches and 50 staff. Built with Next.js App Router, TypeScript, Tailwind CSS, a locally owned shadcn/ui Button, Supabase Auth/Postgres, and Zod. No loans, accounting, customer records, or public registration are included.

## Run locally

Use **Node 22.13+ LTS** (or Node 24 LTS), npm and Docker Desktop.

```sh
npm ci
npm run db:start
cp .env.example .env.local
```

Get local URL/keys from `npx supabase status`. Put the URL, anon/publishable key and service-role key into `.env.local`; keep it untracked. Set `APP_ORIGIN=http://localhost:3000` and generate `RATE_LIMIT_SECRET` using `openssl rand -hex 32`. Never use hosted production credentials for tests.

```sh
npm run db:reset
npm run bootstrap
npm run dev
```

Before bootstrap, set `BOOTSTRAP_EMAIL`, `BOOTSTRAP_PASSWORD` and optional `BOOTSTRAP_NAME` in `.env.local`. Use a unique password with 12+ characters, uppercase, lowercase, digit and symbol. The CLI creates the first Super Admin and requires a password change on first login. It never overwrites credentials on reruns, refuses a second initial administrator, and has no HTTP route. Remove bootstrap values after use.

Local seed adds two sample branches and Manager/User roles, **no identities**. Production migrations do not seed demo branches. New branches automatically receive default roles. Open [local application](http://localhost:3000), sign in, change the temporary password and sign in again.

## Application

- Dashboard, branch switcher and scoped counts.
- Branch list/detail, create/edit/deactivation.
- Staff list/detail, account provisioning, activation, one-time temporary passwords.
- Multi-branch memberships, branch Manager authority and additive custom roles.
- Global Super Admin/Admin authority managed separately.
- Mandatory password change, forgotten-password recovery, logout and profile.
- Sanitised administrative audit history, responsive desktop/mobile navigation.
- Installable PWA; generic offline page, no offline account data or writes.

Select a branch before creating branch staff or editing memberships/roles. Managers can only edit account-wide fields or reset/deactivate an account when **every membership**, including inactive ones, is within their active managed branches and the target has no Manager/global authority. Otherwise, only the allowed branch membership can be changed. Standard users can hold custom permissions, but Manager-only actions still require Manager authority. Existing users not visible to a Manager must be linked by a global administrator; no cross-branch identity directory is exposed.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run test:db
npx playwright install chromium
npm run test:e2e
npm run build
```

Database tests run in a transaction and roll back their fixtures. Browser smoke tests require no credentials; the administrative journey requires `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` for a **local** administrator whose mandatory password change is complete. It creates uniquely named test branches/users. Use a disposable local database, then `npm run db:reset` when finished. Never point this suite at production. See [validation results](docs/validation.md).

## Supabase deployment (manual)

1. Create a Supabase project yourself. Store its database password securely.
2. **Before adding staff**, In Auth configuration, turn off the global “Allow new users to sign up” setting. Keep the email/password provider enabled. Locally, `[auth].enable_signup=false` blocks registration while `[auth.email].enable_signup=true` keeps email login enabled (the CLI maps the latter to provider enablement); that file does not automatically change hosted settings. Confirm hosted `/auth/v1/signup` rejects registration.
3. Apply version-controlled migrations with `npx supabase login`, `npx supabase link --project-ref YOUR_PROJECT_REF`, then `npx supabase db push`. Review the SQL before running. Do not run the local demo seed on production.
4. Copy the project URL and publishable key (legacy anon key supported) into browser-safe environment variables. Keep the secret/service-role key server-only.
5. Run bootstrap from a trusted machine using the hosted environment. Remove bootstrap credentials afterwards.
6. Configure Auth Site URL as the exact HTTPS production origin. Allow `https://YOUR_SITE/auth/callback` and, only for local development, `http://localhost:3000/auth/callback`. Avoid broad wildcard redirect URLs. The callback always goes to password change and never accepts an arbitrary destination.
7. Set the Auth minimum password length to at least 12 and enable supported password-strength controls. Keep built-in Auth rate limiting enabled; the application adds database-backed account/action limits. For Internet deployment, configure Supabase Auth CAPTCHA for additional abuse resistance if needed; the app's durable limiter uses account and application buckets rather than untrusted IP headers.
8. Configure custom SMTP in Supabase for real password recovery. Built-in mail is limited and intended for testing, with restrictions on recipients. Set sender/domain and provider credentials in Supabase, verify DNS and delivery, and test a recovery email. Keep the recovery template's `{{ .ConfirmationURL }}` link for the PKCE redirect flow. Open it in the **same browser** that requested it; a different browser lacks the verifier and should request a new link. Locally, inspect Mailpit at port 54324.
9. Test all four authority levels and a multi-branch Manager before inviting staff. Arrange backups/export and monitoring appropriate to an internal production system.

## Netlify deployment (manual)

Create/import the repository on Netlify. Build command: `npm run build`; publish directory: `.next`. Netlify's automatically installed OpenNext adapter supports App Router/SSR. Do not configure static export.

Set variables for both build and runtime:

| Variable                               | Visibility                                      |
| -------------------------------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Browser safe                                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser safe; protected by RLS                  |
| `SUPABASE_SERVICE_ROLE_KEY`            | **Server-only secret**, bypasses RLS            |
| `APP_ORIGIN`                           | Exact canonical HTTPS origin, no trailing slash |
| `RATE_LIMIT_SECRET`                    | **Server-only**, random 32+ character secret    |

Do not set `BOOTSTRAP_*` or test credentials on Netlify. Use separate Supabase projects for production and previews; `APP_ORIGIN` must match the origin the user accesses. Unknown/preview origins cannot mutate the production backend. Deploy only after local checks and hosted Auth configuration are verified. No cloud resources or public deployments are created by this repository.

## PWA

Chrome/Edge: use the browser's Install app action. iOS: Safari → Share → Add to Home Screen. HTTPS is required except on localhost. The service worker only caches an explicit list of icons and the generic offline page. Navigation always goes to the network; API/auth responses are never cached. New workers activate immediately and remove old static caches; no versioned JS or authenticated HTML is retained by the worker. Online connectivity is required for all staff operations.

## Free-plan considerations

Checked 3 October 2026; plans can change. Supabase Free currently lists 500 MB database storage, 50,000 monthly active users and 5 GB egress; free projects may pause after inactivity and do not include production-grade backup guarantees. Netlify's credit-based Free plan lists 300 monthly credits with a hard limit shared by deploys, compute, bandwidth and requests. Actual SSR traffic/build frequency determines usage. Ten branches and 50 users alone do not guarantee staying within free limits. Custom SMTP may have separate provider limits/costs. Review the account dashboards and pricing before production use.

Official references used:

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation) and [version 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [advanced session guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [Supabase Auth configuration](https://supabase.com/docs/guides/auth/general-configuration), [rate limits](https://supabase.com/docs/guides/auth/rate-limits), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [shadcn/ui Next.js](https://ui.shadcn.com/docs/installation/next), [Zod](https://zod.dev/basics)
- [Netlify Next.js](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), [credit limits](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/), [Supabase pricing](https://supabase.com/pricing)

See [architecture and security](docs/architecture.md) for invariants and failure recovery.

### Disposable local browser test setup

On a fresh local database with no `.env.local`, run `npx tsx scripts/local-test-setup.ts`. It refuses hosted URLs and existing environment files, creates a random local-only administrator, and writes the test configuration to an ignored, owner-readable `.env.local`. Run `PLAYWRIGHT_CHANNEL=chrome node --env-file=.env.local node_modules/@playwright/test/cli.js test` to use an installed Chrome, or omit the channel after downloading Playwright Chromium. With `E2E_FIRST_LOGIN=1`, the test completes the administrator's first password change and uses the new password for the rest of the run. After this first run, update the local test password to the changed value and remove `E2E_FIRST_LOGIN` before repeating; alternatively reset the disposable test database and recreate its environment. The changed test password appends `-Changed9!` to the generated initial value. Browser traces are disabled to avoid recording temporary passwords.

The email-provider distinction is tracked in [Supabase's configuration issue](https://github.com/supabase/supabase/issues/40582). Verify registration rejection after every deployment/configuration change.
