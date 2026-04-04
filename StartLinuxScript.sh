#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")/ServerScript" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"

# Vytvoření venv pokud neexistuje
if [ ! -d "$VENV_DIR" ]; then
    echo "Instaluji python3-venv..."
    sudo apt-get install -y python3-venv python3-pip

    echo "Vytvářím virtuální prostředí..."
    python3 -m venv "$VENV_DIR"

    if [ ! -f "$VENV_DIR/bin/pip" ]; then
        echo "Chyba: venv se nepodařilo vytvořit." >&2
        exit 1
    fi

    echo "Instaluji závislosti..."
    "$VENV_DIR/bin/pip" install --quiet -r "$SCRIPT_DIR/requirements.txt"
fi

echo "Spouštím server agent..."
"$VENV_DIR/bin/python" "$SCRIPT_DIR/debian_executor.py"
