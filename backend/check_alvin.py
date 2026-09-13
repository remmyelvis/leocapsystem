import sqlite3
import pandas as pd

conn = sqlite3.connect('instance/leocap_local.db')
print(pd.read_sql_query("SELECT id, applicant_id FROM applications WHERE applicant_id='e500b272-daf6-488b-b7d6-45c47a03a637'", conn))
