param([Parameter(Mandatory)][string]$Project, [string]$OpenSsl = 'openssl')
$ErrorActionPreference = 'Stop'
$name = 'beer-map-internal-tls'
$versions = gcloud secrets versions list $name --project=$Project --filter=state:ENABLED --format='value(name)' --limit=1
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect internal TLS secret' }
$temporary = Join-Path ([IO.Path]::GetTempPath()) ("beer-map-tls-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $temporary | Out-Null
try {
    if (-not (Get-Command $OpenSsl -ErrorAction SilentlyContinue)) {
        $gitOpenSsl = 'C:/Program Files/Git/usr/bin/openssl.exe'
        if ($OpenSsl -eq 'openssl' -and (Test-Path -LiteralPath $gitOpenSsl)) { $OpenSsl = $gitOpenSsl }
        else { throw 'Install OpenSSL or supply -OpenSsl with its executable path' }
    }
    $certificate = Join-Path $temporary 'tls.crt'
    $key = Join-Path $temporary 'tls.key'
    if (-not $versions) {
        # Explicitly trusted, short-lived demonstration certificate. SANs cover
        # both internal endpoints; no private key enters a manifest or TF state.
        & $OpenSsl req -x509 -newkey rsa:3072 -sha256 -days 30 -nodes -keyout $key -out $certificate `
            -subj '/CN=beer-map-internal' `
            -addext 'subjectAltName=DNS:holmes,DNS:holmes.observability.svc,DNS:holmes.observability.svc.cluster.local,DNS:alert-investigation,DNS:alert-investigation.observability.svc,DNS:alert-investigation.observability.svc.cluster.local' *> $null
        if ($LASTEXITCODE -ne 0) { throw 'TLS certificate generation failed' }
        $payload = @{'tls.crt'=[IO.File]::ReadAllText($certificate);'tls.key'=[IO.File]::ReadAllText($key);'ca.crt'=[IO.File]::ReadAllText($certificate)} | ConvertTo-Json -Compress
        $bundle = Join-Path $temporary 'bundle.json'
        [IO.File]::WriteAllText($bundle, $payload, [Text.UTF8Encoding]::new($false))
        $null = gcloud secrets versions add $name --project=$Project --data-file=$bundle
        if ($LASTEXITCODE -ne 0) { throw 'Cannot save internal TLS credentials' }
    }
    $payload = gcloud secrets versions access latest --secret=$name --project=$Project
    if ($LASTEXITCODE -ne 0) { throw 'Cannot read internal TLS credentials' }
    $data = ($payload -join "`n") | ConvertFrom-Json -AsHashtable
    foreach ($file in @('tls.crt', 'tls.key', 'ca.crt')) {
        if (-not $data[$file]) { throw "Missing TLS file $file" }
        [IO.File]::WriteAllText((Join-Path $temporary $file), $data[$file], [Text.UTF8Encoding]::new($false))
    }
    & $OpenSsl x509 -checkend 86400 -noout -in $certificate *> $null
    if ($LASTEXITCODE -ne 0) { throw 'Renew the demonstration certificate before remounting; see the GCP runbook' }
    kubectl -n observability create secret generic $name --from-file="tls.crt=$certificate" --from-file="tls.key=$key" --from-file="ca.crt=$(Join-Path $temporary 'ca.crt')" --dry-run=client -o json |
        kubectl -n observability apply --server-side --field-manager=beer-map-platform -f -
    if ($LASTEXITCODE -ne 0) { throw 'Cannot mount internal TLS credentials' }
    Write-Output 'Mounted internal TLS credentials'
} finally {
    $payload = $null; $data = $null
    $resolved = [IO.Path]::GetFullPath($temporary)
    $expected = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) 'beer-map-tls-'))
    if (-not $resolved.StartsWith($expected, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected TLS cleanup path' }
    Remove-Item -LiteralPath $resolved -Recurse -Force
}
