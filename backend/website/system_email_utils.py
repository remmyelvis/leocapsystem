import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
import logging

from dotenv import load_dotenv


def send_email_smtp(recipient, subject, body, isHrEmail, attachments = None):
    load_dotenv()
    sender_address = os.getenv("SENDER_ADDRESS")
    sender_password = os.getenv("SENDER_PASSWORD")

    msg = MIMEMultipart()
    msg['Subject'] = subject
    msg['From'] = sender_address
    msg['To'] = recipient

    msg.attach(MIMEText(body, 'plain'))

    if attachments:
        for file_path in attachments:
            try:
                with open(file_path, 'rb') as f:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(f.read())

                encoders.encode_base64(part)

                filename = os.path.basename(file_path)
                part.add_header(
                    "Content-Disposition",
                    f'attachment; filename="{filename}"'
                )

                msg.attach(part)
            except Exception as e:
                return False, str(e)



    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            logging.debug(f"Attempting SMTP login with: {sender_address}")
            server.set_debuglevel(1)
            server.starttls()
            server.login(sender_address, sender_password)
            server.send_message(msg)
            logging.info(f"Email sent successfully from {sender_address}")
        return True, None
    except Exception as e:
        logging.error(f"Failed to send email from {sender_address}: {e}", exc_info=True)
        return False, str(e)
