terraform {
  required_version = "~> 1.16.0"
  backend "gcs" {}
  required_providers {
    google = { source = "hashicorp/google", version = "8.6.0" }
  }
}
provider "google" {
  project               = var.project_id
  region                = var.region
  billing_project       = var.project_id
  user_project_override = true
}
data "google_project" "this" { project_id = var.project_id }
resource "google_project_service" "this" {
  for_each           = toset(["compute.googleapis.com", "container.googleapis.com", "artifactregistry.googleapis.com", "iam.googleapis.com", "iamcredentials.googleapis.com", "sts.googleapis.com", "secretmanager.googleapis.com", "billingbudgets.googleapis.com", "monitoring.googleapis.com", "logging.googleapis.com", "aiplatform.googleapis.com"])
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}
module "budget" {
  source                = "../../modules/budget"
  billing_account_id    = var.billing_account_id
  project_number        = data.google_project.this.number
  amount_sek            = var.budget_sek
  notification_channels = []
  depends_on            = [google_project_service.this]
}
module "network" {
  source     = "../../modules/network"
  project_id = var.project_id
  region     = var.region
  depends_on = [module.budget]
}
module "registry" {
  source     = "../../modules/registry"
  project_id = var.project_id
  region     = var.region
  depends_on = [module.budget]
}
module "cluster" {
  source              = "../../modules/cluster"
  project_id          = var.project_id
  zone                = var.zone
  network             = module.network.network
  subnetwork          = module.network.subnetwork
  machine_type        = var.machine_type
  deletion_protection = var.deletion_protection
}
resource "google_artifact_registry_repository_iam_member" "nodes" {
  repository = module.registry.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${module.cluster.node_service_account}"
}
module "identity" {
  source              = "../../modules/identity"
  project_id          = var.project_id
  repository_id       = var.github_repository_id
  repository_owner_id = var.github_repository_owner_id
  registry_name       = module.registry.name
}
module "operations" {
  source     = "../../modules/operations"
  project_id = var.project_id
  region     = var.region
  depends_on = [module.budget]
}
output "registry" { value = module.registry.url }
output "cluster" { value = module.cluster.name }
output "workload_identity_provider" { value = module.identity.provider }
output "deploy_service_account" { value = module.identity.deploy_service_account }
output "backup_bucket" { value = module.operations.backup_bucket }
