import re

path = 'backend/website/company.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_extract = """
    to_email = request.form.get('to_email')
    subject = request.form.get('subject')
    message = request.form.get('message')
"""

new_extract = """
    to_email = request.form.get('to_email')
    cc_email = request.form.get('cc_email')
    subject = request.form.get('subject')
    message = request.form.get('message')
"""
content = content.replace(old_extract, new_extract)

old_send = "success, error_msg = send_email_smtp(to_email, subject, message, isHrEmail=False, attachments=attachment_paths)"
new_send = "success, error_msg = send_email_smtp(to_email, subject, message, isHrEmail=False, attachments=attachment_paths, cc=cc_email)"
content = content.replace(old_send, new_send)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added CC support to company.py onboard endpoint")
