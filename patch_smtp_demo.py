import re

path = 'backend/website/system_email_utils.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_smtp = """    smtp_host = os.getenv("SMTP_HOST", "mail.leocapinvest.co.ke")
    smtp_port = int(os.getenv("SMTP_PORT", 465))

    try:
        # Use SMTP_SSL for port 465
        with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:"""

new_smtp = """    smtp_host = os.getenv("SMTP_HOST", "mail.leocapinvest.co.ke")
    smtp_port = int(os.getenv("SMTP_PORT", 465))

    if os.getenv("DEMO_MODE") == "True":
        logging.info(f"DEMO MODE ACTIVE: Bypassing actual email sending to {recipient}")
        return True, None

    try:
        # Use SMTP_SSL for port 465
        with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:"""

if "DEMO MODE ACTIVE" not in content:
    content = content.replace(old_smtp, new_smtp)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched system_email_utils.py for DEMO_MODE")
else:
    print("Already patched")
