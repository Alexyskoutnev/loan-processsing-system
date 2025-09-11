#!/usr/bin/env bash

echo "Checking for processes using port 3000..."
if command -v lsof >/dev/null 2>&1; then
    PIDS=$(lsof -ti:3000 2>/dev/null || true)
    if [ ! -z "$PIDS" ]; then
        echo "Found processes using port 3000: $PIDS"
        echo "Killing processes..."
        kill -9 $PIDS 2>/dev/null || true
        sleep 2
        echo "Processes killed."
    else
        echo "No processes found using port 3000."
    fi
else
    echo "lsof command not found, skipping port check."
fi

export PORT="3000"
export BROWSER="none"
export GENERATE_SOURCEMAP="true"
export REACT_APP_API_URL="http://localhost:8000"

echo "Starting Bank Processing Frontend:"
echo "Host: localhost"
echo "Port: ${PORT}"
echo "API URL: ${REACT_APP_API_URL}"

cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
else
    echo "Dependencies already installed."
fi

echo "Starting React development server..."
npm start
