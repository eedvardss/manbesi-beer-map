# Rīgas alus karte

A Riga beer-price map. Search bars and beers, compare prices, and check opening
times. Visitors can suggest prices; admins review changes using Clerk login and MFA.

## Run locally

Install Git and Docker Desktop. Start Docker Desktop with Linux containers.

```powershell
git clone https://github.com/eedvardss/manbesi-beer-map.git
cd manbesi-beer-map
Copy-Item application/.env.example infrastructure/docker/.env
```

Open `infrastructure/docker/.env` and replace `POSTGRES_PASSWORD` with a long,
random password using letters and numbers. Then run:

```powershell
docker compose --env-file infrastructure/docker/.env -f infrastructure/docker/compose.yaml up --build -d --wait
```

Open **http://localhost:3000**. This starts the map and PostgreSQL; migrations
and initial data are loaded automatically. The first build takes longer.

## Enable suggestions and admin review

1. Add different random values for `APP_DATABASE_PASSWORD`,
   `REVIEW_DATABASE_PASSWORD` (at least 24 characters each), and
   `PRICE_SESSION_SECRET` (at least 32 characters) to `infrastructure/docker/.env`.
   Use letters and numbers for the database passwords.
2. Create a Clerk **Development** app with email/password login and required
   authenticator MFA. Save its `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
   in the ignored `application/.env.local` file.
3. Start the feature-enabled stack:

```powershell
docker compose --env-file infrastructure/docker/.env --env-file application/.env.local -f infrastructure/docker/compose.yaml -f infrastructure/docker/compose.prices.yaml up --build -d --wait
```

Use **http://localhost:3000/admin** to create an account and enrol an
authenticator. An owner must grant access with `npm run db:admin -- grant user_...`
from `application/`, using a reachable database-owner `DATABASE_URL` in `.env.local`.
The default Docker database is internal; it is not exposed to the host.
See [admin setup](docs/price-suggestions.md) for details. Keep passwords and keys out of Git.

## Run tests

Install Node.js 22.13 or newer. Run from `application/`:

```powershell
cd application
npm ci
npm run check
npx playwright install chromium
npx playwright test --ui
```

Press the green play button. Tests start their own Docker stack. To watch a
browser window, use `npx playwright test --headed`. The admin-MFA test needs a
dedicated test account; otherwise it is skipped.

## Stop the app

From the repository root:

```powershell
docker compose --env-file infrastructure/docker/.env -f infrastructure/docker/compose.yaml down
```

Saved data stays in the Docker volume. Start again with the same passwords.

## Project files

- `application/` — website, API, database scripts and application tests.
- `infrastructure/` — Docker, Terraform and Helm.
- `playwright/` — browser tests.
- `.github/workflows/` — checks, builds and deployments.
- `docs/` — detailed setup and design notes.

For cloud setup, see [Deploying to GCP](docs/deploying-to-gcp.md).
