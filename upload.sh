#!/bin/bash

DEST="pi@192.168.1.211"
REMOTE_DIR="~/my_signalk_plugins/performanceCalculator3"

echo "🔁 Uploading plugin files to $DEST:$REMOTE_DIR ..."

scp -r \
  index.html \
  index.js \
  performanceCalculator.js \
  h5000-n2k-emulator.js \
  polarReader.js \
  interpolator.js \
  calibration.js \
  calibration.json \
  polar_SY370_clean.csv \
  package.json \
  tests \
  "$DEST:$REMOTE_DIR"

echo "🔄 Restarting Signal K server ..."
ssh pi@192.168.1.211 'sudo systemctl restart signalk.service'

echo "✅ Upload and restart complete."
