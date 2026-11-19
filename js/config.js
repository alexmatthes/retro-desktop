// ===== Things you'll want to change =====
window.DESKTOP_CONFIG = {
    // Time zone for the taskbar clock, the analog clock and the study timer.
    timeZone: "America/New_York",

    // Study timer. Everyone watching sees the same timer because it's tied to the clock,
    // not to when the page loaded (restarts don't reset it).
    // focus + break should divide evenly into 24 hours (60 -> 50/10, 30 -> 25/5).
    focusMinutes: 50,
    breakMinutes: 10,

    // Day/night theme.
    //   "auto"  = light from sunrise to sunset, dark at night (calculated for the place below)
    //   "day" / "night" = always that theme
    // To preview a theme in your browser without editing this, add ?theme=day or ?theme=night to the URL.
    theme: "auto",
    sun: { latitude: 39.96, longitude: -83.00 }, // whose sunrise/sunset to follow (rounded is fine)
    themeFadeSeconds: 90,                         // how long the switch takes

    // Weather cards (Open-Meteo: free, no API key). 1 to 4 cities.
    // Each card also shows that city's local time. unit: "fahrenheit" or "celsius".
    weather: {
        enabled: true,
        cities: [
            { label: "New York", latitude: 40.71, longitude: -74.01, unit: "fahrenheit" },
            { label: "London", latitude: 51.51, longitude: -0.13, unit: "celsius" },
            { label: "São Paulo", latitude: -23.55, longitude: -46.63, unit: "celsius" },
            { label: "Mumbai", latitude: 19.08, longitude: 72.88, unit: "celsius" },
        ],
    },

    // Voice clips when the timer switches. Put audio files in the voice/ folder and list them here.
    // If you list several, one is picked at random each time. Leave a list empty to stay silent.
    announcements: {
        enabled: true,
        focus: ["voice/focus-1.mp3", "voice/focus-2.mp3", "voice/focus-3.mp3", "voice/focus-4.mp3", "voice/focus-5.mp3"],   // plays when a focus session starts
        break: ["voice/break-1.mp3", "voice/break-2.mp3", "voice/break-3.mp3", "voice/break-4.mp3", "voice/break-5.mp3"],   // plays when a break starts
        duckTo: 0.2,   // music volume while the voice plays (0.2 = 20% of normal)
        voiceVolume: 1.0,
    },

    // Text in the notes.txt window.
    notes: [
        "welcome to the study desk",
        "",
        "- focus while the timer says focus",
        "- actually take the break",
        "- say hi in chat",
        "",
        "",
        "",
        "made by Visualgorithm",
    ],

    // Small text in the bottom-right corner of the desktop.
    watermark: "Visualgorithm Study Desk  -  live 24/7",

    volume: 0.9,   // music volume, 0.0 - 1.0
    vizFps: 20,    // visualizer frame rate; lower = lighter on an old PC
};
