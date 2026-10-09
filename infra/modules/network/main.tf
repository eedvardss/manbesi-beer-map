terraform {
  required_version = "~> 1.16.0"
  required_providers {
    google = { source = "hashicorp/google", version = "8.6.0" }
  }
}
variable "project_id" { type = string }
variable "region" { type = string }

resource "google_compute_network" "this" {
  project                 = var.project_id
  name                    = "beer-map"
  auto_create_subnetworks = false
}
resource "google_compute_subnetwork" "this" {
  project                  = var.project_id
  name                     = "beer-map"
  region                   = var.region
  network                  = google_compute_network.this.id
  ip_cidr_range            = "10.20.0.0/20"
  private_ip_google_access = true
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.24.0.0/16"
  }
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.28.0.0/20"
  }
}
resource "google_compute_router" "this" {
  project = var.project_id
  name    = "beer-map"
  region  = var.region
  network = google_compute_network.this.id
}
resource "google_compute_router_nat" "this" {
  project                            = var.project_id
  name                               = "beer-map"
  router                             = google_compute_router.this.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"
  subnetwork {
    name                    = google_compute_subnetwork.this.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }
}
output "network" { value = google_compute_network.this.id }
output "subnetwork" { value = google_compute_subnetwork.this.id }
