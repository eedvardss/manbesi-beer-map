# Deploying Beer Map to GCP

A step-by-step guide to running Beer Map on Google Kubernetes Engine (GKE) at **https://alus.chudars.lv**, starting from an empty GCP project. The commands are written for **Windows PowerShell**. Where a command needs bash (Git Bash, installed with Git), it says so.

Reference material: [infrastructure/terraform/README.md](../infrastructure/terraform/README.md), the chart READMEs in [infrastructure/helm/](../infrastructure/helm/), and the workflows in [.github/workflows/](../.github/workflows/).

## 1. Overview

**What Terraform creates** (`infrastructure/terraform`, one GCP project, region `europe-north1`):

| Resource | Name |
| --- | --- |
| GKE Autopilot cluster (regional, REGULAR channel) | `beermap` |
| VPC and subnet | `beermap`, `beermap-europe-north1` |
| Global static IP for the load balancer | `beermap-ip` |
| Backup bucket (dumps deleted after 30 days) | `<PROJECT_ID>-beermap-backups` |
| Backup service account (create-only on the bucket) | `beermap-backup` |
| Keyless GitHub auth: Workload Identity pool/provider, deployer service account | `github` / `github`, `github-deployer` |
| Monthly budget with alerts at 50/90/100% | `beermap monthly` (default 50, in the billing account's currency) |

**What GitHub Actions installs** with Helm:

| Release | Namespace | Contents |
| --- | --- | --- |
| `beermap-postgres` | `beermap` | PostgreSQL 17 StatefulSet, 10Gi disk, nightly `pg_dump` to the bucket (02:00 Europe/Riga) |
| `beermap-app` | `beermap` | Migration hook Job, the app (2–5 pods, autoscaled), Ingress, Google-managed TLS certificate, HTTP→HTTPS redirect |
| `beermap-observability` | `monitoring` | Prometheus, Alertmanager, Grafana, Loki, Alloy |

**Time.** Plan on 1.5–2 hours for a first deployment. The Terraform apply takes about 10 minutes, the first Deploy run about 10 minutes, and the TLS certificate 15–60 minutes after DNS resolves. Most of that is waiting.

**Cost (estimates; check the official pages).** Prices change, so treat these as orders of magnitude:

- **Cluster management fee.** GKE charges a flat hourly fee per cluster, about USD 0.10/hour (roughly USD 73/month). The GKE free tier gives each billing account a monthly credit that covers this fee for one zonal or Autopilot cluster. Check that it applies to your account.
- **Pods.** Autopilot bills the CPU, memory and ephemeral storage that running pods *request*, not whole nodes. Here that is about 1.25 vCPU and 3.3 GiB: the app (2 × 250m/512Mi), PostgreSQL (250m/512Mi) and observability (about 0.5 vCPU/1.8 GiB). Autopilot may raise small requests to its minimums.
- **Disks.** 10Gi for PostgreSQL plus 20Gi for Prometheus and Loki.
- **Load balancer.** The external HTTPS load balancer has its own hourly forwarding-rule charge, plus data processing.
- **Total.** Expect tens of euros per month. The budget is in your billing account's currency: 50 is reasonable for EUR, but for SEK set about 550 (50 SEK is tiny). Watch the alert emails during the first week and adjust `budget_amount` if needed. New Google Cloud accounts often get trial credit.

Pricing pages: [GKE pricing](https://cloud.google.com/kubernetes-engine/pricing), [Autopilot pod pricing](https://cloud.google.com/kubernetes-engine/pricing#autopilot_mode), [Load balancing pricing](https://cloud.google.com/vpc/network-pricing#lb), [Persistent Disk pricing](https://cloud.google.com/compute/disks-image-pricing#disk), [Pricing calculator](https://cloud.google.com/products/calculator).

## 2. Prerequisites

**Accounts and permissions**

- A Google Cloud account with a billing account. Get its ID (`XXXXXX-XXXXXX-XXXXXX`) with `gcloud billing accounts list`, or from Console → Billing.
- Check the billing account's currency under Console → Billing → Account management. Any currency works: the budget uses it, and `budget_amount` is in that currency (about 550 for SEK, 50 for EUR).
- **Owner** on the GCP project.
- **Billing Account Administrator** or **Billing Account Costs Manager** on the billing account, which the budget needs. Linking the project to billing also needs Billing Account User or Administrator.
- Admin access to the GitHub repository `eedvardss/manbesi-beer-map` (Settings → Environments, Secrets and variables).
- Access to DNS for `chudars.lv`.

**Tools** (install with winget or choco, then open a new terminal):

| Tool | Version | Windows install |
| --- | --- | --- |
| gcloud CLI | current | `winget install Google.CloudSDK` (or `choco install gcloudsdk`) |
| kubectl + gke-gcloud-auth-plugin | current | `gcloud components install kubectl gke-gcloud-auth-plugin` (or `winget install Kubernetes.kubectl`; the plugin still comes from gcloud) |
| Terraform | 1.16.x (CI pins 1.16.5; `versions.tf` needs >= 1.16.0) | `winget install Hashicorp.Terraform` (or `choco install terraform`) |
| Helm (optional locally; CI uses v4.3.0) | v4 | `winget install Helm.Helm` (or `choco install kubernetes-helm`) |
| Git (includes Git Bash and `openssl`) | current | `winget install Git.Git` |
| GitHub CLI (optional, to set secrets from the terminal) | current | `winget install GitHub.cli` |

If the `gcloud components install` command says component management is disabled, install the plugin with your package manager instead.

Helm 4 renamed `--atomic` to `--rollback-on-failure`. If you only have Helm 3 locally, use `--atomic` in the local commands below.

Verify:

```powershell
gcloud version; kubectl version --client; terraform version; helm version; git --version
```

## 3. Step 0: merge to `main` first

The deploy pipeline only works once this branch is merged into `main`, for two reasons:

- GitHub shows **Run workflow** only for workflows that exist on the default branch, and `workflow_run` triggers also come from the default branch.
- `deploy.yml` deploys image `ghcr.io/eedvardss/manbesi-beer-map:sha-<first 7 characters of the commit>`. CI (`ci.yml`, job `publish`) pushes that tag only for pushes to `main` and `v*` tags. Running Deploy from another branch would look for a tag that was never published.

After the merge, the first automatic Deploy run is *skipped*: its job condition requires the repository variable `GCP_WORKLOAD_IDENTITY_PROVIDER`, which doesn't exist yet. That is expected. The first deployment is started by hand in step 4.15.

**Verify:** on GitHub, Actions → CI on `main` is green, and the repository's Packages page lists a `sha-<7 chars>` tag for the merge commit.

## 4. Step-by-step

Run everything from the repository root in PowerShell. Set your project ID once per terminal session:

```powershell
$ProjectId = "<PROJECT_ID>"            # e.g. beermap-prod-123456 (globally unique, 6-30 chars)
$BillingAccount = "<BILLING_ACCOUNT_ID>"  # XXXXXX-XXXXXX-XXXXXX
```

### 4.1 Create the project and link billing

```powershell
gcloud auth login
gcloud projects create $ProjectId --name "Beer Map"
gcloud billing projects link $ProjectId --billing-account $BillingAccount
gcloud config set project $ProjectId
```

If you use an existing project, skip `projects create`.

**Verify:** `gcloud billing projects describe $ProjectId` shows `billingEnabled: true`.

### 4.2 Application Default Credentials for Terraform

Terraform uses Application Default Credentials (ADC), not your `gcloud auth login` session. The Budgets API rejects user credentials without a quota project.

```powershell
gcloud auth application-default login
gcloud auth application-default set-quota-project $ProjectId
```

**Verify:** `gcloud auth application-default print-access-token` prints a token without errors.

### 4.3 Bootstrap: two APIs and the Terraform state bucket

Terraform can't create the bucket that holds its own state, and it needs these two APIs before it can enable the rest.

```powershell
gcloud services enable serviceusage.googleapis.com cloudresourcemanager.googleapis.com --project $ProjectId
gcloud storage buckets create "gs://$($ProjectId)-tfstate" --project $ProjectId --location europe-north1 --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update "gs://$($ProjectId)-tfstate" --versioning
```

**Verify:** `gcloud storage buckets describe "gs://$($ProjectId)-tfstate" --format="value(versioning_enabled)"` prints `True`.

### 4.4 Fill in `terraform.tfvars`

```powershell
cd infrastructure\terraform
Copy-Item terraform.tfvars.example terraform.tfvars
notepad terraform.tfvars
```

Set the values (the file is git-ignored):

```hcl
project_id         = "<PROJECT_ID>"
billing_account_id = "<BILLING_ACCOUNT_ID>"
budget_amount      = 50 # in the billing account's currency, e.g. 550 for SEK
```

Leave `deletion_protection` commented out. It defaults to `true`.

**Verify:** `git status` does not list `terraform.tfvars`.

### 4.5 `terraform init`

The state bucket name is passed at init time. Quote the whole argument so PowerShell keeps the `=` signs:

```powershell
terraform init "-backend-config=bucket=$($ProjectId)-tfstate"
```

**Verify:** the output ends with "Terraform has been successfully initialized!" and mentions the `gcs` backend.

### 4.6 `terraform plan`

```powershell
terraform plan -out tfplan
```

**Verify:** the plan ends with something like `Plan: N to add, 0 to change, 0 to destroy.` Read through it once: you should see the cluster, network, static IP, bucket, service accounts, Workload Identity pool and budget.

### 4.7 `terraform apply`

```powershell
terraform apply tfplan
```

This takes about 10 minutes, mostly for the cluster. If it fails with an error such as "API has not been used in project ... or it is disabled", the API enablement is still propagating. Wait a minute, then run `terraform plan -out tfplan` and `terraform apply tfplan` again.

**Verify:** `Apply complete!`, and `gcloud container clusters list --project $ProjectId` shows `beermap` with status `RUNNING`.

### 4.8 Read the outputs

```powershell
terraform output
terraform output -raw workload_identity_provider   # GCP_WORKLOAD_IDENTITY_PROVIDER
terraform output -raw deployer_service_account     # GCP_DEPLOYER_SA
terraform output -raw ingress_ip_address           # DNS A record
cd ..\..
```

Write the three values down.

**Verify:** `workload_identity_provider` looks like `projects/<number>/locations/global/workloadIdentityPools/github/providers/github`, and `deployer_service_account` is `github-deployer@<PROJECT_ID>.iam.gserviceaccount.com`.

### 4.9 Connect kubectl to the cluster

```powershell
gcloud container clusters get-credentials beermap --region europe-north1 --project $ProjectId
```

**Verify:** `kubectl get namespaces` lists `default`, `kube-system` and others without an auth error.

### 4.10 Give the deployer Kubernetes RBAC rights (once)

The deployer's IAM role `roles/container.developer` can't create the Roles and ClusterRoles that the charts (mainly observability) install. Bind it in Kubernetes RBAC instead:

```powershell
kubectl create clusterrolebinding github-deployer-admin --clusterrole cluster-admin --user "github-deployer@$($ProjectId).iam.gserviceaccount.com"
```

**Verify:** `kubectl get clusterrolebinding github-deployer-admin` returns one row.

### 4.11 GitHub repository variables

Go to GitHub → repository **Settings → Secrets and variables → Actions → Variables tab → New repository variable**.

These must be **repository** variables, not environment variables. The Deploy job's `if:` condition reads `vars.GCP_WORKLOAD_IDENTITY_PROVIDER` before the `production` environment is loaded, and at that point environment variables are invisible.

| Variable | Value |
| --- | --- |
| `GCP_PROJECT_ID` | `<PROJECT_ID>` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | output `workload_identity_provider` |
| `GCP_DEPLOYER_SA` | output `deployer_service_account` |
| `GCP_BILLING_ACCOUNT_ID` | optional; enables the Terraform plan comment on PRs (the deployer then needs extra read roles, see the root README) |

With the GitHub CLI instead:

```powershell
gh variable set GCP_PROJECT_ID --body $ProjectId
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --body (terraform -chdir=infrastructure/terraform output -raw workload_identity_provider)
gh variable set GCP_DEPLOYER_SA --body (terraform -chdir=infrastructure/terraform output -raw deployer_service_account)
```

**Verify:** `gh variable list` (or the Variables tab) shows the three `GCP_*` variables.

### 4.12 The `production` environment and its secrets

1. Go to **Settings → Environments → New environment**, name it `production`, and save.
2. Tick **Required reviewers** and add yourself. Every Deploy and Deploy observability run will then wait for your approval. If the option is missing, your GitHub plan doesn't offer it for private repositories, and runs will start without approval.
3. Under **Environment variables**, add `APP_HOST` = `alus.chudars.lv`. Don't include `https://` or a path. It becomes the chart's `ingress.host`, which is the certificate domain and the allowed origin `https://alus.chudars.lv`. (The workflow reads it in the job's `env:`, where environment variables are visible. A repository variable would also work.) With the CLI: `gh variable set APP_HOST --env production --body alus.chudars.lv`.
4. Under **Environment secrets**, add these secrets:

| Secret | Value |
| --- | --- |
| `POSTGRES_PASSWORD` | random hex, at least 24 characters |
| `APP_DATABASE_PASSWORD` | random hex, at least 24 characters |
| `REVIEW_DATABASE_PASSWORD` | random hex, at least 24 characters |
| `PRICE_REVIEW_PASSWORD` | random hex, at least 24 characters (the price-review login password) |
| `PRICE_SESSION_SECRET` | random hex, **at least 32** characters |
| `GRAFANA_ADMIN_PASSWORD` | any strong password (used by Deploy observability) |
| `GHCR_PULL_TOKEN` | the personal access token from 4.13 |

Rules: give each secret a **different** value. Use only URL-safe characters, because the passwords are inserted into `postgresql://` connection URLs; hex is the simplest choice. A value that is too short makes the migration hook fail, or makes the price endpoints return 503.

Generate a value (64 hex characters):

```powershell
# PowerShell (cryptographically secure, works in Windows PowerShell 5.1)
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); ($b | ForEach-Object { $_.ToString('x2') }) -join ''
```

```bash
# Git Bash
openssl rand -hex 32
```

Or generate and store everything in one go with the GitHub CLI, so the values never touch the clipboard. Save `PRICE_REVIEW_PASSWORD` in a password manager first, because you need it to log in to price review.

```powershell
function New-Hex { $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); ($b | ForEach-Object { $_.ToString('x2') }) -join '' }
foreach ($name in 'POSTGRES_PASSWORD','APP_DATABASE_PASSWORD','REVIEW_DATABASE_PASSWORD','PRICE_SESSION_SECRET','GRAFANA_ADMIN_PASSWORD') {
  gh secret set $name --env production --body (New-Hex)
}
$review = New-Hex; Write-Output "PRICE_REVIEW_PASSWORD: $review"   # store it, then:
gh secret set PRICE_REVIEW_PASSWORD --env production --body $review
```

Secrets can't be read back from GitHub. Store any value you need to know again (for example the Grafana password and `PRICE_REVIEW_PASSWORD`) in a password manager.

**Verify:** `gh secret list --env production` shows all seven secret names, and `gh variable list --env production` shows `APP_HOST`.

### 4.13 `GHCR_PULL_TOKEN` (pulling the private image)

The cluster pulls `ghcr.io/eedvardss/manbesi-beer-map` with this token. The Deploy job stores it as the Kubernetes Secret `ghcr-pull`, with the repository owner as the username.

1. Log in to GitHub with an account that can read the package (the owner `eedvardss`, or a collaborator with read access to the package).
2. Go to **Settings (your profile) → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic)**.
3. Give it a note such as `beermap GKE pull`, pick an expiry, and tick **only `read:packages`**.
4. Generate the token, copy it, and save it as the `production` secret `GHCR_PULL_TOKEN`.

Set a calendar reminder for the expiry date. When the token expires, new pods fail with `ImagePullBackOff`.

**Verify (optional, PowerShell):** `"<TOKEN>" | docker login ghcr.io -u <github-user> --password-stdin` succeeds, if you have Docker installed.

### 4.14 DNS: point `alus.chudars.lv` at the static IP

In the DNS provider for the `chudars.lv` zone, create:

| Type | Name | Value | Notes |
| --- | --- | --- | --- |
| `A` | `alus` | output `ingress_ip_address` | If the zone is on Cloudflare: proxy status **DNS only** (grey cloud) |

Google's managed certificate validates by reaching the load balancer directly over HTTP. If a proxy such as Cloudflare's orange cloud sits in front, validation sees the proxy instead and the certificate stays `Provisioning` indefinitely. No `www` record is needed: the chart serves the single host from `APP_HOST`.

**Verify:** `Resolve-DnsName alus.chudars.lv -Server 1.1.1.1` returns the static IP (it can take a few minutes, depending on TTL).

### 4.15 Run Deploy

1. On GitHub, go to **Actions → Deploy → Run workflow**, choose branch `main`, leave *Image tag* empty, and click **Run workflow**. (From now on, Deploy also starts automatically after every successful CI run on `main`.)
2. The run waits at "Waiting for review". Click **Review deployments**, tick `production`, and click **Approve and deploy**.
3. Watch the steps: *Apply namespace and Secrets*, *Deploy PostgreSQL* (helm, up to 10 minutes), *Deploy app* (the migration hook runs first, then the pods; up to 10 minutes). *Smoke test* is skipped until `SMOKE_TEST_URL` is set.

**Verify:** the run is green, and locally:

```powershell
helm -n beermap list          # beermap-postgres and beermap-app, STATUS deployed (if Helm is installed)
kubectl -n beermap get pods   # beermap-postgres-0 and 2 beermap-app-* pods Running, READY 1/1
```

### 4.16 Wait for the Ingress and certificate

```powershell
kubectl -n beermap get pods,ingress,managedcertificate
kubectl -n beermap describe managedcertificate beermap-app
```

- The Ingress `ADDRESS` should equal the static IP within a few minutes.
- The certificate goes from `Provisioning` to **`Active`**, usually 15–60 minutes after DNS resolves to the IP.
- For the first 5–10 minutes the load balancer may answer 502 while its health checks warm up. That is normal.

**Verify:** the certificate status is `Active`, and this returns HTTP 200 (use `curl.exe`; plain `curl` in Windows PowerShell 5.1 is an alias for `Invoke-WebRequest`):

```powershell
curl.exe -fsS https://alus.chudars.lv/api/health
curl.exe -sI http://alus.chudars.lv     # expect a 301/308 redirect to https
```

### 4.17 Turn on the smoke test

In **Settings → Environments → production → Environment variables**, add:

| Variable | Value |
| --- | --- |
| `SMOKE_TEST_URL` | `https://alus.chudars.lv/api/health` |

**Verify:** re-run Deploy (Actions → Deploy → Run workflow on `main`). The *Smoke test* step now runs and passes.

### 4.18 Run Deploy observability

On GitHub, go to **Actions → Deploy observability → Run workflow** on `main`, then approve it. It creates the `beermap-grafana-admin` Secret from `GRAFANA_ADMIN_PASSWORD` and installs the stack into `monitoring` (helm timeout 15 minutes). Run it again only when the observability chart changes.

**Verify:** `kubectl -n monitoring get pods` shows Prometheus, Alertmanager, Grafana, Loki, Alloy, kube-state-metrics and the operator all `Running`.

### 4.19 Open Grafana

Grafana is not exposed publicly, so reach it through a port-forward:

```powershell
kubectl -n monitoring get svc | Select-String grafana     # confirm the service name
kubectl -n monitoring port-forward svc/beermap-observability-grafana 3000:80
```

Open http://localhost:3000 and log in as user `admin` with your `GRAFANA_ADMIN_PASSWORD`. To read the password back from the cluster:

```powershell
[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String((kubectl -n monitoring get secret beermap-grafana-admin -o jsonpath='{.data.admin-password}')))
```

Stop the port-forward with Ctrl+C.

**Verify:** the **Beer Map overview** dashboard shows 2 ready app pods and PostgreSQL ready. Prometheus and Alertmanager follow the same pattern: `svc/kps-prometheus 9090` and `svc/kps-alertmanager 9093`.

### 4.20 Test a backup by hand

Trigger the nightly CronJob once:

```powershell
kubectl -n beermap create job backup-test --from=cronjob/beermap-postgres-backup
kubectl -n beermap wait --for=condition=complete job/backup-test --timeout=5m
kubectl -n beermap logs job/backup-test -c dump
kubectl -n beermap logs job/backup-test -c upload
kubectl -n beermap delete job backup-test
```

The backup service account can only *create* objects. It can't list or read them, so look for the dump with **your own** account:

```powershell
gcloud storage ls "gs://$($ProjectId)-beermap-backups/postgres/"
```

**Verify:** a file named `beer_map-<UTC timestamp>.sql.gz` appears. Dumps are deleted automatically after 30 days.

## 5. Day-2 operations

### Deploy a new version

Merge to `main`. CI publishes `sha-<7 chars>`, Deploy starts automatically, and you approve it. To redeploy by hand, use Actions → Deploy → Run workflow on `main`.

### Roll back

- **Automatic.** Every Helm step uses `--rollback-on-failure`. If the pods don't become ready within 10 minutes (or the migration hook fails), Helm rolls the release back to the previous revision. On a *first* install it uninstalls the release instead. Either way the workflow run fails.
- **To an earlier image (preferred).** Use Actions → Deploy → Run workflow on `main` and set *Image tag* to an older tag, for example `sha-1a2b3c4` (see the package page for tags). This changes only the app image; the charts come from `main`.
- **To an earlier Helm revision:**

  ```powershell
  helm -n beermap history beermap-app
  helm -n beermap rollback beermap-app <REVISION> --wait
  ```

Notes:

- The next push to `main` deploys `main` again. To make a rollback stick, revert the commit on `main`.
- Migrations only run forward. The migration hook runs on install and upgrade, not on `helm rollback`, so older code runs against the newer schema.

### Rotate a secret

1. Generate a new value (4.12) and update the GitHub `production` secret.
2. Re-run Deploy. It rewrites the Kubernetes Secrets, and the migration hook runs again.
3. Restart the app. The Deployment has no checksum annotation for the Secrets, so pods keep their old values until they restart, unless the image tag also changed:

   ```powershell
   kubectl -n beermap rollout restart deployment/beermap-app
   kubectl -n beermap rollout status deployment/beermap-app
   ```

How each secret behaves:

- **`APP_DATABASE_PASSWORD`, `REVIEW_DATABASE_PASSWORD`.** The migration hook re-applies them to the database roles (`ALTER ROLE ... PASSWORD`), so steps 1–3 are enough. Between the hook and the restart, old pods can't open *new* DB connections, so do the restart right away.
- **`PRICE_REVIEW_PASSWORD`, `PRICE_SESSION_SECRET`.** Steps 1–3 are enough. A new session secret logs out reviewers.
- **`POSTGRES_PASSWORD`.** PostgreSQL reads it only when the data directory is first created, so changing only the GitHub secret breaks the next migration hook. The order is: (1) `ALTER USER` in the database, (2) update the GitHub secret, (3) re-run Deploy. Finish all three in one sitting, because the nightly backup job reads the Kubernetes Secret when it starts.

  ```powershell
  kubectl -n beermap exec -it beermap-postgres-0 -- psql -U beer_map -d beer_map -c "ALTER USER beer_map PASSWORD '<NEW_HEX_VALUE>';"
  ```

  Then update the GitHub secret to the same value and re-run Deploy. The running server doesn't need a restart.
- **`GHCR_PULL_TOKEN`.** Update it and re-run Deploy. Running pods are unaffected; new pods use the new token.
- **`GRAFANA_ADMIN_PASSWORD`.** Update it, re-run Deploy observability, then restart Grafana with `kubectl -n monitoring rollout restart deployment/beermap-observability-grafana`.

### Scale

The HorizontalPodAutoscaler `beermap-app` owns the replica count: 2–5 pods, targeting 70% CPU. The Deployment has no `replicas` field, so `kubectl scale` changes are overridden by the HPA. To change the range, edit `autoscaling.minReplicas`/`maxReplicas` (or `resources`) in `infrastructure/helm/beermap-app/values.yaml`, merge, and deploy. PostgreSQL is a single replica by design.

**Verify:** `kubectl -n beermap get hpa beermap-app`.

### View logs

```powershell
kubectl -n beermap logs -l app.kubernetes.io/name=beermap-app --tail 100 --prefix   # all app pods
kubectl -n beermap logs deployment/beermap-app -f                                  # follow one pod
kubectl -n beermap logs beermap-postgres-0 --tail 100
kubectl -n beermap get events --sort-by=.lastTimestamp
```

In Grafana, go to **Explore → Loki** and query `{namespace="beermap", app="beermap-app"}` (available labels: `namespace`, `pod`, `container`, `app`; retention 7 days). The overview dashboard also has a logs panel. GKE also sends container logs to Cloud Logging (Console → Logging).

### Restore a backup

Restore into an **empty** database. Recommended sequence:

```powershell
# 1. Download a dump with your own account
gcloud storage ls "gs://$($ProjectId)-beermap-backups/postgres/"
gcloud storage cp "gs://$($ProjectId)-beermap-backups/postgres/<FILE>.sql.gz" .\restore.sql.gz

# 2. Stop the app (the HPA keeps at least 2 pods, so uninstall instead of scaling to 0)
helm -n beermap uninstall beermap-app

# 3. Recreate the database empty
kubectl -n beermap exec beermap-postgres-0 -- psql -U beer_map -d postgres -c "DROP DATABASE beer_map WITH (FORCE);"
kubectl -n beermap exec beermap-postgres-0 -- psql -U beer_map -d postgres -c "CREATE DATABASE beer_map;"

# 4. Copy the dump into the pod's writable /tmp and restore it there
kubectl cp .\restore.sql.gz beermap/beermap-postgres-0:/tmp/restore.sql.gz
kubectl -n beermap exec beermap-postgres-0 -- sh -c "gunzip -c /tmp/restore.sql.gz | psql -v ON_ERROR_STOP=1 -U beer_map -d beer_map && rm /tmp/restore.sql.gz"
```

5. Re-run Deploy (Actions → Deploy → Run workflow on `main`). The migration hook re-creates and re-grants the restricted roles, and the app comes back.

In Git Bash, you can stream the dump instead of copying it. Don't use this pipe in Windows PowerShell 5.1, which can corrupt binary data in pipelines:

```bash
gunzip -c restore.sql.gz | kubectl -n beermap exec -i beermap-postgres-0 -- psql -v ON_ERROR_STOP=1 -U beer_map -d beer_map
```

**Verify:** `curl.exe -fsS https://alus.chudars.lv/api/health` returns 200, and the site shows the restored data.

The Ingress, certificate and static IP are part of `beermap-app`. Uninstalling it removes the load balancer and certificate, so they are recreated on redeploy, and the certificate may again take 15–60 minutes. To avoid that, restore during a quiet period, or skip step 2 and accept a short window of app errors.

## 6. Teardown

Order matters: delete the Kubernetes resources that own Google resources (load balancer, disks) **before** destroying the cluster. Otherwise they are orphaned and can block `terraform destroy`.

```powershell
# 1. Remove the Helm releases (removes the Ingress/load balancer)
helm -n monitoring uninstall beermap-observability
helm -n beermap uninstall beermap-app
helm -n beermap uninstall beermap-postgres

# 2. Delete the namespaces; this deletes the StatefulSet PVCs and their disks
kubectl delete namespace beermap monitoring

# 3. Empty the backup bucket (download any dump you want to keep first);
#    Terraform cannot delete a non-empty bucket here
gcloud storage rm "gs://$($ProjectId)-beermap-backups/**"

# 4. Allow cluster deletion, then destroy
cd infrastructure\terraform
#    edit terraform.tfvars:  deletion_protection = false
terraform apply
terraform destroy
```

**Verify and clean up leftovers:**

```powershell
gcloud compute disks list --project $ProjectId                     # should be empty (orphaned PVC disks otherwise)
gcloud compute addresses list --global --project $ProjectId        # beermap-ip should be gone
gcloud compute forwarding-rules list --project $ProjectId          # should be empty
gcloud compute network-endpoint-groups list --project $ProjectId   # should be empty
```

What remains:

- **The `<PROJECT_ID>-tfstate` bucket.** Delete it by hand when you no longer need the state: `gcloud storage rm --recursive --all-versions "gs://$($ProjectId)-tfstate"` (the bucket is versioned).
- **Enabled APIs.** Terraform doesn't disable them on destroy.
- **The DNS record** `alus`. Remove it.
- **The Workload Identity pool `github`.** It is soft-deleted for about 30 days, so re-applying Terraform in the same project during that time fails until you undelete it: `gcloud iam workload-identity-pools undelete github --location global`.
- **The project.** To stop all billing at once, delete the whole project instead: `gcloud projects delete $ProjectId`. Google keeps it recoverable for 30 days.

Also remove the GitHub variables, or Deploy will try to run against a missing cluster.

## 7. Troubleshooting

| Symptom | Likely cause | What to check / fix |
| --- | --- | --- |
| ManagedCertificate stuck in `Provisioning` | DNS doesn't point at the static IP yet, or a proxy (Cloudflare orange cloud) is in front | `Resolve-DnsName alus.chudars.lv -Server 1.1.1.1` must return `ingress_ip_address`; set the record to DNS only. `kubectl -n beermap describe managedcertificate beermap-app` shows per-domain status. `FailedNotVisible` means Google can't reach the host over DNS. Allow up to 60 minutes after DNS is right. |
| Ingress has no `ADDRESS` | Static IP missing or misnamed, or the Ingress controller is still provisioning | `gcloud compute addresses describe beermap-ip --global`; `kubectl -n beermap describe ingress beermap-app` and read the Events. |
| HTTPS returns 502 | Load balancer health checks failing: the app isn't ready (`/api/health` returns 503 until it can read the catalog from Postgres), NetworkPolicy blocking the Google ranges, or NEG not synced. Normal for the first 5–10 minutes. | `kubectl -n beermap get pods` (READY 1/1?); `kubectl -n beermap logs deployment/beermap-app`; `kubectl -n beermap get svcneg`; Console → Network services → Load balancing → backend health. The NetworkPolicy must allow `35.191.0.0/16` and `130.211.0.0/22` on port 3000 (chart default). |
| Pods in `ImagePullBackOff` / `ErrImagePull` | Bad or expired `GHCR_PULL_TOKEN`, token missing `read:packages`, account can't read the package, or the tag doesn't exist | `kubectl -n beermap describe pod <pod>` (Events show 401/403/not found). Create a new classic PAT (4.13), update the secret, re-run Deploy. Confirm the tag `sha-<7>` exists on the package page (were you deploying from `main`?). |
| Deploy fails in *Deploy app*; migration hook failed | Secret too short or with non-URL-safe characters, Postgres not reachable, or a bad migration | The failed Job is kept until the next deploy: `kubectl -n beermap logs job/beermap-app-migrate` and `kubectl -n beermap describe job beermap-app-migrate`. Check the lengths: DB passwords and `PRICE_REVIEW_PASSWORD` ≥ 24, `PRICE_SESSION_SECRET` ≥ 32, hex only. If `POSTGRES_PASSWORD` was changed after the first install, see "Rotate a secret". |
| Deploy job skipped entirely after CI | `GCP_WORKLOAD_IDENTITY_PROVIDER` isn't a repository variable (an environment-level variable isn't visible to the job condition), or CI wasn't a successful push to `main` | Move the variables to repository level (4.11). |
| *Missing variable APP_HOST* or *Missing production secret X* | Variable or secret not set, or the secret was set at repository level with a typo | Check the names exactly (4.11, 4.12). |
| `google-github-actions/auth` fails ("unauthorized", "Permission iam.serviceAccounts.getAccessToken denied", "attribute condition") | Wrong provider string or SA email, or the run isn't from `eedvardss/manbesi-beer-map`. The provider only accepts `assertion.repository == "eedvardss/manbesi-beer-map"`, so forks and renamed repos fail. | Compare the variables with `terraform output`; the provider must be the full `projects/<number>/...` path. If the repo was renamed or moved, update `local.github_repository` in `github.tf` and apply. |
| `Error from server (Forbidden): ... cannot create resource "roles"/"clusterroles"` in Helm steps | The one-time RBAC binding is missing | Run 4.10 (`kubectl create clusterrolebinding github-deployer-admin ...`). |
| Pod rejected with an Autopilot / "GKE Warden" message | Autopilot forbids privileged pods, host namespaces, most hostPath, and enforces resource minimums and ratios | `kubectl -n <ns> get events --sort-by=.lastTimestamp`. Keep `resources` requests equal to limits and avoid host access. The charts are built for this. |
| PVC stays `Pending` | Normal until a pod uses it (`standard-rwo` binds on first use) and Autopilot adds a node (a few minutes). Otherwise a disk quota or a wrong StorageClass. | `kubectl -n beermap describe pvc`; `kubectl get storageclass`; Console → IAM & Admin → Quotas (Persistent Disk, europe-north1). |
| `KubeletDown` alert firing, CPU/memory panels empty | Prometheus can't scrape kubelet/cAdvisor on Autopilot (untested on Autopilot, see the observability README) | Check Prometheus targets (`port-forward svc/kps-prometheus 9090`, Status → Targets). The README describes a fallback via the API server proxy. |
| `terraform apply` fails with "API not enabled" or a budget permission error | API enablement still propagating, ADC without a quota project, or missing billing role | Wait and re-apply; redo 4.2; make sure you have Billing Account Administrator or Costs Manager. |
| `terraform destroy` fails on the backup bucket or the network | Bucket not empty, or orphaned load balancer/NEG resources still use the VPC | Section 6, steps 1–3; delete leftover forwarding rules and NEGs, then destroy again. |
