# Run the system

This guide starts the website, PostgreSQL, price suggestions and the admin panel
on your own computer. It also explains how to try the features and run the tests.
The commands below use **PowerShell**. Run them from the repository root unless
a step says otherwise.

You do not need GCP to run the local system. You need a **Clerk Development app**
for admin login and MFA. Without Clerk, the map and anonymous price suggestions
can run, but admin review is unavailable.

## 1. Install the tools and get the code

Install Git, Node.js 22.13 or newer, and Docker Desktop. Start Docker Desktop and
use Linux containers. Docker Compose must support `!override` for the isolated
Playwright stack (Compose 2.24.4 or newer).

```powershell
git clone https://github.com/eedvardss/manbesi-beer-map.git
cd manbesi-beer-map
docker version
docker compose version
node --version
```

If cloning is denied, ask the repository owner for access and sign in to GitHub.
If `docker version` cannot reach the server, finish starting Docker Desktop first.

Install the application dependencies:

```powershell
cd application
npm ci
cd ..
```

## 2. Create your local settings

Copy the example once. If you already have a working `.env`, edit it instead of
overwriting it. Existing database volumes must keep their matching passwords.

```powershell
Copy-Item application/.env.example infrastructure/docker/.env
```

Open `infrastructure/docker/.env`. Set these values:

```dotenv
POSTGRES_PASSWORD=YOUR_RANDOM_DATABASE_OWNER_PASSWORD
APP_DATABASE_PASSWORD=YOUR_DIFFERENT_RANDOM_APP_PASSWORD
REVIEW_DATABASE_PASSWORD=YOUR_DIFFERENT_RANDOM_REVIEW_PASSWORD
PRICE_SESSION_SECRET=YOUR_DIFFERENT_RANDOM_SESSION_SECRET
APP_PORT=3000
PRICE_ALLOWED_ORIGIN=http://localhost:3000
```

Replace each `YOUR_...` value with a different random value. Use hexadecimal
passwords so they can be used in database URLs without escaping. This command
works in Windows PowerShell and PowerShell 7; run it separately for each value:

```powershell
$randomBytes = New-Object byte[] 32
$randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
$randomGenerator.GetBytes($randomBytes)
$randomGenerator.Dispose()
[BitConverter]::ToString($randomBytes).Replace('-', '').ToLowerInvariant()
```

The output is a new 64-character value. Save it only in your local settings.
Do not commit these files. The old `PRICE_REVIEW_PASSWORD` setting is not used
by the current admin login.

## 3. Set up Clerk for admin login

In Clerk, create or select a **Development** application. Enable email and
password login, require an authenticator for sign-up and sign-in, and enable
backup codes. Disable social and passwordless sign-in for this demo. The intended
settings are recorded in `infrastructure/clerk-development.json`.

From `application/`, sign in to the Clerk CLI and connect your app:

```powershell
cd application
npx -y clerk@latest auth login
npx -y clerk@latest init --app YOUR_CLERK_APP_ID
cd ..
```

Replace `YOUR_CLERK_APP_ID` with the application ID from Clerk (`app_...`). The
CLI writes local settings to `application/.env.local`. Check that it contains
`VITE_CLERK_PUBLISHABLE_KEY` starting with `pk_test_` and `CLERK_SECRET_KEY`
starting with `sk_test_`. These are keys, not your admin password. Live keys
are intentionally rejected by this development integration.

## 4. Start the app and database

Run this from the repository root:

```powershell
docker compose --env-file infrastructure/docker/.env --env-file application/.env.local -f infrastructure/docker/compose.yaml -f infrastructure/docker/compose.prices.yaml -f infrastructure/docker/compose.admin.yaml up --build -d --wait
```

The first run downloads images and builds the app, so it can take several
minutes. Later runs reuse the downloaded images and build cache. PostgreSQL
starts first; a setup task applies migrations, seeds an empty catalog and sets
up database permissions; then the website starts.

Open **http://localhost:3000/**. Use `localhost` consistently: the configured
origin is checked when submitting changes. Open **http://localhost:3000/api/health**;
it should return a successful response identifying PostgreSQL as the backend.

Check the containers and setup task:

```powershell
docker compose --env-file infrastructure/docker/.env --env-file application/.env.local -f infrastructure/docker/compose.yaml -f infrastructure/docker/compose.prices.yaml -f infrastructure/docker/compose.admin.yaml ps -a
```

The app and database should be healthy. `db-setup` finishing with exit code 0
is normal: it is a one-time task, not a server.

`compose.admin.yaml` exposes PostgreSQL only to this computer on port 55433.
It lets the trusted owner command in the next step reach the database. The
application still uses the internal Docker network and restricted database roles.

## 5. Create and authorise an admin

1. Open **http://localhost:3000/admin** and create your account.
2. Set up your authenticator and save backup codes privately.
3. Find that account in the Clerk dashboard and copy its user ID (`user_...`).
   Creating an account alone does not give admin access.
4. Add this line to `application/.env.local`, replacing the password with the
   exact `POSTGRES_PASSWORD` from step 2:

```dotenv
DATABASE_URL=postgresql://beer_map:YOUR_RANDOM_DATABASE_OWNER_PASSWORD@127.0.0.1:55433/beer_map
```

This is a trusted local owner connection for administration commands. Do not
give it to the running HTTP application.

Grant access from `application/`:

```powershell
cd application
npm run db:admin -- grant YOUR_CLERK_USER_ID
cd ..
```

Replace `YOUR_CLERK_USER_ID` with the actual `user_...` ID. The command checks
that the Clerk account is active and has a password and authenticator before
granting access. Return to `/admin` and reload. You should see the review queue.

To remove access later, run `npm run db:admin -- revoke YOUR_CLERK_USER_ID`
from `application/`.

## 6. Try the main features

1. Search for a venue or beer, change the price filter, and switch between the
   cheapest glass and cheapest litre. Open a venue to see its servings.
2. Move the time slider and check how the opening status changes.
3. Choose a serving and click **Ieteikt cenu**. Enter a different price and submit.
   A note and web source are optional. The public price should stay unchanged.
4. Open `/admin`, find the pending suggestion and click **Apstiprināt**. Check
   the verification date; a web source is optional for a price checked in person.
5. Refresh the map. The approved price should appear without rebuilding the app.
6. Submit another suggestion and choose **Noraidīt**. The published price should
   stay unchanged. Use the history view to inspect decisions or reverse an override.

## 7. Run the checks and Playwright UI

From `application/`:

```powershell
cd application
npm run check
npx playwright install chromium
npx playwright test --list
npx playwright test --ui
```

The UI should list the map, price-suggestion and admin-MFA test files. Press
the green **Run all** button, or select an individual test. Select a completed
test to see its actions and snapshots. To watch an actual browser window:

```powershell
npx playwright test --headed --workers=1
```

The fixture builds a separate Docker project called `beer-map-playwright` with
the test app on port 3011 and its own database. It does not test or reset your
manual demo database. Docker must be running. The first test run may take longer
because it builds the image. A no-tests screen usually means the command was
started outside `application/`.

The full admin-MFA test is skipped unless a dedicated enrolled Clerk test
account is configured. That skip does not mean MFA was tested successfully.
See [Clerk MFA test coverage](price-suggestions.md#clerk-mfa-test-coverage) for
the required test variables. Do not use your personal admin as the test account.

For command-line test results, run `npm run test:browser:suite`. The CI workflow
also runs SQL integration tests against disposable databases. Their setup and
database-name safeguards are explained in [Docker and PostgreSQL](docker-postgres.md)
and [Price suggestions](price-suggestions.md).

Return to the repository root after these commands: `cd ..`.

## 8. Stop or restart the system

Use the same files and settings each time:

```powershell
docker compose --env-file infrastructure/docker/.env --env-file application/.env.local -f infrastructure/docker/compose.yaml -f infrastructure/docker/compose.prices.yaml -f infrastructure/docker/compose.admin.yaml down
```

This stops the containers and keeps the database volume. To start again, repeat
step 4. Suggestions and approved prices should remain. Do not add `--volumes`
unless you intend to delete the local database and all saved changes.

## 9. If something does not work

- **Startup fails:** use the step 4 command with `logs --tail=100 db db-setup app`
  instead of `up --build -d --wait`. Look at the setup error before trying again.
- **Port 3000 is busy:** change `APP_PORT` and `PRICE_ALLOWED_ORIGIN` to match,
  then repeat step 4. Open the new exact URL.
- **Port 55433 is busy:** change the optional admin override port and the port in
  the local owner `DATABASE_URL` together.
- **Admin login is unavailable:** check the two Development keys and required
  MFA settings. Recreate the app with step 4 after changing its settings.
- **Login works but admin access is denied:** grant the enrolled account's Clerk
  user ID using step 5. Signing up and granting access are separate actions.
- **Database password error after editing `.env`:** an existing volume keeps its
  original database-owner password. Restore the matching local settings or ask
  the database owner to rotate the password. Restarting alone does not rotate it.
- **Playwright shows no tests:** run it from `application/`, where the config is.

## 10. Cloud deployment is a separate setup

The repository includes Terraform for GKE and Helm charts for the app, database
and monitoring. Follow [Deploying to GCP](deploying-to-gcp.md) for accounts,
billing, Terraform state, DNS, GitHub environment settings, secrets and deployment.
Use the chart READMEs for monitoring access and backup details.

The current GKE chart and deploy workflow still use the retired shared-review
password setting and do not inject the Clerk Development keys. They need to be
aligned with the current admin integration before the complete admin flow can
be demonstrated on GKE. Local success does not establish that cloud deployment,
notification delivery or backup restoration has been verified. Clerk integration
is Development-only; this guide does not claim production-ready authentication.
