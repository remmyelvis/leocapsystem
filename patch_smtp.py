import re

path = 'backend/website/system_email_utils.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# We'll replace the smtp.gmail.com block
old_smtp = """
    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            logging.debug(f"Attempting SMTP login with: {sender_address}")
            server.set_debuglevel(1)
            server.starttls()
            server.login(sender_address, sender_password)
            server.send_message(msg)
"""

new_smtp = """
    smtp_host = os.getenv("SMTP_HOST", "mail.leocapinvest.co.ke")
    smtp_port = int(os.getenv("SMTP_PORT", 465))

    try:
        # Use SMTP_SSL for port 465
        with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
            logging.debug(f"Attempting SMTP login with: {sender_address}")
            server.set_debuglevel(1)
            server.login(sender_address, sender_password)
            server.send_message(msg)
"""

content = content.replace(old_smtp.strip(), new_smtp.strip())

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched SMTP connection code")
