// performanceCalculator.js – full calculation incl. wind‑triangle, leeway, set & drift
// ---------------------------------------------------------------------------
// • Inputs come in production units (rad & m/s) from index.js.
// • Outputs that go back to index.js / Signal K keep the same unit family
//   (wind‑related speeds in kn are only for polar lookup; they’re converted
//   to m/s in index.js before publishing).
// • Leeway is now calculated using H5000 formula:
//     leeway = leewayCoefficient * heel / (stw^2), clamped to ±maxLeeway
//   where heel is in radians, stw in m/s, leeway in radians.
// ---------------------------------------------------------------------------


// ───── True wind (full triangle) ────────────────────────────────────
// Calculation of True Wind Speed (TWS), True Wind Direction (TWD), and True Wind Angle (TWA) based on the H5000 manual.
// Refer to the Wind Triangle diagram in the manual:
//
//   - Apparent Wind Angle (AWA) and Apparent Wind Speed (AWS) are measured relative to the boat (wind FROM direction).
//   - Heading and Speed Through Water (STW) represent the boat's movement through the water.
//   - True Wind is calculated as the vector sum of the Apparent Wind vector and the boat's velocity vector.
//
// Steps:
// 1. Convert Apparent Wind FROM direction to TO direction by adding 180° for vector calculations.
// 2. Create Apparent Wind vector (vApp) from TO direction and AWS.
// 3. Create boat velocity vector (vBoat) from heading and STW.
// 4. Calculate True Wind vector (vTrue) as vApp + vBoat.
// 5. Calculate TWS as the magnitude of vTrue.
// 6. Determine TWD as the direction vTrue points TO, then convert to FROM direction by adding 180° (NMEA2000 convention).
// 7. Compute TWA as the angle between TWD (FROM direction) and the boat heading (TO direction), normalized to the range −π…π radians.
//
// Reference to H5000 manual for wind definitions and calculation details.
// Note:
// - All angles are in radians, where 0 is North and rotation is clockwise (+CW).
// - Speeds are in SI units (m/s) for calculations, but TWS is converted to knots for polar lookup.
//
// Fallback:
// If heading or STW is missing (e.g., boat docked), Apparent Wind is used directly as True Wind.


const {
  getPolarSpeed,
  getTargetTWA,
  getTargetBoatSpeed
} = require('./polarReader')

// ── helpers ────────────────────────────────────────────────────────────
const ms2kts   = m => m * 1.94384449
const rad2deg  = r =>  r * 180 / Math.PI
const deg2rad  = d =>  d * Math.PI / 180

// wrap −π…π and 0…2π ----------------------------------------------------
const wrapPi  = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
const wrap2Pi = a => ((a % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI)
const normalize = a => Math.atan2(Math.sin(a), Math.cos(a)) // cheap wrapPi

// Convert navigation angle (0 = N, +CW) + speed  ➜  vector components (east, north)
const navToVector = (dirRad, speed) => ({
  x: Math.sin(dirRad) * speed,   //  +East
  y: Math.cos(dirRad) * speed    //  +North
})

// Inverse – vector ➜ navigation angle (0 = N, +CW)
const vectorToNav = (x, y) => Math.atan2(x, y) // atan2(East, North)

// ── MAIN ───────────────────────────────────────────────────────────────
module.exports.calculatePerformance = function (input) {
  const {
    awa, aws,                // rad, m/s (apparent wind angle FROM boat, apparent wind speed)
    stw,                      // m/s  (speed through water)
    sog,                      // m/s  (speed over ground)
    heading,                  // rad  (magnetic heading TO)
    cog,                      // rad  (magnetic course over ground TO)
    attitude = {},
    motorRunning = false,
    leewayCoefficient = 0.05,  // Default H5000 leeway coefficient (example)
    maxLeeway = 15             // Max leeway in degrees
  } = input

  // Abort when engine is on or wind data missing
  if (motorRunning || awa == null || aws == null) return null

  const res = {}

  // ───── True wind (full triangle) ────────────────────────────────────
  if (heading != null && stw != null) {
    // Apparent wind direction FROM boat (rad, 0…2π)
    const awd_from = wrap2Pi(heading + awa)
    // Apparent wind TO direction for vector calculations (add 180°)
    const awd_to   = wrap2Pi(awd_from + Math.PI)
    // Apparent wind velocity vector (m/s)
    const vApp  = navToVector(awd_to,  aws)
    // Boat velocity vector through water (m/s)
    const vBoat = navToVector(heading, stw)
    // True wind vector (vTrue = vApp + vBoat)
    const vTrue = { x: vApp.x + vBoat.x, y: vApp.y + vBoat.y }

    // Magnitude of true wind speed (m/s)
    const tws_ms = Math.hypot(vTrue.x, vTrue.y)
    // True wind direction TO (radians)
    const twd_to = vectorToNav(vTrue.x, vTrue.y)
    // True wind direction FROM (0…2π), Signal K style
    const twd_from = wrap2Pi(twd_to + Math.PI)
    // True wind angle relative to boat heading (signed radians −π…π)
    const twaRad = wrapPi(twd_from - heading)

    res.twa = twaRad                      // rad (−π…π) relative to boat bow
    res.tws = ms2kts(tws_ms)             // kn (for polar lookup)
    res.tws_ms = tws_ms                  // m/s (for diagnostics, raw SI unit)
    res.windDirectionMagnetic = twd_from // rad (0…2π) true wind FROM direction, magnetic reference
  } else {
    // Fallback (e.g., boat docked or no heading/stw): treat apparent as true wind
    res.twa  = awa
    res.tws  = ms2kts(aws)               // still knop for polar
    res.tws_ms = aws                    // raw m/s apparent wind speed
    res.windDirectionMagnetic = heading != null ? wrap2Pi(heading + awa + Math.PI) : null
  }

  // ───── Polar targets & performance ─────────────────────────────────
  const twaDeg  = rad2deg(res.twa)
  const polarKn = getPolarSpeed(res.tws, twaDeg)
  res.polarSpeed = polarKn
  res.polarPerf  = polarKn && stw != null ? ms2kts(stw) / polarKn : null

  const mode = Math.abs(twaDeg) <= 90 ? 'upwind' : 'downwind'
  res.targetTWA       = getTargetTWA(res.tws, mode)
  res.targetBoatSpeed = getTargetBoatSpeed(res.tws, mode)

  // VMG (velocity made good towards wind) – m/s
  res.vmg     = stw != null ? stw * Math.cos(res.twa) : null
  res.vmgPerf = (res.targetBoatSpeed && res.vmg != null)
    ? ms2kts(res.vmg) / res.targetBoatSpeed
    : null

  // ───── Current (set, drift) & leeway ──────────────────────────────
  if (stw != null && sog != null && heading != null && cog != null) {
    const vWater  = navToVector(heading, stw)
    const vGround = navToVector(cog,     sog)

    const c_x = vGround.x - vWater.x
    const c_y = vGround.y - vWater.y

    const curSpeed = Math.hypot(c_x, c_y)
    res.currentSpeed = curSpeed                    // m/s
    if (curSpeed > 0.05) {
      // Current set direction FROM (0…2π)
      res.currentSet = wrap2Pi(vectorToNav(c_x, c_y) + Math.PI)
    } else {
      res.currentSet = null
    }

    // ───── H5000 Leeway calculation ──────────────────────────────
    if (stw > 0.05) {
      const heelRad = attitude.roll ?? 0
      // Calculate leeway in radians using formula: K * heel / stw^2
      let leewayRad = leewayCoefficient * heelRad / (stw * stw)
      // Clamp to ±maxLeeway (convert maxLeeway degrees to radians)
      const maxLeewayRad = deg2rad(maxLeeway)
      leewayRad = Math.max(-maxLeewayRad, Math.min(maxLeewayRad, leewayRad))
      res.leeway = leewayRad
    } else {
      res.leeway = 0
    }
  } else {
    res.currentSpeed = null
    res.currentSet   = null
    res.leeway       = 0
  }

  // ───── Heel & pitch passthrough ─────────────────────────────────────
  res.heel  = attitude.roll  ?? null
  res.pitch = attitude.pitch ?? null

  return res
}
