#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if ! command -v pnpm >/dev/null 2>&1; then
	echo "pnpm is required to launch the pi-desktop preview server." >&2
	exit 1
fi

exec pnpm dev:web
