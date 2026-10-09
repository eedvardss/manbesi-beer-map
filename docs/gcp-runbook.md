# GCP demonstration runbook

Use a trusted operator account, a separate project, and the repository root.
The tested target is `beermap-devops`, `europe-north1-a`. PowerShell scripts require
PowerShell 7. Other requirements are
Docker, Node 22, Google CLI 588, its GKE auth plugin, Terraform 1.16.5,
Helm 4.3, OpenSSL and kubectl compatible with the GKE version. CI installs verified
tool archives through `scripts/install-ci-tools.sh`.

## 1. Access and spending

Link the project to a trial billing account. Do not upgrade the account just
to run this exercise. Check the trial expiry and remaining credits in Billing.
Authenticate with `gcloud auth login`; never share an account password or
service-account key. Terraform can use a short-lived token:

```powershell
$env:GOOGLE_OAUTH_ACCESS_TOKEN = gcloud auth print-access-token
```

The agreed initial target is **500 SEK gross consumption**, out of 2,986 SEK
trial credits. Terraform configures 25%, 50%, 80% and 100% alerts excluding
credits. Billing data is delayed and alerts cannot enforce a hard cap.
Nodes, disks, NAT, logging and model inference all consume credits. A cluster
left running for days can use much more than a brief exercise. Check Billing
after each session; the actual invoice cannot be inferred from a passing test.

Keep one node initially, maximum two, no surge node. The zonal cluster and
single PostgreSQL replica are appropriate for a course demonstration, with
documented recovery. They do not provide production high availability.

## 2. Bootstrap remote state once

Create the state bucket with local state before enabling the GCS backend:

```powershell
terraform -chdir=infra/bootstrap init -lockfile=readonly
terraform -chdir=infra/bootstrap plan -var=project_id=beermap-devops -var=region=europe-north1 -out=bootstrap.tfplan
terraform -chdir=infra/bootstrap apply bootstrap.tfplan
Copy-Item infra/bootstrap/backend.tf.example infra/bootstrap/backend.tf
terraform -chdir=infra/bootstrap init -migrate-state -backend-config=bucket=beermap-devops-terraform-state -backend-config=prefix=bootstrap
```

`backend.tf`, state, plans and real variable files are ignored. Inspect saved
plans privately before applying; do not upload raw state to GitHub. The bucket
uses versioning, private access, and deletion protection. Secure any remaining
local state backup after checking remote state migration. Do not recreate or
delete an existing backend bucket to fix initialization errors.

## 3. Plan and create infrastructure

Copy `infra/environments/demo/terraform.tfvars.example` to an ignored
`local.auto.tfvars`, filling the billing account and **numeric** GitHub repo
and owner IDs. Change project, region and zone for a fresh isolated project.

```powershell
terraform -chdir=infra/environments/demo init -lockfile=readonly -backend-config=bucket=beermap-devops-terraform-state -backend-config=prefix=demo
terraform -chdir=infra/environments/demo plan -out=demo.tfplan
terraform -chdir=infra/environments/demo apply demo.tfplan
terraform -chdir=infra/environments/demo plan -detailed-exitcode
Remove-Item Env:GOOGLE_OAUTH_ACCESS_TOKEN
gcloud container clusters get-credentials beer-map-demo --dns-endpoint --zone europe-north1-a --project beermap-devops
```

For PowerShell, quote complete Terraform arguments if the shell separates
their values. Do not apply a plan containing unexpected replacement or deletion.
Terraform creates the private network, GKE, registry, identities, budget,
backup bucket and Secret Manager metadata. Secret payloads never enter its state.

## 4. Initialize secrets and platform releases

Run `./scripts/sync-cluster-secrets.ps1 -Project beermap-devops`. It generates
strong values only for empty secrets, then mounts their latest versions in
Kubernetes. It fails on access errors rather than rotating a working password.
It also initializes an internal TLS certificate through
`initialize-internal-tls.ps1`, retained in Secret Manager outside Terraform
state. Alertmanager and the bridge validate the certificate before sending
their bearer credentials. The demonstration certificate expires after 30
days: renew it as the operator, store a new secret version, remount it, and
restart Holmes, the bridge and Alertmanager together before expiry. Production
needs managed certificate rotation. Never disable certificate validation.
Run it again after recreating the cluster. Password rotation needs a coordinated
database-role update; replacing the admin secret alone cannot change an existing
PostgreSQL volume's password.

Use the ConfigMap Helm storage driver consistently for cloud releases. It
allows the deployment identity to manage release metadata without Secrets API
permission. Never pass credential values through Helm: release metadata is
readable to the deployment identity.

```powershell
$env:HELM_DRIVER = 'configmap'
helm upgrade --install beer-map-db charts/beer-map-db -n beer-map --set backup.enabled=true --set backup.bucket=beermap-devops-database-backups --set backup.serviceAccount=beer-map-backup@beermap-devops.iam.gserviceaccount.com --wait --timeout 3m
```

Build and push the first image as the trusted operator, with a unique tag and
commit revision. Resolve its registry digest and use that digest in the app:

```powershell
gcloud auth configure-docker europe-north1-docker.pkg.dev
docker build --build-arg VCS_REF=YOUR_COMMIT -t europe-north1-docker.pkg.dev/beermap-devops/beer-map/app:YOUR_UNIQUE_TAG .
docker push europe-north1-docker.pkg.dev/beermap-devops/beer-map/app:YOUR_UNIQUE_TAG
helm upgrade --install beer-map charts/beer-map -n beer-map -f infra/kubernetes/demo-values.yaml --set image.repository=europe-north1-docker.pkg.dev/beermap-devops/beer-map/app --set image.digest=sha256:YOUR_DIGEST --wait --rollback-on-failure --timeout 3m
helm test beer-map -n beer-map --timeout 1m
helm upgrade --install observability charts/observability -n observability --set holmes.enabled=true --set holmes.project=beermap-devops --set holmes.gcpServiceAccount=beer-map-holmes@beermap-devops.iam.gserviceaccount.com --set holmes.bridgeImage=europe-north1-docker.pkg.dev/beermap-devops/beer-map/app:YOUR_UNIQUE_TAG --wait --timeout 3m
kubectl apply -f infra/kubernetes/release-rbac.yaml
```

For another project, replace the service-account subject in the RBAC manifest.
The operator owns DB, network policy, services, ingress and observability;
normal release automation upgrades only the application. The deployment account
cannot query Secrets directly, but its ability to create workloads is privileged:
trusted workload code can mount namespace secrets. Treat tag creation as a
privileged action and protect repository write access.

## 5. Configure and exercise GitHub delivery

A repository owner (or organization repository admin) must create **gcp-demo** under Settings → Environments,
restrict deployments to tags `v*`, and protect release-tag creation using a
repository ruleset. Require review/CI on `main`. Set repository variable
`GCP_WIF_PROVIDER` to Terraform's `workload_identity_provider` output. For
another project, set `GCP_PROJECT_ID`, `GCP_REGION` and `GCP_ZONE` as well.
No GCP credential JSON or long-lived GitHub deployment secret is required.
Before entering the deployment environment or requesting a cloud identity,
release/rollback workflows verify protected `main` and the environment's sole
`v*` tag policy. Missing settings fail the workflow; they cannot silently
create and use an unprotected deployment environment.
Personal repositories cannot grant collaborators a separate admin role; the
owner must configure these settings. Private-repository environments require
a supported GitHub plan. See [GitHub repository permissions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository)
and [environment availability](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

PR workflows use no cloud identity. They check dependencies, source/history
secrets, infrastructure, a real database, browser behavior, Kubernetes hooks,
failed-upgrade recovery, fixed image vulnerabilities, and Sonar correctness/
security. Core-logic coverage is gated separately; it is not whole-UI coverage.
The sole temporary dependency exception has a package/version/expiry and must
be removed when upstream supplies a fix. Sonar Community runs on a disposable
server per checkout; it provides no paid PR decoration.

After CI is green, create a unique `v0.1.0-rc.N` tag for the demonstration.
An `X.Y.Z` production tag must point to an ancestor of `main`. The release runs
all gates, promotes the exact tested image, publishes immutable OCI charts,
deploys by image digest, waits for health, and runs database/isolation smoke
tests. Release and rollback share a concurrency lock. Never reuse a version
whose image or chart has already been published.

## 6. View and investigate

The demonstration uses authenticated port forwards. It does not reuse the
public Aluskarte hostnames or expose Grafana/AI endpoints publicly:

```powershell
kubectl -n beer-map port-forward service/beer-map 3005:80
kubectl -n observability port-forward service/grafana 3006:3000
kubectl -n observability port-forward service/prometheus 9091:9090
```

Grafana has a provisioned Beer Map dashboard and Prometheus, Loki and Tempo
data sources. Get the admin password privately from Secret Manager. The OTel
collector receives bounded-label HTTP metrics, request logs, HTTP and SQL
traces; metric/log/trace stores retain a small demonstration window.

During an approved fault exercise, scale `beer-map-db` to zero briefly.
Readiness must become 503 while `/api/live` remains 200 and app restarts stay
unchanged. Restore the StatefulSet to one replica **in a finally block** and
wait for app readiness. Never run this against a production database.

Prometheus → Alertmanager → authenticated bridge → Holmes investigates.
Holmes can read scoped Kubernetes resources/logs and query Prometheus/Loki.
Its IAM role permits Vertex inference only; it cannot read Kubernetes Secrets,
exec into pods or change deployments. The bridge allows one investigation at
a time, at most 20 attempts/day/process, deduplicates an alert for one hour,
and limits the request and model output. These limits reset on restart and
are not a billing hard cap. Model calls consume trial credits. If inference
fails, keep the alert actionable through the dashboard and operator runbook.

AI output is a proposal requiring human review. Inspect evidence, the previous
revision and SQL compatibility before manually dispatching `rollback.yml`
on a release tag, supplying the numeric revision and typing `ROLLBACK`.
Helm rollback cannot reverse migrations; use additive compatible migrations.
Do not give Holmes GitHub credentials or cluster write permissions.

## 7. Backup and restore

The DB CronJob makes a custom-format `pg_dump` at 02:15 UTC and uploads it using
Workload Identity and create-only GCS permissions. The bucket is private,
versioned and expires objects after 14 days. Alerting on backup age and a
production retention/RPO policy need further work before production operation.

Exercise a backup with `kubectl -n beer-map create job --from=cronjob/beer-map-backup restore-drill-backup`.
Wait for Job completion and inspect its uploader log for the object path. As
the operator, download that object, copy it into the PostgreSQL pod, create a
**separate** `beer_map_restore_check` database, and run `pg_restore --no-owner
--no-acl` against that database. Compare catalog checksum, size and venue
count with the source. Drop only the drill database and remove the temporary
dump after comparison. Never restore directly over live data as a smoke test.

## 8. End the exercise

Keep the tested dump and state. Inventory pods, PVCs, disks, addresses,
forwarding rules, cluster and NAT. Helm uninstall retains database and
observability PVCs deliberately; deleting a cluster alone can leave disks.
After a verified backup, removing **demonstration** PVCs destroys only the
demonstration volumes. Do not apply this procedure to an existing live project.

To remove costly compute while preserving identities, artifacts, secrets,
state and backup, first apply `deletion_protection=false`, then review a
targeted destroy plan for `module.cluster.google_container_cluster.this`,
`module.cluster.google_container_node_pool.this` and `module.network`.
This retains the node identity and its registry permissions. Targeting is
an exceptional exercise-cleanup operation, not the normal deployment path.
After applying it, check Compute disks, addresses, forwarding rules and GKE
again, then inspect a complete Terraform plan to document the intentionally
absent environment. A subsequent full apply recreates the platform. Synchronize
secrets and install the database chart first, restore the verified backup into
the new demonstration database, then install the application and observability
charts and run their checks before releasing. Restore before the application's
initial seed job; do not overwrite a live catalog as a smoke test.

Production readiness still needs a separately selected hostname, TLS/ingress,
availability/RPO targets, durable AI quotas, backup-age alerts and an actual
second-project/operator reproduction. Do not label these demonstrated by
mocked Terraform tests.
