import re
path = r'C:\Users\ELVIS\.gemini\antigravity\scratch\leocap-system\backend\website\models.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('do_orm_execute')
if idx != -1:
    print(content[idx:idx+2000])
