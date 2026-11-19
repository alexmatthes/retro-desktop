// Sunrise / sunset calculator (standard astronomical formulas, same approach as the SunCalc library).
// Runs entirely on the machine: no internet needed. Accurate to about a minute.
window.SunTimes = (() => {
    const rad = Math.PI / 180, dayMs = 86400000, J1970 = 2440588, J2000 = 2451545;
    const e = rad * 23.4397; // tilt of the Earth's axis
    const J0 = 0.0009;

    const toDays = (date) => date.valueOf() / dayMs - 0.5 + J1970 - J2000;
    const fromJulian = (j) => new Date((j + 0.5 - J1970) * dayMs);
    const meanAnomaly = (d) => rad * (357.5291 + 0.98560028 * d);
    const eclipticLongitude = (M) => {
        const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
        return M + C + rad * 102.9372 + Math.PI;
    };
    const declination = (L) => Math.asin(Math.sin(e) * Math.sin(L));
    const approxTransit = (Ht, lw, n) => J0 + (Ht + lw) / (2 * Math.PI) + n;
    const solarTransitJ = (ds, M, L) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);

    // Returns { sunrise: Date, sunset: Date } for the solar day nearest to `date`.
    // Both are Invalid Date during polar day/night.
    function get(date, latitude, longitude) {
        const lw = rad * -longitude, phi = rad * latitude;
        const d = toDays(date);
        const n = Math.round(d - J0 - lw / (2 * Math.PI));
        const ds = approxTransit(0, lw, n);
        const M = meanAnomaly(ds), L = eclipticLongitude(M), dec = declination(L);
        const Jnoon = solarTransitJ(ds, M, L);
        const h0 = rad * -0.833; // sun's upper edge at the horizon, with atmospheric refraction
        const w = Math.acos((Math.sin(h0) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
        const Jset = solarTransitJ(approxTransit(w, lw, n), M, L);
        const Jrise = Jnoon - (Jset - Jnoon);
        return { sunrise: fromJulian(Jrise), sunset: fromJulian(Jset) };
    }
    return { get };
})();
