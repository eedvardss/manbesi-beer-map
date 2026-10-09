# Autopilot owns nodes, node pools, Dataplane V2 (NetworkPolicy enforcement),
# Workload Identity, Shielded Nodes and autoscaling, so none of that is set here.
resource "google_container_cluster" "beermap" {
  name     = "beermap"
  location = var.region

  enable_autopilot    = true
  deletion_protection = var.deletion_protection

  network    = google_compute_network.beermap.id
  subnetwork = google_compute_subnetwork.beermap.id

  ip_allocation_policy {
    cluster_secondary_range_name  = google_compute_subnetwork.beermap.secondary_ip_range[0].range_name
    services_secondary_range_name = google_compute_subnetwork.beermap.secondary_ip_range[1].range_name
  }

  release_channel {
    channel = "REGULAR"
  }

  # Autopilot otherwise runs nodes as the Compute Engine default SA (often Editor).
  cluster_autoscaling {
    auto_provisioning_defaults {
      service_account = google_service_account.nodes.email
      oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]
    }
  }

  resource_labels = {
    app = "beermap"
  }

  # Nodes and the control-plane endpoint stay public: private nodes would need
  # Cloud NAT to pull from GHCR, and GitHub-hosted runners have no fixed IPs
  # for authorized networks. Access is gated by IAM + Kubernetes RBAC.

  depends_on = [
    google_project_service.this,
    google_project_iam_member.nodes,
  ]
}

resource "google_service_account" "nodes" {
  account_id   = "beermap-nodes"
  display_name = "Beer Map GKE nodes"

  depends_on = [google_project_service.this]
}

# Logging, monitoring and metadata writes only; workloads use their own GSAs via Workload Identity.
resource "google_project_iam_member" "nodes" {
  project = var.project_id
  role    = "roles/container.defaultNodeServiceAccount"
  member  = google_service_account.nodes.member
}
