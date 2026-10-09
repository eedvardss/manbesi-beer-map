output "workload_identity_provider" {
  description = "GitHub variable GCP_WORKLOAD_IDENTITY_PROVIDER (google-github-actions/auth workload_identity_provider)."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "deployer_service_account" {
  description = "GitHub variable GCP_DEPLOYER_SA (google-github-actions/auth service_account)."
  value       = google_service_account.deployer.email
}

output "cluster_name" {
  description = "GKE Autopilot cluster name."
  value       = google_container_cluster.beermap.name
}

output "region" {
  description = "Cluster region (the cluster is regional)."
  value       = google_container_cluster.beermap.location
}

output "ingress_ip_address" {
  description = "Global static IP beermap-ip; point the aluskarte.lv and www A records here."
  value       = google_compute_global_address.ingress.address
}

output "backup_bucket" {
  description = "GCS bucket for nightly pg_dump uploads."
  value       = google_storage_bucket.backups.name
}

output "backup_service_account" {
  description = "GSA for the KSA annotation iam.gke.io/gcp-service-account on beermap/beermap-backup."
  value       = google_service_account.backup.email
}
