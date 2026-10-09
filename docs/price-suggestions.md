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
| `PRICE_REVIEW_PASSWORD` | Operator login; at least 24 characters |
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

Open `http://localhost:3000` (or the configured port), submit a suggestion, then
visit `/admin` and log in with the local `PRICE_REVIEW_PASSWORD`. There is one
operator login; the password is kept in the private local environment file.
The old `/price-review` URL redirects to `/admin`.

The admin panel separates **Gaida pārbaudi** (pending) from **Vēsture** (history),
shows global queue counts and current prices, and searches by venue or beer.
Lists are fetched in pages of 25; older reports remain reachable. Approving a
report publishes the price; rejecting it leaves prices unchanged. History shows
accepted/rejected reports and allows reverting a currently published override.
Login persists across reloads for one hour. Logout removes the admin session;
expired sessions clear the panel and return to login.

The baseline Compose command still works with the feature disabled. The added
Compose file is opt-in; no workflow or pipeline configuration was modified.

For an existing Node deployment, run the migration and seed scripts with the
owner connection, then `tsx scripts/db-price-roles.ts` with both role passwords.
Runtime must use `DATABASE_URL` for `beer_map_app` and `DATABASE_REVIEW_URL` for
`beer_map_reviewer`, plus `PRICE_SUGGESTIONS_ENABLED=true` and the login/signing
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
- PostgreSQL enforces 10 submissions per visitor/hour, 120 globally/hour and 30
  reviewer logins/hour across instances. Rotating anonymous cookies can evade the
  visitor limit; the global cap still applies. This is a bounded demo policy,
  not comprehensive bot prevention. Old quota buckets are removed after 48 hours.
- Visitor cookies last seven days; reviewer sessions last one hour. Cookies are
  HttpOnly and SameSite=Strict. Browser writes require the expected Origin.
  Public use requires HTTPS; HTTP is allowed only for local development. A
  reverse proxy must set `PRICE_ALLOWED_ORIGIN` to the exact public HTTPS origin;
  arbitrary forwarded headers are not trusted. Changing the signing secret
  invalidates sessions. Compose can pass that variable as an additional override.
- This demo has one operator credential and actor name (`PRICE_REVIEWER_NAME`,
  default `operator`), not individual admin accounts. SQL retains the full
  history, with paginated access from the admin panel. Larger production use
  needs individual identities and an explicit retention/backup policy before
  rollout.

## Verification

No CI wiring was added. Local commands from `application/`:

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
database ending in `_prices_e2e`, and `PRICE_E2E_REVIEW_PASSWORD` to its operator
password. Provision that separate database first; point both runtime connections
and setup at it. The runner checks an API/database fixture marker before making
writes. It clears previous feature fixtures there and creates synthetic reports;
never point it at a real catalog database.

It exercises invalid input, retry after a network failure, durable pending
submission, duplicate retry, authentication, Origin rejection, approval, ETags,
price/litre/filter updates in another browser context, reload persistence,
stale edits, several bars, mobile submission, rejection and reversal. Admin checks
also cover legacy-route redirection, queue/history views, search, equal-timestamp
pagination, failed refresh, session expiry, reload and logout. Screenshots
are saved under `application/output/playwright/prices/`; failure traces exclude
the reviewer login context. The existing browser regression separately covers
map interaction, mobile geometry, time filters and failed-runtime recovery.

The actual verification stack uses a separate Compose project and port 3010.
No public deployment or GCP resources were created. The intentionally offline
public Cloudflare worker remains offline. Local implementation does not enable
this feature on any existing public site.
