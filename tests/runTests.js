// tests/runTests.js – robust test-runner with null-aware output
// -------------------------------------------------------------
//  • Converts all inputs to production units (rad, m/s).
//  • Prints null when result is missing (e.g. no COG/SOG).
//  • Reports leeway, set, drift, and true wind speed in m/s.
// -------------------------------------------------------------

const path = require('path')
const polarReader = require(path.join('..', 'polarReader'))
const { calculatePerformance } = require(path.join('..', 'performanceCalculator'))
const cases = require('./testCases')

polarReader.loadPolarCSV(path.join(__dirname, '..', 'polar_SY370_clean.csv'))

const ms2kts = m => m * 1.94384449
const deg2rad = d => (d * Math.PI) / 180
const toStr = (v, fix = 2) => (v == null || Number.isNaN(v) ? 'null' : v.toFixed(fix))

console.log(
  'Case\tAWS(m/s)\tAWA(°)\tSTW(kn)\tTWS(m/s)\tTWA(°)\tPolarSpd(kn)\tPerf\tVMG(m/s)\tTgtTWA\tTgtBS(kn)\tLeeway(°)\tSet(°)\tDrift(kn)'
)

cases.forEach((c, idx) => {
  const inp = {
    awa: deg2rad(c.awa),
    aws: c.aws,
    stw: c.stw,
    heading: deg2rad(c.heading),
    cog: c.cog != null ? deg2rad(c.cog) : null,
    sog: c.sog,
    attitude: { roll: c.roll, pitch: 0, yaw: 0 },
    motorRunning: false
  }

  const r = calculatePerformance(inp)
  if (!r) {
    console.log(`#${idx}\tskipped`)
    return
  }

  // Note: r.tws is in knots for polar lookup; r.tws_ms is true wind speed in m/s.
  const row = [
    `#${idx}`,
    c.aws,
    '',
    c.awa,
    toStr(ms2kts(c.stw), 1),
    toStr(r.tws_ms, 1),
     '',
    toStr(r.twa * 180 / Math.PI, 1),
    toStr(r.polarSpeed, 1),
     '',
    toStr(r.polarPerf, 2),
    toStr(r.vmg, 2),
     '',
    toStr(r.targetTWA, 1),
    toStr(r.targetBoatSpeed, 1),
     '',
    toStr(r.leeway * 180 / Math.PI, 1),
     '',
    toStr(r.currentSet != null ? r.currentSet * 180 / Math.PI : null, 1),
    toStr(ms2kts(r.currentSpeed), 2)
  ]

  console.log(row.join('\t'))
})
