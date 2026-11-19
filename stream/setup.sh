#!/usr/bin/env bash
# One-time setup for the stream machine (Ubuntu). Run as your normal user:
#   bash stream/setup.sh
# It will ask for your password for the parts that need sudo.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ $EUID -ne 0 ]] || { echo "Run as your normal user (not with sudo)."; exit 1; }

echo "==> Installing packages"
sudo apt-get update
sudo apt-get install -y xvfb pulseaudio pulseaudio-utils ffmpeg python3 git curl \
  fonts-noto-core fonts-dejavu-core

if ! command -v google-chrome >/dev/null && ! command -v chromium >/dev/null; then
  echo "==> Installing Google Chrome"
  [[ $(dpkg --print-architecture) == amd64 ]] || { echo "Chrome needs a 64-bit (amd64) Ubuntu."; exit 1; }
  curl -fL -o /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  sudo apt-get install -y /tmp/chrome.deb
  rm -f /tmp/chrome.deb
fi

if [[ ! -f $HERE/stream.conf ]]; then
  cp "$HERE/stream.conf.example" "$HERE/stream.conf"
  echo "==> Created stream/stream.conf. Put your stream key in it before starting."
fi
chmod 600 "$HERE/stream.conf"
chmod +x "$HERE"/*.sh

# Older versions of this project called the service "study-desk". Remove it so two streams never run at once.
if [[ -f /etc/systemd/system/study-desk.service ]]; then
  echo "==> Removing the old study-desk service (renamed to retro-desktop)"
  sudo systemctl disable --now study-desk || true
  sudo rm -f /etc/systemd/system/study-desk.service
  rm -rf "$HOME/.study-desk"
fi

echo "==> Installing the retro-desktop service (starts on boot, restarts on crash)"
sudo tee /etc/systemd/system/retro-desktop.service >/dev/null <<EOF
[Unit]
Description=Visualgorithm Retro Desktop 24/7 stream
After=network-online.target
Wants=network-online.target

[Service]
User=$USER
WorkingDirectory=$HERE
ExecStart=/bin/bash $HERE/start-stream.sh
Restart=always
RestartSec=10
# Lower priority than everything else, so Klipper and other services always come first
Nice=10

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable retro-desktop

cat <<EOF

Done. Next:
  1. nano $HERE/stream.conf          (paste your stream key)
  2. sudo systemctl start retro-desktop  (go live)
  3. journalctl -u retro-desktop -f      (watch the logs, Ctrl+C to stop watching)
EOF
