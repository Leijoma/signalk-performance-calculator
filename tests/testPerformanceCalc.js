// testPerformanceCalc.js
// Enkel testkörning av performanceCalculator utan Signal K

const path = require("path");
const fs = require("fs");
const calibration = require("../calibration");
const polar = require("../polarReader");
const { calculatePerformance } = require("../performanceCalculator");

// Ladda polarfil
polar.loadPolarCSV(path.join(__dirname, "polar_SY370_clean.csv"));

// Dummydata för en seglingspunkt
const input = {
  awa: 45,              // apparent wind angle
  aws: 10,              // apparent wind speed (knop)
  heading: 90,          // degrees
  sog: 7.0,             // speed over ground (kn)
  cog: 95,              // course over ground
  attitude: {
    roll: 12,           // degrees heel
    pitch: 2,
    yaw: 0
  },
  motorRunning: false,
  time: new Date().toISOString()
};

// Testa kalkylen
const result = calculatePerformance(input);
console.log("Performance result:", result);
