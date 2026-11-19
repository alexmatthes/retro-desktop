#!/usr/bin/env bash
# Runs the whole 24/7 stream on a machine with no monitor:
#
#   Xvfb (virtual screen) -> Chrome showing the desktop page -> ffmpeg -> YouTube
#   PulseAudio (virtual speaker) carries the music from Chrome to ffmpeg.
#
# Chrome and ffmpeg restart themselves if they crash or the internet drops.
# If one of the core pieces (screen, audio, web server) dies, this script exits and
# systemd restarts everything.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_DIR="$(dirname "$HERE")"
CONF="$HERE/stream.conf"
STATE="$HOME/.retro-desktop"

log() { echo "[$(date '+%F %T')] $*"; }
die() { log "ERROR: $*"; exit 1; }

[[ $EUID -ne 0 ]] || die "Run this as your normal user, not root."
[[ -f $CONF ]] || die "Missing $CONF. Copy stream.conf.example to stream.conf and add your stream key."
# shellcheck source=/dev/null
source "$CONF"
: "${WIDTH:=1280}" "${HEIGHT:=720}" "${FPS:=30}" "${VIDEO_BITRATE:=2500k}" "${X264_PRESET:=veryfast}"
: "${AUDIO_BITRATE:=128k}" "${PORT:=8765}" "${CHROME_RESTART_HOURS:=24}" "${CHROME_EXTRA_FLAGS:=}" "${TEST_OUTPUT:=}"
: "${RTMP_URL:=rtmps://a.rtmps.youtube.com/live2}" "${STREAM_KEY:=}"

if [[ -z $TEST_OUTPUT ]]; then
  [[ -n $STREAM_KEY && $STREAM_KEY != "paste-your-key-here" ]] || die "Set STREAM_KEY in $CONF (or set TEST_OUTPUT to test)."
  OUTPUT="${RTMP_URL%/}/${STREAM_KEY}"
else
  OUTPUT="$TEST_OUTPUT"
fi

CHROME=""
for c in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$c" >/dev/null; then CHROME="$(command -v "$c")"; break; fi
done
[[ -n $CHROME ]] || die "No Chrome/Chromium found. Run setup.sh first."

mkdir -p "$STATE"
export DISPLAY=":99"
export XDG_RUNTIME_DIR="/tmp/retro-desktop-run-$(id -u)"
mkdir -p -m 700 "$XDG_RUNTIME_DIR"

# When this script exits for any reason, take every child process down with it.
trap 'trap - EXIT INT TERM; log "Stopping everything"; kill 0 2>/dev/null' EXIT
trap 'exit 0' INT TERM

# ---------- 1. Virtual screen ----------
if [[ -e /tmp/.X99-lock ]] && ! kill -0 "$(tr -d ' ' < /tmp/.X99-lock)" 2>/dev/null; then
  rm -f /tmp/.X99-lock /tmp/.X11-unix/X99   # left over from a crash
fi
Xvfb "$DISPLAY" -screen 0 "${WIDTH}x${HEIGHT}x24" -nolisten tcp -nocursor >"$STATE/xvfb.log" 2>&1 &
XVFB_PID=$!
for _ in $(seq 50); do [[ -S /tmp/.X11-unix/X99 ]] && break; sleep 0.2; done
[[ -S /tmp/.X11-unix/X99 ]] || die "Virtual screen didn't start."
log "Virtual screen ready (${WIDTH}x${HEIGHT})"

# ---------- 2. Virtual speaker ----------
pulseaudio --kill >/dev/null 2>&1
pulseaudio --daemonize=no --exit-idle-time=-1 -n \
  --load="module-native-protocol-unix" \
  --load="module-null-sink sink_name=stream sink_properties=device.description=RetroDesktop" \
  >"$STATE/pulseaudio.log" 2>&1 &
PULSE_PID=$!
for _ in $(seq 50); do pactl info >/dev/null 2>&1 && break; sleep 0.2; done
pactl info >/dev/null 2>&1 || die "Audio server didn't start (see $STATE/pulseaudio.log)."
pactl set-default-sink stream
log "Virtual speaker ready"

# ---------- 3. Local web server for the page (only reachable from this machine) ----------
port_open() { (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; }
if port_open; then
  die "Port $PORT is already used by another program (see: sudo ss -ltnp | grep :$PORT). Set a different PORT in $CONF."
fi
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$SITE_DIR" >"$STATE/webserver.log" 2>&1 &
WEB_PID=$!
for _ in $(seq 50); do port_open && break; sleep 0.2; done
kill -0 "$WEB_PID" 2>/dev/null && port_open || die "Web server didn't start (see $STATE/webserver.log)."
log "Web server ready on port $PORT"

# ---------- 4. Browser (restarts on crash, and every CHROME_RESTART_HOURS) ----------
browser_loop() {
  while true; do
    log "Starting browser"
    # shellcheck disable=SC2086
    PULSE_SINK=stream timeout --kill-after=20 "${CHROME_RESTART_HOURS}h" "$CHROME" \
      --kiosk --no-first-run --noerrdialogs --disable-infobars --disable-session-crashed-bubble \
      --disable-features=Translate,MediaRouter --disable-gpu --hide-scrollbars \
      --autoplay-policy=no-user-gesture-required --password-store=basic \
      --check-for-update-interval=31536000 \
      --window-position=0,0 --window-size="${WIDTH},${HEIGHT}" \
      --user-data-dir="$STATE/chrome-profile" \
      $CHROME_EXTRA_FLAGS \
      "http://127.0.0.1:${PORT}/" >"$STATE/chrome.log" 2>&1
    log "Browser exited (code $?), restarting in 3s"
    sleep 3
  done
}
browser_loop &

# ---------- 5. Encoder -> YouTube (restarts if the connection drops) ----------
encoder_loop() {
  local kbps="${VIDEO_BITRATE%k}"
  while true; do
    log "Starting encoder -> ${TEST_OUTPUT:-YouTube}"
    ffmpeg -hide_banner -loglevel error -nostdin -y -progress pipe:1 -stats_period 60 \
      -thread_queue_size 1024 -f x11grab -draw_mouse 0 -framerate "$FPS" -video_size "${WIDTH}x${HEIGHT}" -i "$DISPLAY" \
      -thread_queue_size 1024 -f pulse -i stream.monitor \
      -c:v libx264 -preset "$X264_PRESET" -pix_fmt yuv420p \
      -b:v "$VIDEO_BITRATE" -maxrate "$VIDEO_BITRATE" -bufsize "$((kbps * 2))k" \
      -g "$((FPS * 2))" -keyint_min "$((FPS * 2))" -sc_threshold 0 \
      -c:a aac -b:a "$AUDIO_BITRATE" -ar 44100 -ac 2 \
      -f flv "$OUTPUT" \
      | awk -F= '/^speed=/ { print "[encoder] speed " $2 "  (should stay at ~1x; lower means the PC can'"'"'t keep up)"; fflush() }'
    log "Encoder exited (code ${PIPESTATUS[0]}), restarting in 5s"
    sleep 5
  done
}
encoder_loop &

log "Retro Desktop is live. Logs: journalctl -u retro-desktop -f   (browser log: $STATE/chrome.log)"

# If a core piece dies, exit so systemd restarts the whole thing cleanly.
wait -n "$XVFB_PID" "$PULSE_PID" "$WEB_PID"
kill -0 "$XVFB_PID"  2>/dev/null || die "Virtual screen stopped (see $STATE/xvfb.log). Restarting."
kill -0 "$PULSE_PID" 2>/dev/null || die "Audio server stopped (see $STATE/pulseaudio.log). Restarting."
kill -0 "$WEB_PID"   2>/dev/null || die "Web server stopped (see $STATE/webserver.log). Restarting."
die "A core process stopped. Restarting."
