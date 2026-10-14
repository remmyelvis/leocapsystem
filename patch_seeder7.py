import re

path = 'backend/demo_seeder.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('interest_rate=10.0,', 'interest_rate=10.0, loan_type="Personal Loan",')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched demo_seeder.py again")
