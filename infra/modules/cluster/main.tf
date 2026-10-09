terraform {
  required_version = "~> 1.16.0"
  required_providers {
    google = { source = "hashicorp/google", version = "8.6.0" }
  }
}
variable "project_id" { type = string }
variable "zone" { type = string }
variable "network" { type = string }
variable "subnetwork" { type = string }
variable "deletion_protection" { type = bool }
variable "machine_type" { type = string }

resource "google_service_account" "nodes" {
  project      = var.project_id
  account_id   = "beer-map-nodes"
  display_name = "Beer Map GKE nodes"
}
resource "google_project_iam_member" "nodes" {
  for_each = toset(["roles/logging.logWriter", "roles/monitoring.metricWriter", "roles/container.defaultNodeServiceAccount"])
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.nodes.email}"
}
# IP endpoints are disabled; CIDR restrictions apply only to IP endpoints.
# DNS endpoint authentication uses Google IAM. See docs/architecture.md.
# trivy:ignore:GCP-0061:exp:2026-11-08
resource "google_container_cluster" "this" {
  project                  = var.project_id
  name                     = "beer-map-demo"
  location                 = var.zone
  network                  = var.network
  subnetwork               = var.subnetwork
  remove_default_node_pool = true
  initial_node_count       = 1
  deletion_protection      = var.deletion_protection
  networking_mode          = "VPC_NATIVE"
  datapath_provider        = "ADVANCED_DATAPATH"
  enable_shielded_nodes    = true
  release_channel { channel = "REGULAR" }
  workload_identity_config { workload_pool = "${var.project_id}.svc.id.goog" }
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }
  private_cluster_config {
    enable_private_nodes   = true
    master_ipv4_cidr_block = "10.30.0.0/28"
  }
  control_plane_endpoints_config {
    dns_endpoint_config { allow_external_traffic = true }
    ip_endpoints_config { enabled = false }
  }
  logging_config { enable_components = ["SYSTEM_COMPONENTS"] }
  monitoring_config { enable_components = ["SYSTEM_COMPONENTS"] }
  resource_labels = { application = "beer-map", environment = "demo" }
}
resource "google_container_node_pool" "this" {
  project  = var.project_id
  name     = "demo"
  location = var.zone
  cluster  = google_container_cluster.this.name
  autoscaling {
    min_node_count = 1
    max_node_count = 2
  }
  management {
    auto_repair  = true
    auto_upgrade = true
  }
  upgrade_settings {
    max_surge       = 0
    max_unavailable = 1
  }
  node_config {
    machine_type    = var.machine_type
    service_account = google_service_account.nodes.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]
    disk_size_gb    = 30
    disk_type       = "pd-balanced"
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
    workload_metadata_config { mode = "GKE_METADATA" }
    metadata = { disable-legacy-endpoints = "true" }
  }
  depends_on = [google_project_iam_member.nodes]
}
output "name" { value = google_container_cluster.this.name }
output "node_service_account" { value = google_service_account.nodes.email }
output "capacity" {
  value = {
    max_nodes           = google_container_node_pool.this.autoscaling[0].max_node_count
    surge_nodes         = google_container_node_pool.this.upgrade_settings[0].max_surge
    private_nodes       = google_container_cluster.this.private_cluster_config[0].enable_private_nodes
    ip_endpoint_enabled = google_container_cluster.this.control_plane_endpoints_config[0].ip_endpoints_config[0].enabled
  }
}
