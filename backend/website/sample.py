from datetime import datetime, date
import calendar
import  os
import random
import string
from website import db
from dotenv import load_dotenv
load_dotenv()

link = os.getenv("SYSTEM_URL")


def get_readable_date(stamp):
    dt = datetime.strptime(
        stamp,
        "%Y-%m-%d %H:%M:%S.%f"
    )

    human_readable = dt.strftime("%d %B %Y")

    return human_readable

def default_due_date():
    now = datetime.now()

    if now.month == 12:
        year = now.year + 1
        month = 1
    else:
        year = now.year
        month = now.month + 1

    last_day = calendar.monthrange(year, month)[1]

    return now.replace(
        year,
        month,
        last_day,
        0,
        0,
        0,
        0
    )


print(str(default_due_date()))