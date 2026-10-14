#!/usr/bin/env bash
set -euo pipefail
/usr/bin/time -p bash -c 'cd "$(dirname "$0")"'
cd "$(dirname "$0")"
if [[ -z "${CAPTURE_URL:-}" ]]; then
  /usr/bin/time -p echo "CAPTURE_URL is required" >&2
  exit 1
fi
if [[ -z "${CAPTURE_DIR:-}" ]]; then
  /usr/bin/time -p echo "CAPTURE_DIR is required" >&2
  exit 1
fi
/usr/bin/time -p echo "CAPTURE_URL=$CAPTURE_URL"
/usr/bin/time -p echo "CAPTURE_DIR=$CAPTURE_DIR"
/usr/bin/time -p mkdir -p "$CAPTURE_DIR"
SESSION="capture-$$"
/usr/bin/time -p echo "SESSION=$SESSION"
close_browser() {
  /usr/bin/time -p playwright-cli -s="$SESSION" close || true
}
trap close_browser EXIT
# Open the exact URL in our own browser session (system Chrome; channel chromium bundle is not installed).
/usr/bin/time -p playwright-cli -s="$SESSION" open --browser chrome "$CAPTURE_URL" || exit 75
# Wait for rendered content: fonts + non-trivial body text.
/usr/bin/time -p sleep 3
BODY_LEN="$(/usr/bin/time -p playwright-cli -s="$SESSION" eval "() => document.body ? document.body.innerText.length : 0" --raw 2>/dev/null || echo 0)"
/usr/bin/time -p echo "body_len=$BODY_LEN"
if ! [[ "$BODY_LEN" =~ ^[0-9]+$ ]] || [[ "$BODY_LEN" -lt 50 ]]; then
  /usr/bin/time -p echo "rendering defect: body text too short ($BODY_LEN)" >&2
  exit 1
fi
# Desktop 1440x900.
/usr/bin/time -p playwright-cli -s="$SESSION" resize 1440 900 || exit 75
/usr/bin/time -p sleep 2
/usr/bin/time -p playwright-cli -s="$SESSION" screenshot --filename="$CAPTURE_DIR/final-desktop.png" || exit 75
/usr/bin/time -p test -s "$CAPTURE_DIR/final-desktop.png" || exit 1
# Mobile 390x844.
/usr/bin/time -p playwright-cli -s="$SESSION" resize 390 844 || exit 75
/usr/bin/time -p sleep 2
/usr/bin/time -p playwright-cli -s="$SESSION" screenshot --filename="$CAPTURE_DIR/final-mobile.png" || exit 75
/usr/bin/time -p test -s "$CAPTURE_DIR/final-mobile.png" || exit 1
# Guard against blank captures (<5KB usually means blank canvas).
/usr/bin/time -p ls -l "$CAPTURE_DIR/final-desktop.png" "$CAPTURE_DIR/final-mobile.png"
/usr/bin/time -p echo "capture complete; leaving app running"
trap - EXIT
/usr/bin/time -p playwright-cli -s="$SESSION" close || true
