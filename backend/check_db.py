import sqlite3
import pandas as pd
pd.set_option('display.max_columns', None)

conn = sqlite3.connect('instance/leocap_local.db')
print("--- Recent Applicants ---")
print(pd.read_sql_query("SELECT id, name, email FROM applicants ORDER BY created_at DESC LIMIT 5", conn))

print("\n--- Recent Applications ---")
print(pd.read_sql_query("SELECT id, applicant_id, loan_type FROM applications ORDER BY created_at DESC LIMIT 5", conn))
