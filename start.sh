#!/usr/bin/env bash
set -euo pipefail
/usr/bin/time -p bash -c 'cd "$(dirname "$0")"'
cd "$(dirname "$0")"
/usr/bin/time -p pwd
PORT="${PORT:-3000}"
/usr/bin/time -p echo "PORT=$PORT"
PROJECT_ROOT="$(pwd)"
/usr/bin/time -p echo "PROJECT_ROOT=$PROJECT_ROOT"
DIST="$PROJECT_ROOT/dist"
/usr/bin/time -p mkdir -p "$DIST"
# Install dependencies when a package manifest exists (no-op for pure static).
if [[ -f "$PROJECT_ROOT/package.json" ]]; then
  /usr/bin/time -p npm install --no-audit --no-fund --prefix "$PROJECT_ROOT"
  if /usr/bin/time -p npm --prefix "$PROJECT_ROOT" run | grep -q " build"; then
    /usr/bin/time -p npm --prefix "$PROJECT_ROOT" run build
  fi
else
  /usr/bin/time -p echo "no package.json; static build step"
fi
# Build when needed: sync src/ -> dist/ (source stays inside PROJECT_DIR).
if [[ -f "$PROJECT_ROOT/src/index.html" ]]; then
  /usr/bin/time -p mkdir -p "$DIST"
  /usr/bin/time -p cp -f "$PROJECT_ROOT/src/index.html" "$DIST/index.html"
  /usr/bin/time -p cp -f "$PROJECT_ROOT/src/styles.css" "$DIST/styles.css"
  /usr/bin/time -p cp -f "$PROJECT_ROOT/src/app.js" "$DIST/app.js"
fi
/usr/bin/time -p test -f "$DIST/index.html"
WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
/usr/bin/time -p mkdir -p "$WEB_DIR"
/usr/bin/time -p printf '{"project":"%s","directory":"%s"}' "$PROJECT_ROOT" "$DIST" > "$WEB_DIR/deployment-output.json"
/usr/bin/time -p cat "$WEB_DIR/deployment-output.json"
# Serve built static directory in the foreground (controller reuses healthy server).
/usr/bin/time -p echo "serving $DIST on port $PORT"
exec /usr/bin/time -p python3 -m http.server "$PORT" --directory "$DIST"
