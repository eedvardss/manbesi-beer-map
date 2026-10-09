locals {
  github_repository = "eedvardss/manbesi-beer-map"
}

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github"
  display_name              = "GitHub Actions"

  depends_on = [google_project_service.this]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub Actions OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }
  attribute_condition = "assertion.repository == \"${local.github_repository}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account" "deployer" {
  account_id   = "github-deployer"
  display_name = "GitHub Actions deployer"

  depends_on = [google_project_service.this]
}

# Covers workloads, Secrets, Ingress etc. but not Roles/RoleBindings/ClusterRoles;
# those come from the one-time ClusterRoleBinding in README.md.
resource "google_project_iam_member" "deployer_container_developer" {
  project = var.project_id
  role    = "roles/container.developer"
  member  = google_service_account.deployer.member
}

resource "google_service_account_iam_member" "deployer_workload_identity" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${local.github_repository}"
}
