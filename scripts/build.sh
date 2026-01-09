#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

pushd "$ROOT_DIR/frontend" >/dev/null
npm install
npm run build
popd >/dev/null

rm -rf "$ROOT_DIR/backend/server/static"/*
mkdir -p "$ROOT_DIR/backend/server/static"
cp -R "$ROOT_DIR/frontend/dist"/* "$ROOT_DIR/backend/server/static/"

echo "Frontend assets copied to backend/server/static"
