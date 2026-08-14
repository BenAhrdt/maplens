#!/usr/bin/env bash
set -euo pipefail
REPO="${MAPLENS_REPO:-BenAhrdt/maplens}"
if [[ $EUID -ne 0 ]]; then echo "Bitte als root ausführen, z. B. curl … | sudo bash"; exit 1; fi
command -v curl >/dev/null || { apt-get update; apt-get install -y curl ca-certificates; }
command -v sha256sum >/dev/null || { echo "sha256sum fehlt (Paket coreutils)."; exit 1; }
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT
base="https://github.com/$REPO/releases/latest/download"
echo "Lade aktuelles MapLens-Release …"
curl -fL "$base/maplens.tar.gz" -o "$work_dir/maplens.tar.gz"
curl -fL "$base/maplens.tar.gz.sha256" -o "$work_dir/maplens.tar.gz.sha256"
(cd "$work_dir" && sha256sum -c maplens.tar.gz.sha256)
mkdir "$work_dir/source"
tar -xzf "$work_dir/maplens.tar.gz" -C "$work_dir/source"
bash "$work_dir/source/install.sh"
