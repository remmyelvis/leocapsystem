import re

with open('backend/website/application.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add ApplicantDocument to models import if not there
if 'ApplicantDocument' not in content:
    content = re.sub(
        r'from website\.models import (.*?)\n',
        r'from website.models import \1, ApplicantDocument\n',
        content,
        count=1
    )

# Replace docs query in download_debt_dossier
content = re.sub(
    r'docs = ApplicationDocument\.query\.filter_by\(application_id=app\.id\)\.all\(\)',
    r'docs = ApplicantDocument.query.filter_by(applicant_id=applicant.id).all()',
    content
)

# Rename filename to Debt_Collection_Profile
content = content.replace('filename=Debt_Collection_Dossier_', 'filename=Debt_Collection_Profile_')

with open('backend/website/application.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('Patched application.py!')
