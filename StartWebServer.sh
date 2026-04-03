#!/bin/bash
echo "Starting Mosquitto..."
mosquitto -d

cd ./SBCWeb

echo "Starting dashboard"

if [ ! -d "node_modules"]; then
    echo "Installing dependencies..."
    npm install
fi

npm start