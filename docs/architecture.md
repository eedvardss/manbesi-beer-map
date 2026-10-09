# DevOps architecture and acceptance criteria

The course proposal is https://github.com/KTH/devops-course/pull/3027.
Source, charts, infrastructure and workflows share one GitHub repository.
Images/charts live in Artifact Registry; private versioned Terraform state in
GCS; application data and backups live outside Git. Existing public Aluskarte
hosting is unchanged. The demo ingress hostname is unset; cloud exercises
currently use authenticated port forwarding.

## Deployment boundaries

The browser UI and REST API are logical tiers implemented in one stateless Node
application. Keep this deployment boundary: there is currently no independent
scaling or release requirement that justifies another service. PostgreSQL is
the third tier. This is an explicit architectural decision, not a claim that
the current frontend and API are independently deployed services.

Terraform owns the GCP network, zonal GKE Standard cluster, node identity,
registry, federated deployment identity, secret metadata and billing alerts.
The platform operator owns the PostgreSQL and observability Helm releases.
Application release automation owns the application Helm release. PostgreSQL
has a separate Helm release, protecting its lifecycle from failed app installs.
Every resource has one owner. No live credentials belong in Terraform variables
or chart values; use mounted secrets for database passwords.

## Gates

| Proposal area | Evidence required before completion |
| --- | --- |
| Runtime | Required DB configuration; independent liveness/readiness; graceful SIGTERM; outage recovery |
| CI | Real isolated PostgreSQL tests, unit/type/data checks, browser tests, conditional requests; one SQL server |
| Quality/security | Dependency gate with narrowly scoped expiring exceptions; secret, image and config scans; Sonar gate |
| Terraform | fmt/validate/TFLint/config scan; reviewed saved plan; repeat apply without unexpected drift |
| Helm | lint/render and Kubernetes API validation; real fresh install, upgrade, failed migration and rollback |
| Release | Protected tagged release; keyless access; tested image digest and versioned OCI chart; smoke tests |
| Database | Runtime SELECT-only role; persistent storage; repeat migration; backup restored into separate DB |
| Observability | A controlled failure produces metrics, correlated logs/traces and an actionable alert |
| Remediation | Read-only investigation; evidence-backed proposal; human-approved compatible rollback |
| Reproducibility | Second operator can create, release, recover and remove an isolated environment |

## Limits and operating decisions

Project: `beermap-devops`, free trial, initial agreed testing target 500 SEK.
No paid account upgrade is necessary for local work. Check credit expiry and
current gross resource usage before each cloud exercise. Budget alerts exclude
credits so a net-zero invoice does not hide resource consumption. Alerts are
not a hard stop. Teardown must inventory disks, forwarding rules and NAT as well
as nodes. Preserve only chosen state, backups and release artifacts.

The demonstration cluster is zonal with one to two nodes, no surge upgrade
nodes, and private worker addresses. This is not production high availability.
A single PostgreSQL StatefulSet/PVC is not a backup or HA database. Compatible
additive migrations support app rollback; Helm cannot undo SQL changes. Any
destructive migration requires a separately reviewed recovery strategy.

Untrusted pull requests never receive cloud deployment credentials. Do not use
pull_request_target to execute contributor code with secrets. Terraform plans
and state may be sensitive: publish redacted summaries, not raw state or secrets.
