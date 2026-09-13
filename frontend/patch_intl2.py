import os
import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match various Intl.NumberFormat creations
    new_content = re.sub(
        r'new Intl\.NumberFormat\(\s*["\']en-KE["\']\s*,\s*\{\s*style:\s*["\']currency["\']\s*,\s*currency:\s*["\']KES["\']\s*,?\s*\}\s*\)',
        r'new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 })',
        content
    )
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Patched {filepath}")

for root, dirs, files in os.walk(r'C:\Users\ELVIS\.gemini\antigravity\scratch\leocap-frontend\src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            patch_file(os.path.join(root, file))

print("Done patching Intl.NumberFormat!")
