# beermap-postgres

PostgreSQL 17 for the beer map in namespace `beermap`. It installs:

- StatefulSet `beermap-postgres` (1 replica) with a 10Gi PVC. `PGDATA` is a subdirectory of the volume.
- ClusterIP Service `beermap-postgres:5432`.
- NetworkPolicy: only pods labelled `beermap.io/postgres-client: "true"` may reach 5432. The app, its migration Job and the backup Job carry that label.
- Nightly backup CronJob (02:00 Europe/Riga) using KSA `beermap-backup` with Workload Identity.

Install it before `beermap-app`, because the app's pre-install migration hook needs the database:

```sh
helm upgrade --install --atomic -n beermap beermap-postgres infrastructure/helm/beermap-postgres \
  --set backup.bucket=${PROJECT_ID}-beermap-backups \
  --set backup.gcpServiceAccount=beermap-backup@${PROJECT_ID}.iam.gserviceaccount.com
```

The deploy job must create Secret `beermap-postgres-auth` (key `POSTGRES_PASSWORD`) beforehand.

## Values

| Value | Default | |
|---|---|---|
| `image` | `mirror.gcr.io/library/postgres:17-bookworm` | Server image, also used for `pg_dump` |
| `database`, `user` | `beer_map` | Database and superuser |
| `authSecret` | `beermap-postgres-auth` | Secret with `POSTGRES_PASSWORD` |
| `storage.size` | `10Gi` | PVC size |
| `storage.storageClassName` | `""` | Empty uses the cluster default (`standard-rwo` on Autopilot) |
| `resources` | 250m / 512Mi | Limits equal requests, as Autopilot enforces |
| `clientLabel.key/value` | `beermap.io/postgres-client` / `"true"` | Label a pod needs to connect |
| `backup.enabled` | `true` | |
| `backup.bucket` | required | `${project_id}-beermap-backups` |
| `backup.gcpServiceAccount` | required | GSA bound to KSA `beermap-backup` |
| `backup.uploadImage` | `mirror.gcr.io/curlimages/curl:8.16.0` | |

## Security

Everything runs as uid/gid 999 (the image's `postgres` user) with `fsGroup: 999`, a read-only root filesystem, no capabilities and the RuntimeDefault seccomp profile. The server writes only to the data volume and to emptyDirs at `/var/run/postgresql` and `/tmp`.

There is no PodDisruptionBudget. With one replica, `minAvailable: 1` would block node drains and `maxUnavailable: 1` would protect nothing.

## Backups

The backup is one Job pod with two stock images and no custom build:

1. Init container `dump` (the server image, so `pg_dump` matches the major version) runs `pg_dump | gzip` into an emptyDir as `beer_map-<UTC timestamp>.sql.gz`.
2. Container `upload` (curl) gets a token from the GKE metadata server and makes a single JSON API media upload to `gs://<bucket>/postgres/<file>` with `ifGenerationMatch=0`.

The GSA has only `roles/storage.objectCreator`. It cannot list, read or overwrite objects, so the upload must not probe the destination first, which `gcloud storage cp` may do. Use the bucket's lifecycle rules for retention.

To restore, download a dump with a reader account, then run `gunzip -c dump.sql.gz | psql -U beer_map -d beer_map` against an empty database.
