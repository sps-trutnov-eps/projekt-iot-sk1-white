@echo off
echo Starting Mosquitto...
start mosquitto

cd ./SBCWeb

echo Starting dashboard
if not exist node_modules (
    echo Installing dependencies...
    npm install
)

npm start
