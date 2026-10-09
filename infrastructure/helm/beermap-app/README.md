# beermap-app

The Rīgas alus web app (`ghcr.io/eedvardss/manbesi-beer-map`) on GKE Autopilot in namespace `beermap`. The price-suggestion feature is on. It installs:

- `pre-install,pre-upgrade` hook Job `beermap-app-migrate`, which runs `scripts/setup-database.mjs`. This is compose's `db-setup`: it applies migrations, seeds an empty database and creates the restricted `beer_map_app` and `beer_map_reviewer` roles. It connects as the superuser.
- Deployment `beermap-app`, which connects as the restricted roles, with env matching `infrastructure/docker/compose.yaml` and `compose.prices.yaml`. The HPA (CPU 70%, 2–5 replicas) owns the replica count.
- ClusterIP Service with a NEG annotation for container-native load balancing.
- Ingress (`gce`, static IP `beermap-ip`), a ManagedCertificate for `aluskarte.lv` and `www.aluskarte.lv`, and a FrontendConfig that redirects HTTP to HTTPS.
- PodDisruptionBudget (`minAvailable: 1`).
- NetworkPolicy, ingress: port 3000 only from the Google LB and health-check ranges and from namespace `monitoring`. Egress: only postgres:5432 and DNS.
- ServiceAccount `beermap-app` with `automountServiceAccountToken: false`. There is no Role or RoleBinding because nothing in the pod calls the Kubernetes API.

## Prerequisites

- The `beermap-postgres` release is installed first. On first install, the migration hook runs before any other resource in this chart.
- These Secrets exist in `beermap`:
  - `beermap-postgres-auth` (`POSTGRES_PASSWORD`)
  - `beermap-app-secrets` (`APP_DATABASE_PASSWORD`, `REVIEW_DATABASE_PASSWORD`, `PRICE_REVIEW_PASSWORD`, `PRICE_SESSION_SECRET`)
  - `ghcr-pull`
- Passwords are placed into connection URLs with `$(VAR)` expansion, as in compose, so they must be URL-safe (for example `openssl rand -hex 32`). The app also requires lengths of at least 24 characters for the two database passwords and `PRICE_REVIEW_PASSWORD`, and at least 32 for `PRICE_SESSION_SECRET`. Otherwise price endpoints return 503 or the migration fails.

```sh
helm upgrade --install --atomic -n beermap beermap-app infrastructure/helm/beermap-app --set image.tag=sha-<short>
```

## Values

| Value | Default | |
|---|---|---|
| `image.repository` | `ghcr.io/eedvardss/manbesi-beer-map` | |
| `image.tag` | required | Immutable tag; `latest` is rejected |
| `imagePullSecrets` | `[{name: ghcr-pull}]` | `null` for local clusters |
| `secrets.postgres`, `secrets.app` | `beermap-postgres-auth`, `beermap-app-secrets` | |
| `postgres.host`, `.database`, `.superuser` | `beermap-postgres`, `beer_map`, `beer_map` | |
| `postgres.clientLabel` | `beermap.io/postgres-client: "true"` | Must match the postgres chart |
| `postgres.podLabels` | `app.kubernetes.io/name: beermap-postgres` | Egress target |
| `priceAllowedOrigin` | `https://aluskarte.lv` | `PRICE_ALLOWED_ORIGIN`; TLS ends at the LB, so the pod cannot infer it |
| `resources`, `migration.resources` | 250m / 512Mi | Limits equal requests (Autopilot) |
| `autoscaling.*` | 2 / 5 / 70% | |
| `ingress.enabled` | `true` | Turns the Ingress, ManagedCertificate and FrontendConfig on or off together |
| `ingress.staticIpName`, `ingress.hosts` | `beermap-ip`, both domains | |
| `networkPolicy.loadBalancerRanges` | `35.191.0.0/16`, `130.211.0.0/22` | |
| `networkPolicy.monitoringNamespace` | `monitoring` | |

## Probes

Readiness is `GET /api/health`, which returns 503 until the catalog can be read from Postgres. GKE also derives the load balancer health check from this probe. Liveness is a TCP check, because restarting the app does not fix a database outage.

## Packaging

```sh
helm package infrastructure/helm/beermap-app --version 0.1.0 --app-version sha-<short>
helm push beermap-app-0.1.0.tgz oci://ghcr.io/eedvardss/charts
```
