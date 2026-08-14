#!/usr/bin/env bash
set -euo pipefail
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT
base=https://download.geonames.org/export/dump
echo "Lade GeoNames cities500 (alle Länder, Orte >500 Einwohner und Verwaltungssitze) …"
curl -fL "$base/cities500.zip" -o "$work_dir/cities500.zip"
curl -fL "$base/countryInfo.txt" -o "$work_dir/countryInfo.txt"
python3 -m zipfile -e "$work_dir/cities500.zip" "$work_dir"
node scripts/import-geonames.js "$work_dir/cities500.txt" "$work_dir/countryInfo.txt"
