
const path = require("path");
const polar = require("../polarReader");
const calibration = require("../calibration");
const { calculatePerformance } = require("../performanceCalculator");

polar.loadPolarCSV(path.join(__dirname, "polar_SY370_clean.csv"));

const input = {
  awa: 45,
  aws: 10,
  heading: 90,
  sog: 7.0,
  cog: 95,
  attitude: {
    roll: 12,
    pitch: 2,
    yaw: 0
  },
  motorRunning: false,
  time: new Date().toISOString()
};

const result = calculatePerformance(input);
console.log("Performance result:", result);
