# Validation — 3 October 2026

The implementation was tested against an actual local Supabase stack (PostgreSQL 17, Auth, PostgREST and Mailpit), not a mocked database. No hosted services were provisioned and nothing was deployed publicly.

| Check                       | Result                                                                      |
| --------------------------- | --------------------------------------------------------------------------- |
| TypeScript                  | Passed                                                                      |
| ESLint                      | Passed, no warnings                                                         |
| Prettier                    | Passed                                                                      |
| Vitest                      | 12 tests passed                                                             |
| PostgreSQL / pgTAP          | 40 security tests passed                                                    |
| Playwright Chrome           | 9 browser tests passed (8-case core run plus targeted role/membership flow) |
| Production build            | Passed using Next.js's supported Webpack builder                            |
| Production dependency audit | Zero known npm advisories                                                   |
| Git whitespace check        | Passed                                                                      |

Browser coverage includes desktop/mobile login, recovery navigation, unauthenticated redirects, CSRF rejection, manifest/offline assets, administrative branch/account creation, temporary-password login, mandatory-change page and direct API blocking, password update, actual public-registration rejection by Supabase, and safe server-rendered forms before hydration. A further browser test created a custom branch role, assigned an existing person to a second branch through the branch switcher, verified the resulting role assignment, and checked the mobile dashboard for page overflow. Desktop and mobile layouts were visually reviewed. The administrator's initial password change was also exercised against local Auth before the completed suite.

Database tests cover Super Admin/Admin/Manager/User distinctions, cross-branch reads and writes, direct security-flag/global-role/audit writes, command grants, custom-role escalation, multi-scope account reset/deactivation, inactive accounts with existing sessions, inactive branches, last-active-Super-Admin protection, preservation of another branch's membership, cross-branch role foreign keys, password-operation tokens/concurrency/failure restrictions, audit creation, and durable rate limiting. Unit tests exercise authority decisions, validation, provisioning rollback and failed rollback recording.

## Tooling notes

- Turbopack could not create its worker socket in this environment. The committed build/dev commands use supported Webpack; the production build succeeded with and without configured Supabase variables.
- Playwright's Chromium download timed out. Tests passed using installed Chrome via `PLAYWRIGHT_CHANNEL=chrome`.
- Supabase image downloads initially hit registry rate limits, then completed. The stack and tests ran successfully.
- The machine has Node 23.11.0. Install/deploy with the documented supported Node 22.13+ or Node 24 LTS versions; current Vitest's engine declaration does not include Node 23, although its tests ran here.
- ESLint 10 is not compatible with the currently bundled Next.js React lint plugin, so ESLint 9.39.5 is retained. `npm audit` reports five high-severity **development-only dependency paths** rooted in the unpatched `braces <=3.0.3` stack-exhaustion advisory, through Next.js's lint tooling. No patched braces release was available during validation. The production dependency audit is clean. Do not lint untrusted glob patterns; revisit the tooling dependency update before upgrading. The earlier Vitest advisory was removed by updating to 5.0.3.

## Remaining deployment verification

A real Supabase project, Netlify site, hosted Auth settings, exact HTTPS redirect URLs and custom SMTP credentials must be configured manually. Actual production email delivery, HTTPS PWA installation on target devices, usage limits, backups and production acceptance testing remain deployment tasks. Local mail recovery is available via Mailpit; browser recovery-link delivery is not represented by the navigation-only recovery smoke test.

## Logo palette and responsive UI follow-up

The interface now uses logo-derived forest green (`#085010`) and gold (`#b89038`), a deep green navigation surface (`#082f17`), and ivory (`#f7f7f2`). Login, workspace navigation, dashboards, forms, badges, and PWA theme colors share the palette. Dashboard branch tables become readable cards on phones, and the mobile menu closes after navigation.

Three additional Playwright checks passed: simulated Grammarly attributes on `body` produce no hydration warning; sign-in works without overflow at 320/390/768/1440 pixels; and dashboard, branches, people, roles, profile, and audit screens fit those widths with working mobile navigation. Desktop and phone screenshots were visually reviewed. Build, TypeScript, ESLint, and formatting passed after this refresh.

The extension compatibility exception is deliberately restricted to `body` via `suppressHydrationWarning`; nested application components still report their own hydration mismatches. No authentication or permission checks were relaxed.
