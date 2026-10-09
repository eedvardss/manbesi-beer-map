#!/bin/sh
set -eu
# Destructive tests run only in this disposable local cluster, never in GCP.
name=beer-map-ci
export KUBECONFIG="${RUNNER_TEMP:-/tmp}/beer-map-ci-kubeconfig"
unset HELM_DRIVER
trap 'kind delete cluster --name "$name"' EXIT
kind create cluster --name "$name" --wait 120s
kind load docker-image beer-map:local --name "$name"
kubectl create namespace beer-map
kubectl -n beer-map create secret generic beer-map-db-admin --from-literal="password=$(openssl rand -hex 32)"
kubectl -n beer-map create secret generic beer-map-db-reader --from-literal="password=$(openssl rand -hex 32)"
helm install beer-map-db charts/beer-map-db -n beer-map --wait --timeout 3m
helm install beer-map charts/beer-map -n beer-map --wait --timeout 3m
helm test beer-map -n beer-map --timeout 1m
helm upgrade beer-map charts/beer-map -n beer-map --wait --rollback-on-failure --timeout 3m
helm test beer-map -n beer-map --timeout 1m
if helm upgrade beer-map charts/beer-map -n beer-map --set database.host=missing-db.invalid --wait --rollback-on-failure --timeout 30s; then
  echo 'A migration against an unavailable database unexpectedly succeeded' >&2
  exit 1
fi
kubectl -n beer-map rollout status deployment/beer-map --timeout=60s
helm test beer-map -n beer-map --timeout 1m
