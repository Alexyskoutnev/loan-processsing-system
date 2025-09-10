#!/usr/bin/env bash

# Kill any processes using port 8000
echo "Checking for processes using port 8000..."
if command -v lsof >/dev/null 2>&1; then
    PIDS=$(lsof -ti:8000 2>/dev/null || true)
    if [ ! -z "$PIDS" ]; then
        echo "Found processes using port 8000: $PIDS"
        echo "Killing processes..."
        kill -9 $PIDS 2>/dev/null || true
        sleep 2
        echo "Processes killed."
    else
        echo "No processes found using port 8000."
    fi
else
    echo "lsof command not found, skipping port check."
fi

# Configuration
export HOST="127.0.0.1"
export PORT="8000"
export N_WORKERS="1"
export TIMEOUT="120"

echo "Starting Bank Processing API with UV:"
echo "Workers: ${N_WORKERS}"
echo "Host: ${HOST}"
echo "Port: ${PORT}"
echo "Timeout: ${TIMEOUT}"

# Sync dependencies with uv
uv sync

# Run with uv
echo "Starting server..."
PYTHONPATH=. uv run gunicorn -w "${N_WORKERS}" \
                             -b "${HOST}:${PORT}" \
                             'main:application' \
                             --timeout "${TIMEOUT}" \
                             --log-level info