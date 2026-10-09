#!/bin/sh
set -eu
# Download release archives and verify the publisher's SHA256 manifest before use.
tools="${RUNNER_TEMP:-/tmp}/beer-map-tools"
mkdir -p "$tools"
fetch() {
  repo="$1"; version="$2"; archive="$3"; checksums="$4"
  base="https://github.com/$repo/releases/download/v$version"
  curl -fsSL "$base/$archive" -o "$tools/$archive"
  curl -fsSL "$base/$checksums" -o "$tools/$checksums"
  (cd "$tools" && grep " $archive\$" "$checksums" | sha256sum --check --strict)
}
fetch terraform-linters/tflint 0.64.0 tflint_linux_amd64.zip checksums.txt
unzip -oq "$tools/tflint_linux_amd64.zip" -d "$tools"
fetch aquasecurity/trivy 0.75.0 trivy_0.75.0_Linux-64bit.tar.gz trivy_0.75.0_checksums.txt
tar -xzf "$tools/trivy_0.75.0_Linux-64bit.tar.gz" -C "$tools" trivy
fetch gitleaks/gitleaks 8.30.1 gitleaks_8.30.1_linux_x64.tar.gz gitleaks_8.30.1_checksums.txt
tar -xzf "$tools/gitleaks_8.30.1_linux_x64.tar.gz" -C "$tools" gitleaks
fetch rhysd/actionlint 1.7.12 actionlint_1.7.12_linux_amd64.tar.gz actionlint_1.7.12_checksums.txt
tar -xzf "$tools/actionlint_1.7.12_linux_amd64.tar.gz" -C "$tools" actionlint
for spec in terraform:1.16.5 helm:4.3.0; do
  name="${spec%:*}"; version="${spec#*:}"
  if [ "$name" = terraform ]; then
    base="https://releases.hashicorp.com/terraform/$version"
    archive="terraform_${version}_linux_amd64.zip"
    curl -fsSL "$base/$archive" -o "$tools/$archive"
    curl -fsSL "$base/terraform_${version}_SHA256SUMS" -o "$tools/terraform.sha256"
    (cd "$tools" && grep " $archive\$" terraform.sha256 | sha256sum --check --strict)
    unzip -oq "$tools/$archive" -d "$tools"
  else
    archive="helm-v${version}-linux-amd64.tar.gz"
    curl -fsSL "https://get.helm.sh/$archive" -o "$tools/$archive"
    curl -fsSL "https://get.helm.sh/$archive.sha256sum" -o "$tools/helm.sha256"
    (cd "$tools" && sha256sum --check --strict helm.sha256)
    tar -xzf "$tools/$archive" -C "$tools" linux-amd64/helm
    mv "$tools/linux-amd64/helm" "$tools/helm"
  fi
done
echo "$tools" >> "$GITHUB_PATH"
base="https://dl.k8s.io/release/v1.36.5/bin/linux/amd64"
curl -fsSL "$base/kubectl" -o "$tools/kubectl"
curl -fsSL "$base/kubectl.sha256" -o "$tools/kubectl.sha256"
(cd "$tools" && printf '%s  kubectl\n' "$(cat kubectl.sha256)" | sha256sum --check --strict)
curl -fsSL https://kind.sigs.k8s.io/dl/v0.33.0/kind-linux-amd64 -o "$tools/kind"
curl -fsSL https://kind.sigs.k8s.io/dl/v0.33.0/kind-linux-amd64.sha256sum -o "$tools/kind.sha256"
(cd "$tools" && sed 's/kind-linux-amd64$/kind/' kind.sha256 | sha256sum --check --strict)
chmod +x "$tools/kubectl" "$tools/kind"
