# make_migrations.py

import os
import subprocess
from datetime import datetime


def flask_init(message=None):
    """
    Generate a new Flask-Migrate migration.
    """

    if message is None:
        message = f"auto_migration_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    command = [
        "flask",
        "db",
        "init"
    ]

    try:
        subprocess.run(command, check=True)
        print(f"Init created successfully: {message}")
    except subprocess.CalledProcessError as e:
        print(f"Init failed: {e}")


def make_migration(message=None):
    """
    Generate a new Flask-Migrate migration.
    """

    if message is None:
        message = f"auto_migration_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    command = [
        "flask",
        "db",
        "migrate",
        "-m",
        message
    ]

    try:
        subprocess.run(command, check=True)
        print(f"Migration created successfully: {message}")
    except subprocess.CalledProcessError as e:
        print(f"Migration failed: {e}")
        
def update_database(message=None):
    """
    Generate a new Flask-Migrate migration.
    """

    command = [
        "flask",
        "db",
        "upgrade"
    ]

    try:
        subprocess.run(command, check=True)
        print(f"Upgrade created successfully: {message}")
    except subprocess.CalledProcessError as e:
        print(f"Upgrade failed: {e}")


if __name__ == "__main__":
    # flask_init()
    make_migration()
    update_database()