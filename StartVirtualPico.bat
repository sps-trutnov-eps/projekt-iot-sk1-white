@echo off
echo Starting Virtual Pico...

if not exist MCUs\DHT11\.env (
    echo Creating .env from .env.example...
    copy MCUs\DHT11\.env.example MCUs\DHT11\.env
)

pip install paho-mqtt python-dotenv -q
python MCUs\DHT11\virtualPico.py