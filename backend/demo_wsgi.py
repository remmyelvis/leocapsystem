"""Startup file of the demo API (demo-api.leocapinvest.co.ke): Passenger runs `application` from here.

The demo is its own copy of the backend with its own database. It refuses to start unless DEMO_MODE is True and the database
name contains "demo", so it can never be pointed at the live data by mistake. Its settings live in website/.env on the server
(DATABASE_URL, SECRET_KEY, DEMO_MODE, ...), exactly like the live API's.
"""
import os

from website import create_app  # importing the package loads website/.env into the environment

from demo_data import assert_demo_target

assert_demo_target(os.environ.get("DATABASE_URL", ""))
application = create_app()
