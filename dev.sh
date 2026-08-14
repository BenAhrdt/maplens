#!/usr/bin/env bash
set -euo pipefail
export PORT="${PORT:-8000}"
export SESSION_SECRET="${SESSION_SECRET:-dev-only-secret-change-for-production}"
exec npm run dev
