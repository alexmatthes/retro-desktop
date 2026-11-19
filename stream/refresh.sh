#!/usr/bin/env bash
# Pull the latest version from GitHub and reload the page on the live stream.
# The stream itself stays up; viewers see a few seconds of blank screen while the browser restarts.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
git -C "$(dirname "$HERE")" pull --ff-only
pkill -u "$(id -u)" -f -- "--user-data-dir=$HOME/.study-desk/chrome-profile" && echo "Browser restarting with the new version." \
  || echo "Browser wasn't running (is the stream on?)."
