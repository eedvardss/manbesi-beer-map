resource "google_storage_bucket" "backups" {
  name     = "${var.project_id}-beermap-backups"
  location = var.region

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.this]
}

resource "google_service_account" "backup" {
  account_id   = "beermap-backup"
  display_name = "Beer Map pg_dump uploader"

  depends_on = [google_project_service.this]
}

# Create-only: the CronJob can upload new dumps but cannot read, list, overwrite or delete them.
resource "google_storage_bucket_iam_member" "backup_writer" {
  bucket = google_storage_bucket.backups.name
  role   = "roles/storage.objectCreator"
  member = google_service_account.backup.member
}

resource "google_service_account_iam_member" "backup_workload_identity" {
  service_account_id = google_service_account.backup.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[beermap/beermap-backup]"

  # The <project>.svc.id.goog identity pool exists only once the cluster does.
  depends_on = [google_container_cluster.beermap]
}
