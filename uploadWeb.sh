#!/bin/bash

# --- KONFIGURATION ---
REMOTE_USER=pi
REMOTE_HOST=192.168.1.211
REMOTE_PATH=/home/pi/my_signalk_plugins/performanceCalculator3/webapp

# --- LADDA UPP ALLA FILER ---
echo "🧼 Rensar fjärrmapp..."
ssh $REMOTE_USER@$REMOTE_HOST "rm -rf $REMOTE_PATH && mkdir -p $REMOTE_PATH"

echo "📡 Laddar upp filer till $REMOTE_HOST:$REMOTE_PATH ..."
scp -r webapp/* $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/ || { echo "❌ Upload misslyckades"; exit 1; }

echo "✅ Alla filer är uppladdade!"
