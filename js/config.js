// ===== Things you'll want to change =====
window.DESKTOP_CONFIG = {
  // Time zone for the taskbar clock, the analog clock and the study timer.
  timeZone: "America/New_York",

  // Study timer. Everyone watching sees the same timer because it's tied to the clock,
  // not to when the page loaded (restarts don't reset it).
  // focus + break should divide evenly into 24 hours (60 -> 50/10, 30 -> 25/5).
  focusMinutes: 50,
  breakMinutes: 10,

  // Weather gadget (Open-Meteo, free, no API key). This shows on a PUBLIC stream,
  // so pick a city you're comfortable showing. Set enabled:false to hide the numbers.
  weather: {
    enabled: true,
    label: "Columbus, OH",
    latitude: 39.96,
    longitude: -83.00,
    unit: "fahrenheit", // or "celsius"
  },

  // Text in the notes.txt window.
  notes: [
    "welcome to the study desk",
    "",
    "- focus while the timer says focus",
    "- actually take the break",
    "- say hi in chat",
    "",
    "music: (list your sources/credits here)",
    "made by Visualgorithm",
  ],

  // Small text in the bottom-right corner of the desktop.
  watermark: "Visualgorithm Study Desk  -  live 24/7",

  volume: 0.9,   // 0.0 - 1.0
  vizFps: 20,    // visualizer frame rate; lower = lighter on an old PC
};
