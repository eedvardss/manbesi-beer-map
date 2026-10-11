# Rīgas alus karte

A Riga beer-price map with search, price filters, menus and an opening-time slider.
Visitors suggest prices. Admins sign in with Clerk and an authenticator to approve,
reject or reverse changes. PostgreSQL saves suggestions, prices and review history.

**Local demo:** follow steps 1–7. **GKE and monitoring:** continue with step 8.
Commands use PowerShell. Run them from the repository root unless stated otherwise.

## 1. Get the code and tools

Install Git, Node.js 22.13 or newer, and Docker Desktop. Start Docker Desktop
with Linux containers. Use Compose 2.24.4 or newer for the browser tests.

```powershell
git clone https://github.com/eedvardss/manbesi-beer-map.git
cd manbesi-beer-map
cd application
npm ci
cd ..
docker version
```

If cloning fails, ask the repository owner for access. If Docker cannot reach
its server, wait for Docker Desktop to finish starting.

## 2. Set your local passwords

Copy the example once. Keep an existing working settings file instead of overwriting it.

```powershell
Copy-Item application/.env.example infrastructure/docker/.env
```

Open `infrastructure/docker/.env` and set:

```dotenv
POSTGRES_PASSWORD=YOUR_DATABASE_OWNER_PASSWORD
APP_DATABASE_PASSWORD=YOUR_DIFFERENT_APP_PASSWORD
REVIEW_DATABASE_PASSWORD=YOUR_DIFFERENT_REVIEW_PASSWORD
PRICE_SESSION_SECRET=YOUR_DIFFERENT_SESSION_SECRET
APP_PORT=3000
PRICE_ALLOWED_ORIGIN=http://localhost:3000
```

Replace each `YOUR_...` value with a different random value. Generate one at a time:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Each result is 64 hexadecimal characters, which work safely in database URLs.
Keep passwords and keys in ignored local settings files. The old shared admin
password is not used by the application.

## 3. Set up Clerk

Create a **Development** application in Clerk. Enable email/password login,
require authenticator MFA for sign-up and sign-in, and enable backup codes.
Disable social and passwordless login for this demo. Passwords must meet the
Clerk policy; the recorded project settings require at least 15 characters.
See `infrastructure/clerk-development.json` for the intended settings.

From Clerk's API Keys page, copy the Development keys into `application/.env.local`:

```dotenv
VITE_CLERK_PUBLISHABLE_KEY=YOUR_PK_TEST_KEY
CLERK_SECRET_KEY=YOUR_SK_TEST_KEY
```

Replace the examples with actual `pk_test_...` and `sk_test_...` keys.
Live keys are intentionally rejected. Clerk holds admin passwords and MFA secrets;
PostgreSQL holds the admin allowlist.

## 4. Start the complete local stack

Paste this block into PowerShell **from the repository root**. It defines the
shortcut used below. The inline override opens PostgreSQL only on this computer
so the owner can grant admin access. No extra configuration file is needed.

```powershell
$localDatabasePort = @'
services:
  db:
    ports:
      - '127.0.0.1:55433:5432'
'@
function Invoke-BeerMap {
    $localDatabasePort | docker compose --env-file infrastructure/docker/.env --env-file application/.env.local -f infrastructure/docker/compose.yaml -f infrastructure/docker/compose.prices.yaml -f - @args
}
Invoke-BeerMap up --build -d --wait
```

The first build downloads images and may take several minutes. PostgreSQL starts
first, the setup task applies migrations and seeds an empty database, then the app starts.

Open **http://localhost:3000/** and **http://localhost:3000/api/health**.
The health endpoint should succeed and identify `postgres` as the catalog backend.
Use `localhost` consistently because writes check the exact configured origin.

```powershell
Invoke-BeerMap ps -a
```

The app and database should be healthy. `db-setup` exiting with code 0 is normal.
If you open a new terminal, repeat the shortcut definition before using it.

## 5. Grant your admin account access

1. Open **http://localhost:3000/admin**, create an account and enrol an authenticator.
2. Save backup codes privately. In Clerk's Users page, copy your account's `user_...` ID.
3. Add this line to `application/.env.local`, using the exact owner password from step 2:

```dotenv
DATABASE_URL=postgresql://beer_map:YOUR_DATABASE_OWNER_PASSWORD@127.0.0.1:55433/beer_map
```

This connection is for the trusted owner command. The Docker app continues to
use its restricted roles and internal database connection.

```powershell
cd application
npm run db:admin -- grant YOUR_CLERK_USER_ID
cd ..
```

Replace `YOUR_CLERK_USER_ID` with the actual `user_...` ID. The command checks
that the account is active and has a password and authenticator. Reload `/admin`.
Signing up alone does not grant access. To remove access, run
`npm run db:admin -- revoke YOUR_CLERK_USER_ID` from `application/`.

## 6. Check the user flow and run tests

Try this demo:

1. Search a venue or beer, change the price filter, compare glass/litre prices,
   open a menu and move the time slider.
2. Click **Ieteikt cenu** on a serving and submit a different price.
   The public price should remain unchanged while the suggestion is pending.
3. In `/admin`, approve it with **Apstiprināt** and a valid verification date.
   A web source is optional for a price checked in person.
4. Refresh the map: the new price should appear without rebuilding.
5. Submit another suggestion and choose **Noraidīt**. The public price should stay
   unchanged. Check history and try reversing an approved override.

Run automated checks from `application/`:

```powershell
cd application
npm run check
npx playwright install chromium
npx playwright test --list
npx playwright test --ui
```

Press the green play button. To watch a browser window, run
`npx playwright test --headed --workers=1`. For terminal results, run
`npm run test:browser:suite`.

Playwright builds an isolated Docker stack on port 3011, with its own database
on port 55434. It does not reset your demo database. Docker must be running.
The full admin-MFA test needs a dedicated enrolled account and is skipped without it.
See [MFA test setup](docs/price-suggestions.md#clerk-mfa-test-coverage) for the test
variables. Supply that account's keys and credentials in the test process environment.

Return to the repository root with `cd ..`.

## 7. Stop, restart and troubleshoot

From the repository root, using the shortcut from step 4:

```powershell
Invoke-BeerMap logs --tail=100 db db-setup app
Invoke-BeerMap down
```

`down` keeps saved data. Start again with `Invoke-BeerMap up --build -d --wait`.
Do not add `--volumes` unless you want to delete the demo database.

- **Port 3000 is busy:** change `APP_PORT` and `PRICE_ALLOWED_ORIGIN` together,
  restart and use the new exact URL.
- **Port 55433 is busy:** change the inline database port and owner `DATABASE_URL` together.
- **Admin page unavailable:** check the Development keys, MFA settings and container logs.
- **Admin access denied:** grant the correct enrolled Clerk user ID in step 5.
- **Password error after editing `.env`:** an existing database retains its original
  owner password. Restore the matching settings or rotate the database password explicitly.
- **No tests in Playwright:** run the command from `application/`.

## 8. Run on GKE

Cloud resources cost money. This needs a billing-enabled GCP project, project
and billing permissions, GitHub settings access, a domain you control,
Google Cloud CLI, Terraform 1.16+, kubectl with the GKE auth plugin, and Helm 4.
The detailed walkthrough is [Deploying to GCP](docs/deploying-to-gcp.md).

### Create the infrastructure

Choose your project, sign in, and bootstrap the Terraform state bucket once:

```powershell
$projectId = 'YOUR_GCP_PROJECT_ID'
gcloud auth login
gcloud config set project $projectId
gcloud auth application-default login
gcloud auth application-default set-quota-project $projectId
gcloud services enable serviceusage.googleapis.com cloudresourcemanager.googleapis.com --project $projectId
gcloud storage buckets create "gs://$projectId-tfstate" --project $projectId --location europe-north1 --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update "gs://$projectId-tfstate" --versioning
Copy-Item infrastructure/terraform/terraform.tfvars.example infrastructure/terraform/terraform.tfvars
```

Fill in `project_id`, `billing_account_id` and a budget in your billing currency
in the ignored `terraform.tfvars`. Review the plan before applying:

```powershell
cd infrastructure/terraform
terraform init -backend-config="bucket=$projectId-tfstate"
terraform plan -out=tfplan
terraform apply tfplan
terraform output
cd ../..
gcloud container clusters get-credentials beermap --region europe-north1 --project $projectId
kubectl create clusterrolebinding github-deployer-admin --clusterrole=cluster-admin --user="github-deployer@$projectId.iam.gserviceaccount.com"
```

The last command grants the deployer RBAC access used by the monitoring chart.
See [Terraform setup](infrastructure/terraform/README.md) for permissions and teardown.
Budget alerts are notifications, not a spending cap.

### Configure GitHub and deploy

Create the GitHub environment **production**, with required reviewers. Add:

| Location | Setting | Value |
| --- | --- | --- |
| Repository variable | `GCP_PROJECT_ID` | Your project ID |
| Repository variable | `GCP_WORKLOAD_IDENTITY_PROVIDER` | Terraform output `workload_identity_provider` |
| Repository variable | `GCP_DEPLOYER_SA` | Terraform output `deployer_service_account` |
| Production variable | `APP_HOST` | Public hostname, without `https://` |
| Production secret | `POSTGRES_PASSWORD`, `APP_DATABASE_PASSWORD`, `REVIEW_DATABASE_PASSWORD`, `PRICE_SESSION_SECRET` | Different random values |
| Production secret | `PRICE_REVIEW_PASSWORD` | Random compatibility value required by the existing workflow; not an admin login |
| Production secret | `GHCR_PULL_TOKEN` | Token with `read:packages` access to the private image |
| Production secret | `GRAFANA_ADMIN_PASSWORD` | Separate strong Grafana password |

Point your hostname's DNS A record to Terraform output `ingress_ip_address`.
If using Cloudflare DNS, use **DNS only** for this GKE hostname.

After this branch is merged and main CI publishes an image, run **Actions → Deploy**
and approve the environment request. It installs PostgreSQL, runs migrations and
starts the app. Run **Actions → Deploy observability** separately for monitoring.

### Supply Clerk to the cloud app

The current chart does not inject Clerk keys. For the Development demo, complete
this manual step after deployment. Create the ignored `application/.env.clerk`
with **only** these entries, using the same Clerk Development app as your admin:

```dotenv
CLERK_PUBLISHABLE_KEY=YOUR_PK_TEST_KEY
CLERK_SECRET_KEY=YOUR_SK_TEST_KEY
```

Do not put the database-owner URL in this file. From the repository root:

```powershell
kubectl -n beermap create secret generic beermap-clerk --from-env-file=application/.env.clerk --dry-run=client -o yaml | kubectl apply -f -
kubectl -n beermap set env deployment/beermap-app --from=secret/beermap-clerk
kubectl -n beermap rollout status deployment/beermap-app
```

This uses Kubernetes Secret references. Check and repeat the step after app
upgrades; it is not yet managed by the chart or deploy workflow. Only Development
keys are accepted, so this remains a demo authentication setup.

The cloud database has its own admin allowlist. In a separate terminal:

```powershell
kubectl -n beermap port-forward svc/beermap-postgres 55433:5432
```

Stop the local stack first if it uses port 55433. Set the owner `DATABASE_URL`
in `application/.env.local` to the forwarded port with the **cloud** owner password.
Run the grant command from step 5 for your enrolled account. Restore the local
owner URL when returning to the local demo. Stop port-forward with Ctrl+C.

### Verify the cloud system

```powershell
kubectl -n beermap get pods,jobs,ingress,managedcertificate
kubectl -n monitoring get pods
kubectl -n beermap get cronjobs
kubectl -n monitoring port-forward svc/beermap-observability-grafana 3002:80
```

Open Grafana at **http://localhost:3002**, using `admin` and the configured
Grafana password. Check the Beer Map dashboard and logs. Stop port-forward with Ctrl+C.

Wait for the managed certificate to become Active. Open `https://YOUR_APP_HOST`
and its `/api/health` endpoint, then repeat the price-review demo from step 6.
Set production variable `SMOKE_TEST_URL` to `https://YOUR_APP_HOST/api/health`
to enable the public health check on later deployments.

Nightly backups go to the GCS backup bucket. Check an actual object and test a
restore before claiming recovery works. Alert rules exist, but Alertmanager needs
a real receiver for notifications. See the
[monitoring chart](infrastructure/helm/beermap-observability/README.md) and
[database chart](infrastructure/helm/beermap-postgres/README.md) for details.

## Project files

- `application/` — website, API, database scripts and application tests.
- `infrastructure/` — Docker, Terraform and Helm.
- `playwright/` — isolated browser tests.
- `.github/workflows/` — checks, image publishing and deployments.
- `docs/` — detailed setup, design and performance notes.

The repository also retains a separate Cloudflare Worker deployment path.
Publishing that Worker alone does not enable the PostgreSQL-backed admin flow.
