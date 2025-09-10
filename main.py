#!/usr/bin/env python3
from api.app import create_app

application = create_app()

if __name__ == "__main__":
    print("Use gunicorn to run the server:")
    print("gunicorn -w 1 -b 127.0.0.1:8000 main:application --timeout 120 --log-level info")
