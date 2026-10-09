terraform {
  required_version = "~> 1.16.0"
  required_providers {
    google = { source = "hashicorp/google", version = "8.6.0" }
  }
}
variable "project_id" { type = string }
variable "region" { type = string }

resource "google_secret_manager_secret" "this" {
  for_each  = toset(["beer-map-db-admin", "beer-map-db-reader", "beer-map-grafana-admin", "beer-map-holmes-api", "beer-map-internal-tls"])
  project   = var.project_id
  secret_id = each.value
  replication {
    auto {}
  }
  labels = { application = "beer-map" }
  lifecycle { prevent_destroy = true }
}
resource "google_storage_bucket" "backups" {
  project                     = var.project_id
  name                        = "${var.project_id}-database-backups"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false
  versioning { enabled = true }
  lifecycle_rule {
    condition { age = 14 }
    action { type = "Delete" }
  }
  lifecycle { prevent_destroy = true }
  labels = { application = "beer-map", purpose = "database-backups" }
}
resource "google_service_account" "backup" {
  project    = var.project_id
  account_id = "beer-map-backup"
}
resource "google_storage_bucket_iam_member" "backup" {
  bucket = google_storage_bucket.backups.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.backup.email}"
}
resource "google_service_account_iam_member" "backup" {
  service_account_id = google_service_account.backup.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[beer-map/beer-map-backup]"
}
resource "google_service_account" "holmes" {
  project    = var.project_id
  account_id = "beer-map-holmes"
}
resource "google_project_iam_custom_role" "predict" {
  project     = var.project_id
  role_id     = "beerMapInvestigationModel"
  title       = "Beer Map model inference"
  permissions = ["aiplatform.endpoints.predict", "serviceusage.services.use"]
}
resource "google_project_iam_member" "predict" {
  project = var.project_id
  role    = google_project_iam_custom_role.predict.name
  member  = "serviceAccount:${google_service_account.holmes.email}"
}
resource "google_service_account_iam_member" "holmes" {
  service_account_id = google_service_account.holmes.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[observability/beer-map-holmes]"
}
output "backup_bucket" { value = google_storage_bucket.backups.name }
output "backup_service_account" { value = google_service_account.backup.email }
output "holmes_service_account" { value = google_service_account.holmes.email }
