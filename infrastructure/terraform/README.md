# Terraform: GCP platform for Beer Map

Creates everything the Helm charts and the GitHub deploy job need in one GCP project (`europe-north1`, prod only):

| File | Resources |
| --- | --- |
| `apis.tf` | Required project APIs |
| `network.tf` | VPC `beermap`, subnet with `pods`/`services` secondary ranges, global static IP `beermap-ip` |
| `gke.tf` | GKE Autopilot cluster `beermap` (regional, REGULAR channel, Workload Identity, Dataplane V2) and a minimal node service account |
| `backups.tf` | Bucket `<project>-beermap-backups` (30-day delete), GSA `beermap-backup` (objectCreator), Workload Identity binding for KSA `beermap/beermap-backup` |
| `github.tf` | Workload Identity Federation pool/provider `github` (repository `eedvardss/manbesi-beer-map` only), GSA `github-deployer` with `roles/container.developer` |
| `budget.tf` | Monthly EUR budget with alerts at 50/90/100% |

State lives in GCS bucket `<project>-tfstate`, prefix `beermap`.

## Inputs

| Variable | Default | Notes |
| --- | --- | --- |
| `project_id` | none | GCP project ID |
| `billing_account_id` | none | `XXXXXX-XXXXXX-XXXXXX`; the account currency must be EUR |
| `budget_amount` | `50` | EUR per month |
| `region` | `europe-north1` | |
| `deletion_protection` | `true` | Set `false` and apply before `terraform destroy` |

Copy `terraform.tfvars.example` to `terraform.tfvars` (git-ignored) and fill it in.

## Prerequisites

- Terraform 1.16+ (or `mirror.gcr.io/hashicorp/terraform:1.16.5`) and `gcloud`.
- Project Owner on the project, plus Billing Account Administrator or Billing Account Costs Manager on the billing account (for the budget).
- Application Default Credentials with a quota project (the Budgets API rejects user credentials without one):

  ```sh
  gcloud auth application-default login
  gcloud auth application-default set-quota-project "$PROJECT_ID"
  ```

## 1. Bootstrap (once per project)

The state bucket can't be managed by the state it holds, and Terraform needs two APIs before it can enable the others or read the project number:

```sh
PROJECT_ID=my-beermap-project
gcloud services enable serviceusage.googleapis.com cloudresourcemanager.googleapis.com --project "$PROJECT_ID"
gcloud storage buckets create "gs://$PROJECT_ID-tfstate" --project "$PROJECT_ID" \
  --location europe-north1 --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update "gs://$PROJECT_ID-tfstate" --versioning
```

## 2. Init, plan, apply

```sh
cd infrastructure/terraform
terraform init -backend-config="bucket=$PROJECT_ID-tfstate"
terraform plan -out tfplan
terraform apply tfplan
terraform output
```

The first apply takes about 10 minutes (the cluster).

## 3. Grant the deployer RBAC rights (once, by a human)

`roles/container.developer` covers Deployments, StatefulSets, Secrets, Services, Ingress and so on, but not creating Roles, RoleBindings, ClusterRoles or ClusterRoleBindings (checked against the GKE IAM role reference: those permissions are only in `roles/container.admin`). The charts create RBAC objects, so bind the deployer in Kubernetes RBAC instead of widening IAM:

```sh
gcloud container clusters get-credentials beermap --region europe-north1 --project "$PROJECT_ID"
kubectl create clusterrolebinding github-deployer-admin --clusterrole cluster-admin \
  --user "github-deployer@$PROJECT_ID.iam.gserviceaccount.com"
```

## 4. GitHub Environment `production`

Variables (Settings > Environments > production > Variables):

| Variable | Value |
| --- | --- |
| `GCP_PROJECT_ID` | `$PROJECT_ID` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `terraform output -raw workload_identity_provider` |
| `GCP_DEPLOYER_SA` | `terraform output -raw deployer_service_account` |

The secrets (`POSTGRES_PASSWORD`, `APP_DATABASE_PASSWORD`, `REVIEW_DATABASE_PASSWORD`, `PRICE_REVIEW_PASSWORD`, `PRICE_SESSION_SECRET`, `GHCR_PULL_TOKEN`) don't come from Terraform. The workflow needs `permissions: id-token: write` for keyless auth.

## 5. DNS (Cloudflare, manual)

In the Cloudflare dashboard, set the `A` records for `aluskarte.lv` and `www.aluskarte.lv` to `terraform output -raw ingress_ip_address` with the proxy status **DNS only** (grey cloud). Terraform does not manage Cloudflare.

- The Google `ManagedCertificate` validates over HTTP against the load balancer. With the orange cloud on, validation sees Cloudflare instead and the certificate stays `Provisioning`. It becomes `Active` up to about 60 minutes after the records resolve to the static IP and the Ingress exists.
- Doing this moves the live site off the Cloudflare Worker `aluskarte` (its routes stop matching once traffic no longer goes through Cloudflare's proxy). That cutover is your decision; switch back by restoring the previous records.

## Teardown

Set `deletion_protection = false`, apply, then `terraform destroy`. The tfstate bucket stays, and no API is disabled (`disable_on_destroy = false`).

## Validation

```sh
docker run --rm -v "$PWD:/work" -w /work mirror.gcr.io/hashicorp/terraform:1.16.5 fmt -check -recursive
docker run --rm -v "$PWD:/work" -w /work mirror.gcr.io/hashicorp/terraform:1.16.5 init -backend=false
docker run --rm -v "$PWD:/work" -w /work mirror.gcr.io/hashicorp/terraform:1.16.5 validate
docker run --rm -v "$PWD:/data" -w /data --entrypoint sh ghcr.io/terraform-linters/tflint:v0.64.0 -c "tflint --init && tflint"
docker run --rm -v "$PWD:/src:ro" mirror.gcr.io/aquasec/trivy:0.70.0 config /src
```

These check syntax, schema and lint rules only; Autopilot-specific API rules are enforced at apply time.

## Accepted Trivy findings

| Check | Why it is accepted |
| --- | --- |
| GCP-0061 no master authorized networks | GitHub-hosted runners have no fixed IP ranges. The endpoint requires Google IAM auth; RBAC limits what each identity can do. |
| GCP-0059 no private nodes | Private nodes need Cloud NAT (a fixed monthly cost) to pull images from GHCR. Autopilot nodes already use Shielded VMs, have no SSH and restrict privileged pods. |
| GCP-0029 / GCP-0076 no subnet flow logs | Log volume cost for a single-app course project; GKE audit logs and Cloud Logging stay on. |
| GCP-0066 no CMEK on the backup bucket | Google-managed encryption is on; KMS adds cost and key-management work without a requirement. |
| GCP-0078 no bucket versioning | The backup GSA is create-only (it can't overwrite or delete), and with versioning the 30-day delete rule would leave noncurrent copies behind. |
