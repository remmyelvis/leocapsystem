"""Rebuild the demo database with the showcase data.

    cd backend && python demo_seeder.py                      # local demo (instance/demo.db)
    DEMO_MODE=True DATABASE_URL=postgresql://.../leocapin_demo python demo_seeder.py

It wipes the database it is pointed at and builds it again, so it refuses to run unless DEMO_MODE is True and the database name
has the word "demo" in it (for example leocapin_demo), and it refuses to wipe a database that holds anything but the demo's own ".example" addresses. What it builds
is described in demo_data/__init__.py; the people and stories are in demo_data/people.py and demo_data/plan.py.
"""
import os
import sys


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    from dotenv import load_dotenv
    load_dotenv(os.path.join(here, "website", ".env"))  # the server keeps its settings here; real environment variables still win
    os.environ.setdefault("DEMO_MODE", "True")
    os.environ.setdefault("DATABASE_URL", "sqlite:///demo.db")
    os.environ.setdefault("SECRET_KEY", "demo-secret-key-not-for-production-0123456789")
    sys.path.insert(0, here)

    from demo_data import DemoGuardError, seed_demo_data, assert_demo_target
    try:
        assert_demo_target(os.environ["DATABASE_URL"])
    except DemoGuardError as why:
        print(f"Refused: {why}")
        sys.exit(2)

    from website import create_app
    app = create_app()
    try:
        seed_demo_data(app)
    except DemoGuardError as why:
        print(f"Refused: {why}")
        sys.exit(2)
    print("Demo logins (password demo123): see demo_data/people.py. Start the backend with DEMO_MODE=True and the same DATABASE_URL.")


if __name__ == "__main__":
    main()
