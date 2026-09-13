import sys; sys.path.append('.')
from app import app
from website.models import Application
with app.test_client() as c:
    # Need to mock the JWT or just test the query directly
    pass
