# Price suggestions

Users can select an existing beer/serving in the map menu or venue list, choose
**Ieteikt cenu**, and submit a proposed price, optional source URL and note.
PostgreSQL saves the suggestion immediately as **pending**. A reviewer checks
the serving and source at `/admin`, then approves or rejects it. The map's
**Admin** link opens the protected administrator login. Regular visitors can
submit suggestions; only an authenticated administrator can publish prices.

Approval updates the public catalog without rebuilding: serving price, map
marker, price filters and price-per-litre sorting all use the accepted value.
The frontend refreshes every 30 seconds while visible, on returning to the tab,
or through its refresh button. Rejection leaves the public catalog unchanged.
The reviewer can revert a current override; approval and reversal both record
history. Original sourced catalog files and research dates remain intact.

## Local Docker setup

Run from the repository root. Create an ignored `infrastructure/.env` using
`application/.env.example` as a starting point. Add **different random values**
for these variables; use URL-safe hexadecimal strings for database passwords:

| Variable | Purpose |
| --- | --- |
| `POSTGRES_PASSWORD` | Database owner, used only by database/setup containers |
| `APP_DATABASE_PASSWORD` | Restricted submission connection; at least 24 characters |
| `REVIEW_DATABASE_PASSWORD` | Restricted reviewer connection; at least 24 characters |
| `VITE_CLERK_PUBLISHABLE_KEY` | Development publishable key pulled by Clerk CLI |
| `CLERK_SECRET_KEY` | Development backend key; server only |
| `PRICE_ALLOWED_ORIGIN` | Exact browser origin, e.g. `http://localhost:3000` |
| `PRICE_SESSION_SECRET` | Cookie signing; at least 32 characters |
| `APP_PORT` | Optional local port; defaults to 3000 |

For example, generate each value separately in PowerShell:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Keep the file private; do not commit or paste its contents into a PR.

```sh
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml -f infrastructure/compose.prices.yaml up --build -d --wait
```

Setup runs migrations, seeds the serving registry and configures database
permissions. Existing volumes retain submissions and overrides across container
recreation and repeated `--if-empty` seeding. Changing a database-owner password
in an env file does not change an already initialized PostgreSQL volume's owner
password; update it explicitly before restarting with new credentials.

From `application/`, run `npx -y clerk@latest auth login`, then
`npx -y clerk@latest init --app <your-app-id>`. The CLI writes ignored
`.env.local`; never paste or commit its keys. Use a Development application.
Enable email/password, required authenticator MFA for sign-up and sign-in,
and backup codes. Disable passwordless and social sign-in for this demo.

The non-secret settings applied to BeerMap Development are recorded in
`infrastructure/clerk-development.json`. Review with
`npx -y clerk@latest config patch --instance dev --file ../infrastructure/clerk-development.json --dry-run`
from `application/` before applying to another instance. Disable any additional
social providers if the target application has them enabled.

Pass both environment files to Compose (from repository root):

```sh
docker compose --env-file infrastructure/.env --env-file application/.env.local -f infrastructure/compose.yaml -f infrastructure/compose.prices.yaml up --build -d --wait
```

Open `http://localhost:3000/admin` (use the exact configured origin), create an
individual account, enroll an authenticator and save backup codes privately.
Signing up grants no admin access. With a trusted **database-owner** connection
in `DATABASE_URL`, run from `application/`:

```sh
npm run db:admin -- grant user_...
npm run db:admin -- revoke user_...
```

Grant verifies the Clerk user has a password and enrolled authenticator. The
HTTP database roles cannot grant themselves access. PostgreSQL stores only
Clerk user IDs and permissions, never admin passwords or authenticator secrets.
Clerk manages passwords and MFA. The old `admin` password and review cookies
are rejected; the legacy login endpoint returns 410. `/price-review` redirects
to `/admin`.

The admin panel separates **Gaida pārbaudi** (pending) from **Vēsture** (history),
shows global queue counts and current prices, and searches by venue or beer.
Lists are fetched in pages of 25; older reports remain reachable. Approving a
report publishes the price; rejecting it leaves prices unchanged. History shows
accepted/rejected reports and allows reverting a currently published override.
Clerk manages session lifetime and logout. Every admin request verifies the
Clerk token, active session, account state, enrolled MFA and database allowlist.
Writes require both authentication factors to be less than ten minutes old;
otherwise the panel asks for a new sign-in. Expiry and permission failures clear
the displayed queue. Audit history records the authenticated Clerk user ID.

The baseline Compose command still works with the feature disabled. The added
Compose file is opt-in. CI's `integration` job runs the SQL suite and the
Playwright Test suite below (see `docs/docker-postgres.md`).

For an existing Node deployment, run the migration and seed scripts with the
owner connection, then `tsx scripts/db-price-roles.ts` with both role passwords.
Runtime must use `DATABASE_URL` for `beer_map_app` and `DATABASE_REVIEW_URL` for
`beer_map_reviewer`, plus `PRICE_SUGGESTIONS_ENABLED=true` and the Clerk/signing
variables. Do not give the HTTP process the owner connection. Run npm commands
from `application/`.

## Data and limits

- Stable serving IDs include venue, beer name, volume, multipack and from-price
  semantics, excluding price and array order. Renaming an identity retires its
  old serving; suggestions are not automatically moved to a different item.
- Prices are exact integer cents: EUR 0.01–500.00, at most two decimal places;
  comma and dot input are supported. Prices apply to the whole selected serving
  or multipack, preserving any existing “from” qualifier.
- Request IDs deduplicate retries. Serving revision checks and row locks prevent
  competing approvals from overwriting newer prices. A stale submission refreshes
  the form's current quote while retaining the user's input.
- Approval requires a valid HTTP(S) evidence URL and a nonfuture observation
  date. The operator must inspect the source; URL validation does not prove its
  contents. Evidence is displayed per serving, separate from baseline provenance.
- PostgreSQL enforces 10 submissions per visitor/hour, 120 globally/hour. Clerk handles
  administrator login protections. Rotating anonymous cookies can evade the
  visitor limit; the global cap still applies. This is a bounded demo policy,
  not comprehensive bot prevention. Old quota buckets are removed after 48 hours.
- Visitor cookies last seven days. These visitor cookies are
  HttpOnly and SameSite=Strict. Browser writes require the expected Origin.
  Public use requires HTTPS; HTTP is allowed only for local development. A
  reverse proxy must set `PRICE_ALLOWED_ORIGIN` to the exact public HTTPS origin;
  arbitrary forwarded headers are not trusted. Changing the signing secret
  invalidates visitor cookies. Compose can pass that variable as an additional override.
- This is a Development-only Clerk integration. Live Clerk keys are rejected.
  Before production, revisit Clerk pricing, recovery, backups, permission
  administration, rate limits and retention. Development verification does not
  establish production readiness.

## Verification

No CI wiring was added. Local commands from `application/`:

To watch the robot run the existing map checks in a visible browser:

```sh
npm run test:browser:show
```

This opens Chromium, slows the actions for watching, and automatically clicks,
searches, filters, opens bar menus and checks mobile interactions. It targets the
local preview on port 3010; set `BEER_MAP_TEST_URL` to use another running app.
The browser closes when the checks finish. It does not change database prices.

### Playwright Test dashboard (recommended)

Start Docker Desktop, then run these commands from the repository root:

```powershell
cd application
npx playwright test --ui
```

The sidebar lists `map.spec.mjs`, `prices.spec.mjs` and `admin-mfa.spec.mjs`. Click the green **Run all**
button (or press F5), or run one test. Select a test to see its browser actions,
snapshots and source; the playback controls replay those actions.

The test fixture automatically builds and starts a separate local Compose project,
`beer-map-playwright`, with the test app at `127.0.0.1:3011` and its own PostgreSQL
database/volume. The first run can take longer while Docker builds the image.
It generates private database credentials in ignored
`application/artifacts/playwright.env`; there is no shared admin password.
It verifies that the app uses the test database before resetting test reports.
Your preview on port 3010 and its reports are untouched. Containers stop after the
run; the test volume and matching credentials remain for subsequent runs.

For a standalone visible browser, run `npx playwright test --headed` from
`application/`. For headless execution, use `npx playwright test`.
Runner traces/results are saved in `application/output/playwright/test-results/`.
Review login contexts are not traced; keep all artifacts local.
CI runs the same suite with `npm run test:browser:suite` in the `integration` job.

Other verification commands:

```sh
npm run check
npm run build
npm run test:prices:postgres
npm run test:browser:prices
npm run test:browser
```

The SQL suite requires an owner `BEER_MAP_TEST_DATABASE_URL` for a disposable
database ending in `_prices_test`, plus `APP_DATABASE_PASSWORD` and
`REVIEW_DATABASE_PASSWORD`. It clears only that database's feature fixtures.
It checks migrations, repeated seeding, idempotency, competing approvals,
reversal, constraints, quotas, rollback and restricted runtime permissions.

The browser suite uses `playwright/price-suggestions.mjs`, invoked through
`application/scripts/check-price-interactions.mjs`. Set `BEER_MAP_TEST_URL` to
the local feature-enabled app, `PRICE_E2E_DATABASE_URL` to its **disposable**
database ending in `_prices_e2e`. Provision that separate database first; point both runtime connections
and setup at it. The runner checks an API/database fixture marker before making
writes. It clears previous feature fixtures there and creates synthetic reports;
never point it at a real catalog database.

Default price checks exercise invalid input, network retry, durable pending
submission, duplicate retry and denied admin writes. The optional Clerk MFA
scenario continues through authenticated approval, rejection, reversal, price
and ETag updates, history, search, pagination and logout. That authenticated
scenario requires a dedicated enrolled identity and has not yet passed here.
Screenshots are stored under `application/output/playwright/prices/`.
The map regression separately covers mobile geometry, filters and recovery.

The actual verification stack uses a separate Compose project and port 3010.
No public deployment or GCP resources were created. The intentionally offline
public Cloudflare worker remains offline. Local implementation does not enable
this feature on any existing public site.

### Clerk MFA test coverage

Default browser tests cover the map and anonymous suggestions with database persistence and denied admin writes. The full MFA review test is explicitly skipped unless development keys and `CLERK_E2E_EMAIL`, `CLERK_E2E_PASSWORD`, `CLERK_E2E_TOTP_SECRET` and `CLERK_E2E_USER_ID` are supplied in the test process environment. Use a dedicated pre-enrolled Development account, not your personal administrator. Keep credentials in ignored local configuration. The test grants that ID only in the isolated test database and removes it afterward. It enters password and real TOTP through the UI; no email-only Clerk sign-in helper or authentication bypass is used. Review login contexts are not traced. This scenario remains unverified until such an account is configured and the test passes.
