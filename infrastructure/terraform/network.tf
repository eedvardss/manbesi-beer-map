resource "google_compute_network" "beermap" {
  name                    = "beermap"
  auto_create_subnetworks = false

  depends_on = [google_project_service.this]
}

resource "google_compute_subnetwork" "beermap" {
  name                     = "beermap-${var.region}"
  region                   = var.region
  network                  = google_compute_network.beermap.id
  ip_cidr_range            = "10.10.0.0/20"
  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.20.0.0/14"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.30.0.0/20"
  }
}

# Used by the Ingress via `kubernetes.io/ingress.global-static-ip-name: beermap-ip`.
resource "google_compute_global_address" "ingress" {
  name = "beermap-ip"

  depends_on = [google_project_service.this]
}
