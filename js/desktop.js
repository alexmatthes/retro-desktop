// Visualgorithm Study Desk - all the moving parts.
(() => {
  const C = window.DESKTOP_CONFIG;
  const PLAYLIST = window.PLAYLIST || [];
  const $ = (id) => document.getElementById(id);

  // ---------- Scale the 1280x720 stage to fit any window ----------
  function fit() {
    const s = Math.min(innerWidth / 1280, innerHeight / 720);
    document.documentElement.style.setProperty("--scale", s);
  }
  addEventListener("resize", fit);
  fit();

  // ---------- Static text ----------
  $("notes-text").textContent = C.notes.join("\n");
  $("watermark").textContent = C.watermark || "";

  // ---------- Time helpers (everything uses the configured time zone) ----------
  const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: C.timeZone, hour: "numeric", minute: "2-digit" });
  const dateFmt = new Intl.DateTimeFormat("en-US", { timeZone: C.timeZone, month: "numeric", day: "numeric", year: "numeric" });
  const partsFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: C.timeZone, hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23",
  });
  function zoned(d) {
    const o = {};
    for (const p of partsFmt.formatToParts(d)) if (p.type !== "literal") o[p.type] = Number(p.value);
    return o; // { hour, minute, second }
  }
  const mmss = (sec) => {
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // ---------- Analog clock gadget ----------
  const ticks = $("ticks");
  for (let i = 0; i < 60; i++) {
    const big = i % 5 === 0;
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", 50); l.setAttribute("y1", big ? 10 : 11.5);
    l.setAttribute("x2", 50); l.setAttribute("y2", 14);
    l.setAttribute("stroke", big ? "#2a3644" : "#8796a8");
    l.setAttribute("stroke-width", big ? 1.6 : 0.7);
    l.setAttribute("transform", `rotate(${i * 6} 50 50)`);
    ticks.appendChild(l);
  }
  const rot = (id, deg) => $(id).setAttribute("transform", `rotate(${deg} 50 50)`);

  // ---------- Study timer (synced to the clock) ----------
  const focusSec = C.focusMinutes * 60, breakSec = C.breakMinutes * 60, cycleSec = focusSec + breakSec;
  function updateTimer(now, z) {
    const t = (z.hour * 3600 + z.minute * 60 + z.second) % cycleSec;
    const inFocus = t < focusSec;
    const len = inFocus ? focusSec : breakSec;
    const into = inFocus ? t : t - focusSec;
    const left = len - into;
    const at = timeFmt.format(new Date(now.getTime() + left * 1000));

    $("timer").textContent = mmss(left);
    $("timer-progress").style.width = `${(into / len) * 100}%`;
    $("phase").textContent = inFocus ? "Focus session" : "Break time";
    $("timer-next").textContent = inFocus ? `Break at ${at}` : `Back to focus at ${at}`;
    $("timer-bar").classList.toggle("paused", !inFocus); // yellow bar on break
    $("timer-bar").parentElement.classList.toggle("on-break", !inFocus);
    $("task-timer").textContent = `${inFocus ? "Focus" : "Break"} - ${mmss(left)}`;
  }

  // ---------- One tick per second drives the clocks + timer ----------
  function tick() {
    const now = new Date();
    const z = zoned(now);
    $("tray-time").textContent = timeFmt.format(now);
    $("tray-date").textContent = dateFmt.format(now);
    rot("hand-h", (z.hour % 12) * 30 + z.minute * 0.5);
    rot("hand-m", z.minute * 6 + z.second * 0.1);
    rot("hand-s", z.second * 6);
    updateTimer(now, z);
  }
  tick();
  setTimeout(() => { tick(); setInterval(tick, 1000); }, 1000 - (Date.now() % 1000)); // line up with real seconds

  // ---------- Music player ----------
  const audio = new Audio();
  audio.preload = "auto";
  audio.volume = C.volume ?? 1;
  let order = [], pos = -1, lastIndex = -1;

  function shuffled(n) {
    const a = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (n > 1 && a[0] === lastIndex) [a[0], a[1]] = [a[1], a[0]]; // no back-to-back repeat across reshuffles
    return a;
  }

  function nextTrack() {
    if (!PLAYLIST.length) {
      $("track-title").textContent = "No tracks yet";
      $("track-artist").textContent = "Add music to the music folder and js/playlist.js";
      $("player-status").textContent = "Idle";
      return;
    }
    pos++;
    if (pos >= order.length) { order = shuffled(PLAYLIST.length); pos = 0; }
    lastIndex = order[pos];
    const tr = PLAYLIST[lastIndex];
    audio.src = tr.file;
    $("track-title").textContent = tr.title || tr.file.split("/").pop();
    $("track-artist").textContent = tr.artist || " ";
    $("player-count").textContent = `Track ${pos + 1} of ${PLAYLIST.length}`;
    $("track-progress").style.width = "0%";
    tryPlay();
  }

  function tryPlay() {
    audio.play().then(() => {
      $("audio-balloon").hidden = true;
      $("player-status").textContent = "Playing";
      setupAnalyser();
    }).catch(() => {
      // Normal browsers block autoplay until you click. The stream machine runs
      // Chromium with --autoplay-policy=no-user-gesture-required, so it never sees this.
      $("audio-balloon").hidden = false;
      $("player-status").textContent = "Waiting for click";
    });
  }

  audio.addEventListener("ended", nextTrack);
  audio.addEventListener("error", () => {
    if (!audio.src) return;
    $("player-status").textContent = "Skipping unreadable file";
    setTimeout(nextTrack, 2000);
  });
  audio.addEventListener("timeupdate", () => {
    const d = audio.duration;
    if (!isFinite(d) || d <= 0) return;
    $("track-progress").style.width = `${(audio.currentTime / d) * 100}%`;
    $("t-elapsed").textContent = mmss(audio.currentTime);
    $("t-total").textContent = mmss(d);
  });
  document.addEventListener("pointerdown", () => {
    if (actx && actx.state === "suspended") actx.resume();
    if (audio.src && audio.paused) tryPlay();
  });

  // Real visualizer needs the page served over http (python3 -m http.server).
  // Opened as a file://, routing audio through Web Audio can mute it, so we fake the bars instead.
  let actx = null, analyser = null, freq = null;
  function setupAnalyser() {
    if (analyser || location.protocol === "file:" || !window.AudioContext) return;
    try {
      actx = new AudioContext();
      const src = actx.createMediaElementSource(audio);
      analyser = actx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.78;
      src.connect(analyser);
      analyser.connect(actx.destination);
      freq = new Uint8Array(analyser.frequencyBinCount);
      if (actx.state === "suspended") actx.resume();
    } catch (e) { analyser = null; }
  }

  // ---------- Visualizer ----------
  const cv = $("viz"), g = cv.getContext("2d");
  const W = cv.width, H = cv.height, BARS = 32, GAP = 3;
  const bw = (W - GAP * (BARS + 1)) / BARS;
  const floorY = H * 0.78; // bars stand on this line; a faint reflection goes below
  const levels = new Float32Array(BARS), peaks = new Float32Array(BARS), fake = new Float32Array(BARS);
  const grad = g.createLinearGradient(0, floorY, 0, 0);
  grad.addColorStop(0, "#1f9b2b"); grad.addColorStop(0.55, "#4fe07a"); grad.addColorStop(1, "#bff7ff");

  function drawViz() {
    const playing = !audio.paused && !audio.ended;
    if (analyser && playing) {
      analyser.getByteFrequencyData(freq);
      for (let i = 0; i < BARS; i++) {
        const v = freq[Math.min(freq.length - 1, Math.floor(Math.pow(i / BARS, 1.4) * freq.length * 0.9))] / 255;
        levels[i] = v;
      }
    } else {
      // Smooth random motion: lively when "playing", a gentle idle ripple otherwise.
      const t = performance.now() / 1000;
      for (let i = 0; i < BARS; i++) {
        const target = playing
          ? 0.25 + 0.55 * Math.random() * (1 - i / BARS * 0.6)
          : 0.06 + 0.04 * Math.sin(t * 1.5 + i * 0.45);
        fake[i] += (target - fake[i]) * (playing ? 0.35 : 0.2);
        levels[i] = fake[i];
      }
    }
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < BARS; i++) {
      const x = GAP + i * (bw + GAP);
      const h = Math.max(2, levels[i] * (floorY - 8));
      peaks[i] = Math.max(peaks[i] - 1.2, h);
      g.fillStyle = grad;
      g.fillRect(x, floorY - h, bw, h);
      g.fillStyle = "rgba(220,255,255,.9)";
      g.fillRect(x, floorY - peaks[i] - 3, bw, 2);
      g.fillStyle = "rgba(79,224,122,.18)";
      g.fillRect(x, floorY + 2, bw, Math.min(h * 0.35, H - floorY - 2));
    }
  }
  setInterval(drawViz, 1000 / (C.vizFps || 20));

  nextTrack();

  // ---------- Weather gadget (Open-Meteo) ----------
  const W_SVG = {
    sun: '<circle cx="28" cy="28" r="12" fill="#ffd84a" stroke="#f0a400" stroke-width="2"/><g stroke="#ffd84a" stroke-width="3" stroke-linecap="round"><path d="M28 4v6M28 46v6M4 28h6M46 28h6M11 11l4 4M41 41l4 4M11 45l4-4M41 15l4-4"/></g>',
    moon: '<path d="M34 8a20 20 0 1 0 14 30A16 16 0 0 1 34 8z" fill="#f4f1c9" stroke="#c9c28a" stroke-width="1.5"/>',
    cloud: '<path d="M16 42h26a9 9 0 0 0 0-18 13 13 0 0 0-25-2 10 10 0 0 0-1 20z" fill="#f4f8ff" stroke="#9fb3c8" stroke-width="1.5"/>',
    rain: '<g stroke="#bfe3ff" stroke-width="3" stroke-linecap="round"><path d="M20 46l-3 7M30 46l-3 7M40 46l-3 7"/></g>',
    snow: '<g fill="#fff"><circle cx="19" cy="49" r="2.5"/><circle cx="29" cy="52" r="2.5"/><circle cx="39" cy="49" r="2.5"/></g>',
    bolt: '<path d="M30 40l-6 10h6l-3 8 10-12h-6l3-6z" fill="#ffd84a" stroke="#c98c00"/>',
    fog: '<g stroke="#e8eef5" stroke-width="3" stroke-linecap="round"><path d="M10 22h36M6 30h44M10 38h36"/></g>',
  };
  function describe(code, isDay) {
    const sky = isDay ? W_SVG.sun : W_SVG.moon;
    const small = sky.replace(/<g[\s\S]*<\/g>/, "").replace('cx="28" cy="28" r="12"', 'cx="20" cy="18" r="10"');
    const partly = `<g transform="translate(-4,-6) scale(.8)">${isDay ? small : W_SVG.moon}</g>${W_SVG.cloud}`;
    if (code === 0) return ["Clear", sky];
    if (code <= 2) return [code === 1 ? "Mostly clear" : "Partly cloudy", partly];
    if (code === 3) return ["Cloudy", W_SVG.cloud];
    if (code === 45 || code === 48) return ["Fog", W_SVG.fog];
    if (code >= 51 && code <= 57) return ["Drizzle", W_SVG.cloud + W_SVG.rain];
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return ["Rain", W_SVG.cloud + W_SVG.rain];
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ["Snow", W_SVG.cloud + W_SVG.snow];
    if (code >= 95) return ["Thunderstorms", W_SVG.cloud + W_SVG.bolt];
    return ["--", W_SVG.cloud];
  }
  async function updateWeather() {
    const w = C.weather;
    if (!w || !w.enabled) { $("weather-temp").textContent = ""; $("weather-cond").textContent = ""; return; }
    $("weather-loc").textContent = w.label;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${w.latitude}&longitude=${w.longitude}` +
        `&current=temperature_2m,weather_code,is_day&temperature_unit=${w.unit === "celsius" ? "celsius" : "fahrenheit"}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      const cur = (await r.json()).current;
      const [text, svg] = describe(cur.weather_code, cur.is_day === 1);
      $("weather-temp").textContent = `${Math.round(cur.temperature_2m)}°`;
      $("weather-cond").textContent = text;
      $("weather-icon").innerHTML = `<svg viewBox="0 0 56 56">${svg}</svg>`;
    } catch (e) {
      if ($("weather-temp").textContent.startsWith("--")) $("weather-cond").textContent = "Weather unavailable";
    }
  }
  $("weather-icon").innerHTML = `<svg viewBox="0 0 56 56">${W_SVG.cloud}</svg>`;
  updateWeather();
  setInterval(updateWeather, 15 * 60 * 1000);
})();
