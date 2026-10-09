terraform {
  required_version = "~> 1.16.0"
  required_providers {
    google = { source = "hashicorp/google", version = "8.6.0" }
  }
}
variable "project_id" { type = string }
variable "region" { type = string }

resource "google_artifact_registry_repository" "this" {
  project       = var.project_id
  location      = var.region
  repository_id = "beer-map"
  format        = "DOCKER"
  description   = "Immutable application images and OCI charts"
  docker_config { immutable_tags = true }
  cleanup_policy_dry_run = true
  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions { keep_count = 10 }
  }
}
output "name" { value = google_artifact_registry_repository.this.name }
output "url" { value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.this.repository_id}" }
