import re

path = 'backend/website/system_email_utils.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_send = "server.send_message(msg)"
new_send = """
            to_addrs = [recipient]
            if cc:
                # Handle comma separated CCs just in case
                cc_list = [c.strip() for c in cc.split(",") if c.strip()]
                to_addrs.extend(cc_list)
            
            server.sendmail(sender_address, to_addrs, msg.as_string())
"""

content = content.replace(old_send, new_send.strip())

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched send_message to sendmail for reliable CC delivery")
