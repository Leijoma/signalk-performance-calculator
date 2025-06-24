const path  = require('path')
const fs    = require('fs')
const polarReader          = require('./polarReader')
const calibration          = require('./calibration')
const { calculatePerformance } = require('./performanceCalculator')
const H5000N2K             = require('./h5000-n2k-emulator')

module.exports = function (app) {
  let unsubscribes = []
  let h5           = null
  let lastInput    = {}
  let lastRun      = 0
  let lastLog      = 0

  const kts2mps = k => k / 1.94384449
  const ms2kts  = m => m * 1.94384449
  const deg2rad = d => d * Math.PI / 180
  const toVal   = v => (v == null || Number.isNaN(v) ? null : v)

  const plugin = {
    id:'performance-calculator',
    name:'Performance Calculator',
    description:'Emulates B&G H5000 calculations and streams N2K',
    options: {}
  }

  plugin.schema = {
    type:'object',
    properties:{
      awaPath:{type:'string',default:'environment.wind.angleApparent'},
      awsPath:{type:'string',default:'environment.wind.speedApparent'},
      stwPath:{type:'string',default:'navigation.speedThroughWater'},
      sogPath:{type:'string',default:'navigation.speedOverGround'},
      headingPath:{type:'string',default:'navigation.headingTrue'},
      cogPath:{type:'string',default:'navigation.courseOverGroundTrue'},
      attitudePath:{type:'string',default:'navigation.attitude'},
      yawRatePath:{type:'string',default:'navigation.rateOfTurn'},
      enginePath:{type:'string',default:'propulsion.engine.running'},

      polarFile:{type:'string',default:'./polar_SY370_clean.csv'},
      calibrationFile:{type:'string',default:'./calibration.json'},
      useSTW:{type:'boolean',default:true},

      emulateN2K:{type:'boolean',default:true},
      canDevice:{type:'string',default:'can0'},
      n2kSourceAddress:{type:'number',default:138},

      leewayCoefficient: {type:'number', default:0.05, description:'H5000 leeway coefficient K'},
      maxLeeway: {type:'number', default:15, description:'Max leeway angle in degrees'}
    }
  }

  plugin.start = function (opt) {
    plugin.options = opt

    const polarPath = path.resolve(__dirname,opt.polarFile)
    if (fs.existsSync(polarPath)) polarReader.loadPolarCSV(polarPath)
    else app.error('[PerfCalc] Polar missing',polarPath)

    const calibPath = path.resolve(__dirname,opt.calibrationFile)
    if (fs.existsSync(calibPath)) calibration.loadCalibration(calibPath)
    else app.error('[PerfCalc] Calibration missing',calibPath)

    if (opt.emulateN2K) {
      h5 = new H5000N2K({ app, canDevice:opt.canDevice, preferredAddress:opt.n2kSourceAddress })
      app.debug('[PerfCalc] H5000 emulation ON')
    }

    const paths=[opt.awaPath,opt.awsPath,opt.stwPath,opt.sogPath,opt.headingPath,opt.cogPath,opt.attitudePath,opt.yawRatePath,opt.enginePath]
    unsubscribes = paths.map(p=> app.streambundle.getSelfStream(p,{period:200}).onValue(()=>handleDelta(opt)))
  }

  function handleDelta (opt) {
    const now=Date.now(); if(now-lastRun<500) return

    const g=p=>app.getSelfPath(p)?.value
    const att=g(opt.attitudePath)||{}
    const inObj={
      awa:g(opt.awaPath), aws:g(opt.awsPath),
      stw:g(opt.stwPath), sog:g(opt.sogPath),
      heading:g(opt.headingPath), cog:g(opt.cogPath),
      attitude:{roll:att.roll,pitch:att.pitch,yaw:att.yaw},
      yawRate:g(opt.yawRatePath), motorRunning:g(opt.enginePath),

      leewayCoefficient: opt.leewayCoefficient,
      maxLeeway: opt.maxLeeway
    }
    if(JSON.stringify(inObj)===JSON.stringify(lastInput)) return
    lastInput=inObj; lastRun=now

    const r=calculatePerformance(inObj)
    if(!r) return

    const deltaVals=[
      {path:'performance.polarSpeed',          value:toVal(kts2mps(r.polarSpeed))},
      {path:'performance.velocityMadeGood',    value:toVal(kts2mps(r.vmg))},
      {path:'performance.targetVMG',            value:toVal(kts2mps(r.targetVMG))},

      {path:'performance.polarSpeedRatio',     value:toVal(r.polarPerf)},
      {path:'performance.targetAngle',         value:toVal(deg2rad(r.targetTWA))},
      {path:'performance.targetBoatSpeed',     value:toVal(kts2mps(r.targetBoatSpeed))},
      {path:'performance.vmgPerformance',      value:toVal(r.vmgPerf)},
      {path:'performance.optimumWindAngle',    value:toVal(deg2rad(r.optimumWindAngle))},
      {path:'performance.leeway',               value:toVal(deg2rad(r.leeway))},

      {path:'environment.wind.speedTrue',      value:toVal(kts2mps(r.tws))},
      {path:'environment.wind.angleTrueWater', value:toVal(r.twa)},
      {path:'environment.wind.directionMagnetic', value:toVal(r.windDirectionMagnetic)},

      {path:'environment.current.speed',       value:toVal(r.currentSpeed)},
      {path:'environment.current.set',         value:toVal(r.currentSet)}
    ]

    app.handleMessage(plugin.id,{ updates:[{ source:{label:plugin.name}, timestamp:new Date().toISOString(), values:deltaVals }] })

    if(h5){
      const send=(name,val,scale)=>{ if(val!=null&&!Number.isNaN(val)) h5.send(name,val,scale) }

      send('POLAR SPEED',       kts2mps(r.polarSpeed),        100)
      send('POLAR SPEED RATIO', r.polarPerf,                  1000)
      send('VMG TO WIND',       kts2mps(r.vmg),               100)
      send('TARGET TWA',        deg2rad(r.targetTWA),         1000)

      send('TWS KNOTS',         r.tws,                        100)
      send('TWA',               r.twa,                        100)
      send('TWD',               r.windDirectionMagnetic,      100)
      send('OPTIMUM WIND ANGLE',r.optimumWindAngle,           100)
      send('VMG PERFORMANCE',   r.vmgPerf,                    1000)

      send('TIDAL DRIFT',       ms2kts(r.currentSpeed),       100)
      send('TIDAL SET',         r.currentSet,                 100)
      send('LEEWAY',            r.leeway,                     100)
    }

    if(now-lastLog>10000){ app.debug('[PerfCalc] out',JSON.stringify(r)); lastLog=now }
  }

  plugin.registerWithRouter = router => {
    router.get('/polar',(_,res) => {
      const polarPath = path.resolve(__dirname, plugin.options.polarFile || './polar_SY370_clean.csv')
      if (fs.existsSync(polarPath)) {
        res.type('text/csv').send(fs.readFileSync(polarPath, 'utf8'))
      } else {
        res.status(404).send('Polar file not found')
      }
    })
    router.get('/calibration',(_,res)=> res.json(calibration.calibrationData))
  }

  plugin.stop = () => { 
    unsubscribes.forEach(f=>f()); 
    unsubscribes=[]; 
    if(h5) {
      try {
        h5.stop()
      } catch (err) {
        app.error('[PerfCalc] Error stopping H5000 emulator:', err)
      }
    }
    app.debug('[PerfCalc] stopped') 
  }

  return plugin
}
