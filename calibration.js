// calibration.js
// Laddar och tillhandahåller kalibreringsdata, samt funktioner för justeringar

const fs = require("fs");
const path = require("path");

const CALIBRATION_PATH = path.join(__dirname, "calibration.json");

let calibrationData = {
  speedThroughWaterOffset: 0.0,
  heelCorrectionFactor: 0.0,
  minimumBoatSpeed: 1.5,
  upwindMaxAngle: 60,
  downwindMinAngle: 135
};

function loadCalibration() {
  if (fs.existsSync(CALIBRATION_PATH)) {
    const raw = fs.readFileSync(CALIBRATION_PATH);
    calibrationData = JSON.parse(raw);
  }
}

function saveCalibration() {
  fs.writeFileSync(CALIBRATION_PATH, JSON.stringify(calibrationData, null, 2));
}

function getCalibratedSTW(stw, heel) {
  const correction = 1 + calibrationData.heelCorrectionFactor * Math.abs(heel);
  return stw * correction + calibrationData.speedThroughWaterOffset;
}

function getVMGLimits() {
  return {
    upwind: calibrationData.upwindMaxAngle,
    downwind: calibrationData.downwindMinAngle
  };
}

loadCalibration();

module.exports = {
  getCalibratedSTW,
  getVMGLimits,
  calibrationData,
  loadCalibration,
  saveCalibration
};
