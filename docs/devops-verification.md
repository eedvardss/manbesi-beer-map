# DevOps verification — 9 October 2026

These are observed results on the `feature/gke-foundation` branch. A passing
local check is distinct from a completed GitHub release or a public deployment.

| Area | Observed evidence |
| --- | --- |
| Dependencies/runtime | Complete npm dependency graph; Docker production build; strict DB startup; SIGTERM drains HTTP, SQL and telemetry |
| Application | Unit/API/configuration checks; real PostgreSQL integration tests; container page/assets, catalog equality and conditional 304; desktop/mobile browser regression on GCP |
| Data | Unchanged 165 venues and 2,550 serving records; native bundled snapshot equality |
| Terraform | fmt/validate/TFLint; two mocked cost/access tests; high/critical configuration scan; actual apply in GCP and subsequent full plan reporting no changes |
| Helm/Kubernetes | Real install and repeated migration/upgrade on kind and GKE; network test with healthy positive control; SQL read allowed and writes rejected; failed migration rolls back and all smoke tests pass again |
| GCP | Private GKE Standard worker, DNS/IAM control-plane endpoint, bounded autoscaling, registry, WIF identities, private state/backup buckets, secret metadata, gross 500 SEK budget alerts |
| Backup | Job uploaded a custom-format dump using create-only GCS permission; restored into a separate DB; source and restored catalog both MD5 `1725e704604664ceb3519d6dd14c21de`, 239,892 bytes, 165 venues |
| Failure/recovery | Approximately four-minute controlled DB outage: `/api/live` 200, readiness 503, app restart count zero; both configured Prometheus alerts firing; DB restored and app readiness recovered |
| Telemetry | Queried real HTTP/SQL traces, request metrics and exported logs; provisioned five-panel Grafana dashboard and Prometheus/Loki/Tempo data sources |
| Security/quality | Source and 63-commit history credential scans; fixed image vulnerability gate; Sonar overall reliability/security gate; auth/size/concurrency/deduplication bridge test |
| Internal TLS | GKE bridge and Holmes health checks using the mounted CA both 200; unauthenticated alert rejected 401; authenticated alert accepted 202; final TLS Helm upgrade healthy |

The unmodified dump is retained privately in
the demonstration backup bucket; restore-check DB and temporary in-pod files
were removed after comparison.

The image scan gates published fixes, not zero vulnerabilities. The narrowly
versioned `braces` advisory exception expires **8 November 2026**. Terraform's
GCP-0061 exception expires on the same date: IP endpoint CIDR restrictions are
inapplicable because IP endpoints are disabled and access uses the IAM-gated
DNS endpoint. See [GKE hardening](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/hardening-your-cluster).

Core-source coverage measured 96.17% lines, 91.79% branches and 94.87% functions
after real SQL integration. This measures loaded core modules, not every UI
or operational script; browser verification provides separate interaction
evidence. Sonar's gate is configured against overall correctness/security
ratings so a new disposable project cannot pass merely through empty
new-code measures.

## Outstanding acceptance gates

- The personal repository owner must configure GitHub environment/tag and
  main-branch protections; collaborators cannot receive admin access. Actual
  tag-to-WIF-to-OCI-to-GKE execution remains to be verified after configuration.
- Vertex AI returned `429 RESOURCE_EXHAUSTED` during investigation verification.
  The alert path reaches Holmes, but a complete evidence-backed AI report has
  not passed acceptance. Earlier testing also exposed an overly small step
  limit; it is now bounded at eight. Do not claim remediation is complete.
- A real second-project/operator reproduction has not been performed. Fresh
  bootstrap instructions and mocked Terraform tests are not equivalent proof.
- Public TLS ingress requires a chosen demonstration hostname and DNS/TLS
  setup. Current access uses authenticated port forwarding; existing public
  Aluskarte hostnames are not changed.
- Production HA, durable model quotas, backup-age alerting and explicit
  availability/RPO targets are separate work; this is a bounded course demo.

Raw runtime, scan, plan, backup and AI diagnostics stay in ignored `artifacts/`
or private GCP storage. They can contain sensitive operational details and
must not be attached to a public PR without review.
