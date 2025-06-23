// h5000-n2k-emulator.js – now null‑aware & extended IDs
// -----------------------------------------------------------------------------
//  • Skips sending PGN 130824 if value is null/NaN.
//  • Adds IDs for TIDAL DRIFT, TIDAL SET, LEEWAY.
// -----------------------------------------------------------------------------

const util = require('util')
const { SimpleCan } = require('@canboat/canboatjs')

const DATA_IDS = {
  'POLAR SPEED': 126,
  'POLAR SPEED RATIO': 124,
  'VMG TO WIND': 127,
  'TARGET TWA': 83,
  'TARGET BOAT SPEED': 125,
  'OPTIMUM WIND ANGLE': 53,
  'VMG PERFORMANCE': 285,
  'TWA': 89,
  'TWS KNOTS': 85,
  'TWD': 109,
  'TIDAL DRIFT': 131,
  'TIDAL SET': 132,
  'LEEWAY': 130
}

const OFFSET = 0x2000
const idToKey = id => {
  const raw = OFFSET + id
  const lo = (raw & 0xff).toString(16).padStart(2, '0')
  const hi = ((raw >> 8) & 0xff).toString(16).padStart(2, '0')
  return `${lo},${hi}`
}

const KEY_MAP = Object.fromEntries(
  Object.entries(DATA_IDS).map(([n, id]) => [n.toUpperCase(), idToKey(id)])
)

const KEEP_ALIVE_PGN = '%s,7,65305,%s,255,8,41,9f,01,17,1c,01,00,00'
const PERF_PGN_BASE  = '%s,3,130824,%s,255,%s,7d,99'

class H5000N2K {
  constructor ({ app, canDevice = 'can0', preferredAddress = 138 }) {
    this.app = app || { debug: console.log, error: console.error }
    this.src = preferredAddress
    this.can = new SimpleCan({
      app: this.app,
      canDevice,
      preferredAddress,
      transmitPGNs: [126996],
      addressClaim: {
        'Unique Number': 1731561,
        'Manufacturer Code': 'Navico',
        'Device Function': 190,
        'Device Class': 'Internal Environment',
        'Device Instance Lower': 0,
        'Device Instance Upper': 0,
        'System Instance': 0,
        'Industry Group': 'Marine'
      },
      productInfo: {
        'NMEA 2000 Version': 2100,
        'Product Code': 246,
        'Model ID': 'H5000‑Emu',
        'Software Version Code': '1.1.0',
        'Model Serial Code': '000001',
        'Certification Level': 2,
        'Load Equivalency': 1
      }
    })
    this.can.start()
    this.keepAliveTimer = setInterval(() => {
      const msg = util.format(KEEP_ALIVE_PGN, new Date().toISOString(), this.src)
      this.can.sendPGN(msg)
    }, 1000)
  }

  stop () {
    clearInterval(this.keepAliveTimer)
    if (this.can && typeof this.can.stop === 'function') {
      this.can.stop()
    }
  }

  send (name, value, scale = 1) {
    if (value == null || Number.isNaN(value)) return // skip null
    const key = KEY_MAP[name.toUpperCase()]
    if (!key) { this.app.error(`H5000N2K: Unknown parameter "${name}"`); return }

    const intVal = Math.round(value * scale)
    const lo = (intVal & 0xff).toString(16).padStart(2, '0')
    const hi = ((intVal >> 8) & 0xff).toString(16).padStart(2, '0')

    let payload = `,${key},${lo},${hi}`
    let len = payload.split(',').length + 1
    while (len < 10) { payload += ',ff'; len++ }

    const msg = util.format(PERF_PGN_BASE, new Date().toISOString(), this.src, len) + payload
    this.can.sendPGN(msg)
  }
}

module.exports = H5000N2K
module.exports.KEY_MAP = KEY_MAP
module.exports.DATA_IDS = DATA_IDS
