#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

PORT="${PORT:-3000}"
if [[ ! "$PORT" =~ ^[1-9][0-9]*$ ]] || ((PORT > 65535)); then
  echo "PORT must be an integer between 1 and 65535 (received: $PORT)." >&2
  exit 1
fi

DIST_DIR="$PROJECT_DIR/dist"
DEPLOY_DIR="${OPENCODE_WEB_DIR:-${RUNNER_TEMP:-/home/runner/work/_temp}/omgithub-web}"
DEPLOY_FILE="$DEPLOY_DIR/deployment-output.json"

timed() {
  local label="$1"
  shift
  local started finished status
  started="$(date +%s%3N)"
  set +e
  "$@"
  status=$?
  set -e
  finished="$(date +%s%3N)"
  printf '[timing] %s: %d ms\n' "$label" "$((finished - started))"
  return "$status"
}

install_dependencies() {
  if [[ -f "$PROJECT_DIR/package-lock.json" ]]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
}

build_app() {
  npm run build
  [[ -f "$DIST_DIR/index.html" ]] || {
    echo "Build did not produce $DIST_DIR/index.html." >&2
    return 1
  }
}

write_deployment_metadata() {
  mkdir -p "$DEPLOY_DIR"
  printf '{"project":"%s","directory":"%s"}\n' "$PROJECT_DIR" "$DIST_DIR" > "$DEPLOY_FILE"
}

timed "install dependencies" install_dependencies
timed "build static app" build_app
timed "write deployment metadata" write_deployment_metadata

echo "Serving $DIST_DIR at http://0.0.0.0:$PORT"
timed "serve static app" "$PROJECT_DIR/node_modules/.bin/vite" preview --host 0.0.0.0 --port "$PORT" --strictPort
