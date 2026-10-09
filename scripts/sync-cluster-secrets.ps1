param([Parameter(Mandatory)][string]$Project)
$ErrorActionPreference = 'Stop'
# Run only as the trusted platform operator. Never print secret payloads.
# Access denial must fail rather than silently rotate a working database password.
foreach ($namespace in @('beer-map', 'observability')) {
    kubectl create namespace $namespace --dry-run=client -o yaml | kubectl apply -f -
    if ($LASTEXITCODE -ne 0) { throw 'Namespace creation failed' }
}
& (Join-Path $PSScriptRoot 'initialize-internal-tls.ps1') -Project $Project
$secrets = @(
    @{Name='beer-map-db-admin';Namespace='beer-map';Key='password'},
    @{Name='beer-map-db-reader';Namespace='beer-map';Key='password'},
    @{Name='beer-map-grafana-admin';Namespace='observability';Key='password'},
    @{Name='beer-map-holmes-api';Namespace='observability';Key='api-key'}
)
foreach ($secret in $secrets) {
    $versions = gcloud secrets versions list $secret.Name --project=$Project --filter=state:ENABLED --format='value(name)' --limit=1
    if ($LASTEXITCODE -ne 0) { throw "Cannot inspect $($secret.Name)" }
    $temporary = Join-Path ([IO.Path]::GetTempPath()) ([IO.Path]::GetRandomFileName())
    try {
        if (-not $versions) {
            $payload = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
            [IO.File]::WriteAllText($temporary, $payload, [Text.UTF8Encoding]::new($false))
            $null = gcloud secrets versions add $secret.Name --project=$Project --data-file=$temporary
            if ($LASTEXITCODE -ne 0) { throw "Cannot initialize $($secret.Name)" }
        }
        $payload = gcloud secrets versions access latest --secret=$($secret.Name) --project=$Project
        if ($LASTEXITCODE -ne 0) { throw "Cannot read $($secret.Name)" }
        [IO.File]::WriteAllText($temporary, ($payload -join "`n"), [Text.UTF8Encoding]::new($false))
        # No --from-literal: payloads must not enter process arguments or console history.
        kubectl -n $secret.Namespace create secret generic $secret.Name --from-file="$($secret.Key)=$temporary" --dry-run=client -o json |
            kubectl -n $secret.Namespace apply --server-side --field-manager=beer-map-platform -f -
        if ($LASTEXITCODE -ne 0) { throw "Cannot mount $($secret.Name)" }
        Write-Output "Synchronized $($secret.Name)"
    } finally {
        $payload = $null
        Remove-Item -LiteralPath $temporary -ErrorAction SilentlyContinue
    }
}
