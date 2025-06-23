// tests/testCases.js – utökad testsamling för performanceCalculator (med ström)
// ---------------------------------------------------------------------------
//  Fält:
//   • awa  °  (positiv = styrbord, negativ = babord)
//   • aws  m/s  (apparant vindhastighet)
//   • stw  m/s  (speed through water)
//   • heading ° (kompasskurs, 0 = N, +CW)
//   • sog  m/s  (speed over ground)
//   • cog  °    (kurs över grund)
//   • roll °

module.exports = [
  // ── Med- & högvind (befintliga fall) ─────────────────────────────────
  { awa:  60, aws:  8, stw:  4,   heading:  90, sog:  4,    cog:  90, roll:  4 },
  { awa: -60, aws:  8, stw:  4,   heading: 270, sog:  4,    cog: 270, roll: -4 },
  { awa:  40, aws: 12, stw:  6,   heading:  45, sog:  6,    cog:  45, roll:  8 },
  { awa: -40, aws: 12, stw:  6,   heading: 315, sog:  6,    cog: 315, roll: -8 },
  { awa:  90, aws: 15, stw:  8,   heading: 180, sog:  8,    cog: 180, roll:  3 },
  { awa: 150, aws: 10, stw:  5,   heading: 210, sog:  5,    cog: 210, roll:  2 },
  { awa: 180, aws:  9, stw:  4.5, heading:   0, sog:  4.5,  cog:   0, roll:  1 },
  { awa:   0, aws: 10, stw:  1,   heading:   0, sog:  1,    cog:   0, roll:  0 },
  { awa:  75, aws:  2, stw:  1,   heading:  90, sog:  1,    cog:  90, roll:  0 },
  { awa: 120, aws: 25, stw: 12,   heading: 210, sog: 12,    cog: 210, roll:  5 },
  { awa: 135, aws:  6, stw:  0,   heading: 270, sog:  0,    cog: 270, roll:  0 },
  { awa:  45, aws: 11, stw:  6,   heading:  90, sog:  6,    cog:  90, roll:  4 },
  { awa:  30, aws: 18, stw:  4,   heading:  40, sog:  4,    cog:  40, roll: 10 },
  { awa:  42, aws:  9, stw:  5,   heading:  60, sog:  5,    cog:  60, roll:  6 },
  { awa: -42, aws:  9, stw:  5,   heading: 300, sog:  5,    cog: 300, roll: -6 },
  { awa:  60, aws:  8, stw:  4,   heading:  90, sog:  4.514, cog:  80, roll:  2 },
  { awa: -60, aws:  8, stw:  4,   heading: 270, sog:  4.514, cog: 280, roll: -2 },
  { awa:  90, aws: 12, stw:  5,   heading:  90, sog:  3.086, cog:  78, roll:  0 },
  { awa: -90, aws: 12, stw:  5,   heading: 270, sog:  6.172, cog: 262, roll:  0 },

  // ── LÅGVIND (AWS 3–6 m/s) – NYA FALL ─────────────────────────────────
  // 1. Beam reach, svag vind, ingen ström
  { awa: 90,  aws: 3, stw: 1.8, heading:  90, sog: 1.8,  cog:  90, roll: 1 },
  // 2. Lätt kryss styrbord, lite medström (0.5 kn)
  { awa: 45,  aws: 4, stw: 2.2, heading:  60, sog: 2.46, cog:  60, roll: 2 },
  // 3. Lätt kryss babord, sidström babord (0.5 kn)
  { awa: -45, aws: 4, stw: 2.2, heading: 300, sog: 2.46, cog: 292, roll: -2 },
  // 4. Halvvind styrbord, 6 m/s, sidström styrbord (1 kn)
  { awa: 60,  aws: 6, stw: 3.0, heading: 120, sog: 3.51, cog: 110, roll: 3 },
  // 5. Läns babord, 5 m/s, motström 0.5 kn
  { awa: -150, aws: 5, stw: 2.5, heading: 210, sog: 2.25, cog: 210, roll: -1 },
  // 6. Båten stilla, svag vind 3 m/s (kontroll av “dock-läge”)
  { awa: 120, aws: 3, stw: 0,   heading:  90, sog: 0,    cog:  90, roll: 0 }
]
