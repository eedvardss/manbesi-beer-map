terraform {
  required_version = "~> 1.16.0"
  required_providers {
    google = { source = "hashicorp/google", version = "8.6.0" }
  }
}
variable "billing_account_id" { type = string }
variable "project_number" { type = string }
variable "amount_sek" { type = number }
variable "notification_channels" { type = list(string) }

resource "google_billing_budget" "demo" {
  billing_account = var.billing_account_id
  display_name    = "Beer Map demo gross usage"
  budget_filter {
    projects               = ["projects/${var.project_number}"]
    credit_types_treatment = "EXCLUDE_ALL_CREDITS"
    calendar_period        = "MONTH"
  }
  amount {
    specified_amount {
      currency_code = "SEK"
      units         = tostring(var.amount_sek)
    }
  }
  dynamic "threshold_rules" {
    for_each = [0.25, 0.50, 0.80, 1.0]
    content { threshold_percent = threshold_rules.value }
  }
  dynamic "all_updates_rule" {
    for_each = length(var.notification_channels) > 0 ? [var.notification_channels] : []
    content {
      monitoring_notification_channels = all_updates_rule.value
      disable_default_iam_recipients   = false
    }
  }
}
output "credit_treatment" { value = google_billing_budget.demo.budget_filter[0].credit_types_treatment }
