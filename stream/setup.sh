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

echo "==> Installing the study-desk service (starts on boot, restarts on crash)"
sudo tee /etc/systemd/system/study-desk.service >/dev/null <<EOF
[Unit]
Description=Visualgorithm Study Desk 24/7 stream
After=network-online.target
Wants=network-online.target

[Service]
User=$USER
WorkingDirectory=$HERE
ExecStart=/bin/bash $HERE/start-stream.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable study-desk

cat <<EOF

Done. Next:
  1. nano $HERE/stream.conf          (paste your stream key)
  2. sudo systemctl start study-desk  (go live)
  3. journalctl -u study-desk -f      (watch the logs, Ctrl+C to stop watching)
EOF
