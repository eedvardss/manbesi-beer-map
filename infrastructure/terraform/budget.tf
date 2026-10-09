# Needs cloudresourcemanager enabled before the first plan (README bootstrap).
data "google_project" "this" {
  project_id = var.project_id
}

resource "google_billing_budget" "beermap" {
  billing_account = var.billing_account_id
  display_name    = "beermap monthly"

  budget_filter {
    projects = ["projects/${data.google_project.this.number}"]
  }

  amount {
    specified_amount {
      currency_code = "EUR"
      units         = tostring(var.budget_amount)
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }
  threshold_rules {
    threshold_percent = 0.9
  }
  threshold_rules {
    threshold_percent = 1.0
  }

  depends_on = [google_project_service.this]
}
