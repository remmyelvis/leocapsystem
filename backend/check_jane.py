import sqlite3
import pandas as pd
conn = sqlite3.connect('instance/leocap_local.db')
print("Jane's applications:")
print(pd.read_sql_query("SELECT id FROM applications WHERE applicant_id='5b13bc7e-aced-4c09-80fc-e39fe4f0e50a'", conn))
print("Jane's statements:")
print(pd.read_sql_query("SELECT id FROM statement_entries WHERE applicant_id='5b13bc7e-aced-4c09-80fc-e39fe4f0e50a'", conn))
