mock_provider "google" {
  mock_data "google_project" {
    defaults = { number = "123456789012" }
  }
}

variables {
  billing_account_id         = "000000-000000-000000"
  github_repository_id       = "12345"
  github_repository_owner_id = "67890"
}

run "bounded_demo" {
  command = plan
  assert {
    condition     = module.cluster.capacity.max_nodes <= 2
    error_message = "The trial demo must not autoscale above two nodes."
  }
  assert {
    condition     = module.cluster.capacity.surge_nodes == 0
    error_message = "Node upgrades must not silently add paid surge capacity."
  }
  assert {
    condition     = module.cluster.capacity.private_nodes
    error_message = "Workers must not have public addresses."
  }
  assert {
    condition     = !module.cluster.capacity.ip_endpoint_enabled
    error_message = "The DNS-only control plane must not expose an IP endpoint."
  }
  assert {
    condition     = module.budget.credit_treatment == "EXCLUDE_ALL_CREDITS"
    error_message = "Trial credits must not hide gross usage from budget alerts."
  }
}

run "reject_oversized_budget" {
  command = plan
  variables { budget_sek = 501 }
  expect_failures = [var.budget_sek]
}
