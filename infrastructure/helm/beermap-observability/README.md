# beermap-observability

Umbrella chart for metrics, alerts, dashboards and logs on the GKE Autopilot cluster.
Release `beermap-observability` in namespace `monitoring`.

| Dependency | Chart version | App version | Repository |
| --- | --- | --- | --- |
| kube-prometheus-stack (Prometheus, Alertmanager, Grafana, operator, kube-state-metrics) | 92.2.0 | operator v0.94.1, Grafana 13.2.3 | https://prometheus-community.github.io/helm-charts |
| loki (monolithic, filesystem on a PVC) | 18.15.1 | 3.7.8 | https://grafana-community.github.io/helm-charts |
| alloy (log collection) | 1.13.1 | v1.20.1 | https://grafana.github.io/helm-charts |

The OSS Loki chart now lives in `grafana-community/helm-charts`; `grafana/loki` 7.x targets Grafana Enterprise Logs.

Our own templates:

- `templates/grafana-datasource-loki.yaml`: Loki datasource (uid `loki`). kube-prometheus-stack provisions Prometheus (uid `prometheus`) and Alertmanager.
- `templates/grafana-dashboards.yaml`: one ConfigMap per `dashboards/*.json`, labelled `grafana_dashboard: "1"` for the Grafana sidecar.
- `dashboards/beermap-overview.json`: ready app pods, PostgreSQL readiness, restarts, PVC usage, CPU and memory per pod, HPA replicas, and container logs from Loki (container picker and regex filter).
- `templates/prometheusrule.yaml`: `BeermapAppDown`, `BeermapHighRestartRate`, `BeermapPostgresDown`, `BeermapPVCAlmostFull`, `BeermapBackupFailed`.

## Install

The Prometheus Operator CRDs ship inside kube-prometheus-stack and are installed with the first release; there is no separate CRD step.

```sh
cd infrastructure/helm/beermap-observability
helm dependency build            # downloads charts/*.tgz from Chart.lock (not committed)

kubectl create namespace monitoring
kubectl -n monitoring create secret generic beermap-grafana-admin \
  --from-literal=admin-user=admin \
  --from-literal=admin-password="$(openssl rand -base64 24)"

helm upgrade --install beermap-observability . \
  --namespace monitoring --atomic --timeout 10m
```

Install this release before or after the app charts; the alerts only refer to objects by name.

Helm 3 does not upgrade CRDs. When bumping kube-prometheus-stack, apply its CRDs first, as described in the chart's upgrade notes.

## Access Grafana

Grafana has no Service of type LoadBalancer and no Ingress.

```sh
kubectl -n monitoring port-forward svc/beermap-observability-grafana 3000:80
# http://localhost:3000, credentials from the beermap-grafana-admin secret:
kubectl -n monitoring get secret beermap-grafana-admin -o jsonpath='{.data.admin-password}' | base64 -d
```

Prometheus and Alertmanager use the same pattern: `svc/kps-prometheus 9090` and `svc/kps-alertmanager 9093`.

## Values

| Key | Default | Purpose |
| --- | --- | --- |
| `beermap.namespace` | `beermap` | Namespace watched by the alerts |
| `beermap.appDeployment` | `beermap-app` | Deployment for `BeermapAppDown` |
| `beermap.postgresStatefulSet` | `beermap-postgres` | StatefulSet for `BeermapPostgresDown` |
| `beermap.backupCronJob` | `beermap-postgres-backup` | CronJob for `BeermapBackupFailed` |

The dashboard JSON hardcodes the same namespace and names. Everything under `kube-prometheus-stack`, `loki` and `alloy` is passed to those charts.

Alertmanager routes everything to the `null` receiver. `values.yaml` contains a commented email receiver to copy when a real destination exists.

## GKE Autopilot adaptations

Autopilot rejects privileged pods, host namespaces and most hostPath mounts, manages the control plane, and treats `kube-system` as a managed namespace.

- **node-exporter disabled.** It needs hostNetwork, hostPID and hostPath. Its default rules and dashboards are disabled too (`node`, `nodeExporter*`, `kubePrometheusNodeRecording`, `network`).
- **Control-plane scraping disabled:** kubeControllerManager, kubeScheduler, kubeEtcd and kubeProxy, plus their rule groups. That prevents permanently firing `*Down` alerts.
- **coreDns/kubeDns ServiceMonitors disabled.** Both create Services in `kube-system`. They are disabled as a precaution; a rejection by Autopilot was not observed.
- **Kubelet/cAdvisor kept, with the operator's kubelet Service in `monitoring` instead of `kube-system`.** This is expected to work but is unverified on Autopilot; it was tested only on k3d. Three things depend on Prometheus reaching node IP:10250: the CPU/memory panels, `BeermapPVCAlmostFull` (`kubelet_volume_stats_*`), and the default `KubeletDown` alert, which fires permanently if the scrape fails. Fallback: scrape cAdvisor through the API server proxy (`/api/v1/nodes/<node>/proxy/metrics/cadvisor`).
- **Admission webhooks disabled.** That removes two cert-patch Jobs and cluster-wide webhook configurations.
- **Alloy as a single-replica Deployment using `loki.source.kubernetes`.** This tails container logs through the Kubernetes API (`pods/log`) instead of reading `/var/log/pods` from the node. It avoids hostPath and a per-node DaemonSet, which Autopilot would bill on every node. That is sufficient at this scale. Collection is limited to the `beermap` and `monitoring` namespaces. The trade-off is that every log stream goes through the API server; at high volume, switch to a DaemonSet with the allowlisted read-only `/var/log` mount.
- **Loki trimmed to one pod:** no gateway, no memcached caches, no canary DaemonSet, no test pod, no rules sidecar.
- **Resource requests on every container.**
- **No host access in the rendered output.** `helm template` contains no `hostPath`, `hostNetwork: true`, `hostPID` or `privileged: true`. The only matches are Grafana's `privileged: false` and Alloy's `hostNetwork: false`.

## Storage and retention

- Prometheus: 10Gi PVC, `retention: 7d`, `retentionSize: 8GB`.
- Loki: 10Gi PVC (default StorageClass), `retention_period: 168h` enforced by the compactor.
- Alertmanager and Grafana: no PVC. Silences are lost on restart, and Grafana state is fully provisioned.

Upgrade path for Loki: switch `loki.storage.type` to `gcs` with a bucket and a Workload Identity-bound service account. Keep monolithic mode until volume demands more.

## Cost note

Autopilot bills pod resource requests, not node capacity. The requests in `values.yaml` total about 0.5 vCPU and 1.8 GiB across 7 pods, plus 20 GiB of PD. Autopilot enforces per-pod minimums and a CPU:memory ratio, so it may raise some requests; check `kubectl get pods -o yaml` after install. See [GKE docs: resource requests in Autopilot](https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-resource-requests).

## Follow-ups

- The app has no `/metrics` endpoint, so there is no ServiceMonitor for it. Add `prom-client` with a `/metrics` route, then a ServiceMonitor (label `release: beermap-observability`), and HTTP latency/error-rate alerts.
- Tracing: OpenTelemetry SDK in the app, plus Tempo (`grafana-community/tempo`) as a further dependency.

## Validation

```sh
helm dependency build .
helm lint . --namespace monitoring
helm template beermap-observability . --namespace monitoring --kube-version 1.34.0 > /tmp/rendered.yaml
kubeconform -strict -summary -kubernetes-version 1.34.0 \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  -ignore-missing-schemas /tmp/rendered.yaml
grep -nE 'hostPath|hostNetwork|hostPID|privileged' /tmp/rendered.yaml
```
