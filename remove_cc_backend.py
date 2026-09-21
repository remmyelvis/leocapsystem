import re

# 1. Update company.py
path1 = 'backend/website/company.py'
with open(path1, 'r', encoding='utf-8') as f:
    c1 = f.read()

c1 = c1.replace("    cc_email = request.form.get('cc_email')\n", "")
c1 = c1.replace("attachments=attachment_paths, cc=cc_email)", "attachments=attachment_paths)")

with open(path1, 'w', encoding='utf-8') as f:
    f.write(c1)

# 2. Update system_email_utils.py
path2 = 'backend/website/system_email_utils.py'
with open(path2, 'r', encoding='utf-8') as f:
    c2 = f.read()

c2 = c2.replace("def send_email_smtp(recipient, subject, body, isHrEmail, attachments = None, cc=None):", "def send_email_smtp(recipient, subject, body, isHrEmail, attachments = None):")
c2 = c2.replace("    if cc:\n        msg['Cc'] = cc\n", "")

old_send = """            to_addrs = [recipient]
            if cc:
                # Handle comma separated CCs just in case
                cc_list = [c.strip() for c in cc.split(",") if c.strip()]
                to_addrs.extend(cc_list)
            
            server.sendmail(sender_address, to_addrs, msg.as_string())"""

new_send = "            server.send_message(msg)"

c2 = c2.replace(old_send, new_send)

with open(path2, 'w', encoding='utf-8') as f:
    f.write(c2)

print("Removed CC from backend")
