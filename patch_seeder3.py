import re

path = 'backend/demo_seeder.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('location="Nairobi", ', '')
content = content.replace('location="Mombasa", ', '')
content = content.replace('code="acme"', 'code="acme", address="Nairobi"')
content = content.replace('code="tech"', 'code="tech", address="Mombasa"')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched demo_seeder.py")
