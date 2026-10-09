terraform {
  required_version = "~> 1.16.0"
  required_providers {
    google = { source = "hashicorp/google", version = "8.6.0" }
  }
}

variable "project_id" { type = string }
variable "region" { type = string }

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_storage_bucket" "state" {
  name                        = "${var.project_id}-terraform-state"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false
  versioning { enabled = true }
  lifecycle {
    prevent_destroy = true
  }
  labels = { application = "beer-map", purpose = "terraform-state" }
}

output "state_bucket" { value = google_storage_bucket.state.name }
