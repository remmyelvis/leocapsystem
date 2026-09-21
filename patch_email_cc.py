import re

path = 'backend/website/system_email_utils.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Change function signature
old_def = "def send_email_smtp(recipient, subject, body, isHrEmail, attachments = None):"
new_def = "def send_email_smtp(recipient, subject, body, isHrEmail, attachments = None, cc=None):"
content = content.replace(old_def, new_def)

# Add CC header if present
old_to = "msg['To'] = recipient"
new_to = "msg['To'] = recipient\n    if cc:\n        msg['Cc'] = cc"
content = content.replace(old_to, new_to)

# Wait, we need to pass a list of recipients to `server.send_message` if we want it to actually go to the CC address.
# Luckily `server.send_message(msg)` automatically reads the 'To', 'Cc', and 'Bcc' fields of the `EmailMessage` or `MIME` object and sends it to all of them.
# So just setting msg['Cc'] is enough for smtplib.send_message!

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added CC support to system_email_utils.py")
