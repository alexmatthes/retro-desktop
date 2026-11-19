# Visualgorithm Study Desk (starter)

A fake retro desktop that runs in a browser and gets streamed 24/7.
It's a fixed 1280x720 "screen" that scales to fit any window.

## What's in here

| File | What it does |
|---|---|
| `index.html` | The layout: icons, windows, gadgets, taskbar |
| `css/desktop.css` | Wallpaper, positions, taskbar, gadget styling |
| `css/7.css` | Open-source Vista/7-style window frames (MIT license, see `7.css.LICENSE`) |
| `js/config.js` | **Edit this**: time zone, timer lengths, weather city, notes text |
| `js/playlist.js` | **Edit this**: your list of music files |
| `js/desktop.js` | The logic: clocks, timer, music player, visualizer, weather |
| `music/` | Your audio files go here |

## Run it locally

Browsers block some audio features on pages opened straight from a file, so serve the folder:

```bash
cd retro-desktop
python3 -m http.server 8080
```

Then open http://localhost:8080 and click once to start the audio
(the stream machine skips the click; see below).

## Adding music

1. Copy files into `music/`.
2. Add a line for each in `js/playlist.js`:
   ```js
   { file: "music/rainy-window.mp3", title: "Rainy Window", artist: "Someone" },
   ```
The player shuffles, plays everything, reshuffles and loops forever. A broken file gets skipped.

## How the study timer works

It's tied to the clock, not to when the page loaded. With 50/10 it's focus from :00 to :50 and a
break from :50 to :00 every hour, so every viewer sees the same thing and a restart doesn't reset it.

## Running it On another Machine

`stream.conf` (your stream key) and the music files are in `.gitignore`, so the repo is safe to make public.

```bash
cd retro-desktop
git init && git add . && git commit -m "Study desk starter"
# create an empty repo on github.com named study-desk, then:
git remote add origin https://github.com/YOUR-NAME/study-desk.git
git branch -M main && git push -u origin main
```

## Set up the Other Machine

```bash
git clone https://github.com/YOUR-NAME/study-desk.git ~/study-desk
cd ~/study-desk
bash stream/setup.sh             # installs Xvfb, PulseAudio, ffmpeg, fonts, Chrome + the service
nano stream/stream.conf          # paste your YouTube stream key
```

Copy your music over from your machine:

```bash
scp music/* YOUR-USER@OPTIPLEX-IP:~/study-desk/music/
```

## Running it

| Do this | Command (on the OptiPlex) |
|---|---|
| Go live | `sudo systemctl start study-desk` |
| Stop | `sudo systemctl stop study-desk` |
| Watch logs | `journalctl -u study-desk -f` |
| Load changes you pushed to GitHub | `bash stream/refresh.sh` |

It starts by itself on boot and restarts itself after crashes or internet drops.

**Is the PC keeping up?** Every minute the log prints `[encoder] speed 1x`. If it drops below about
0.95x, the OptiPlex is too slow at the current settings. In `stream/stream.conf`, try `X264_PRESET=superfast`,
then `FPS=24`, then `ultrafast`. Lowering `vizFps` in `js/config.js` also helps.

**Test without going live:** set `TEST_OUTPUT="/tmp/test.flv"` in `stream.conf`, run
`bash stream/start-stream.sh` for a minute, press Ctrl+C, then copy `/tmp/test.flv` to your laptop and watch it.
Or do your first real run as an **Unlisted** stream in YouTube Studio.
