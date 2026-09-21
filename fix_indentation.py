import re

path = 'backend/website/export_service.py'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.startswith("      elements.append(Paragraph"):
        # The surrounding code is indented with 4 spaces: `    elements.append(...)`
        # Because `def generate_company_mou_pdf` is unindented (or maybe inside a class?).
        # Actually in the diff it shows:
        # `    elements.append(...)`
        # `+      elements.append(...)`
        # We need to replace the 6 spaces with 4 spaces.
        line = line.replace("      elements.append", "    elements.append")
    new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Fixed indentation")
