import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
import logging

from dotenv import load_dotenv
from flask import after_this_request, has_request_context


def run_after_response(task):
    """Run task once the answer has been sent, still inside the request that asked for it, so the caller never waits on
    the mail server. A plain background thread is not dependable on the live host: it only moved while some request was
    being served (an application notice took two minutes to leave and a password-reset email never left), so the work
    rides on the request itself. Outside a request it simply runs."""
    def _safe():
        try:
            task()
        except Exception:
            logging.exception("A task that runs after the response failed")

    if not has_request_context():
        _safe()
        return

    @after_this_request
    def _later(response):
        response.call_on_close(_safe)
        return response


def send_email_smtp(recipient, subject, body, isHrEmail=False, attachments=None, html=False):
    load_dotenv()
    sender_address = os.getenv("SENDER_ADDRESS")
    sender_password = os.getenv("SENDER_PASSWORD")

    msg = MIMEMultipart()
    msg['Subject'] = subject
    msg['From'] = sender_address
    msg['To'] = recipient

    msg.attach(MIMEText(body, 'html' if html else 'plain'))

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



    smtp_host = os.getenv("SMTP_HOST", "mail.leocapinvest.co.ke")
    smtp_port = int(os.getenv("SMTP_PORT", 465))

    if os.getenv("DEMO_MODE") == "True":
        logging.info(f"DEMO MODE ACTIVE: Bypassing actual email sending to {recipient}")
        return True, None

    try:
        # Use SMTP_SSL for port 465
        with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=20) as server:
            logging.debug(f"Attempting SMTP login with: {sender_address}")
            server.login(sender_address, sender_password)
            server.send_message(msg)
            logging.info(f"Email sent successfully from {sender_address}")
        return True, None
    except Exception as e:
        logging.error(f"Failed to send email from {sender_address}: {e}", exc_info=True)
        return False, str(e)


def send_email_background(recipient, subject, body, html=False):
    """Send an email after the answer has been sent, so the caller does not wait for the mail server. A failure is logged, never raised."""
    def _send():
        try:
            ok, error = send_email_smtp(recipient, subject, body, html=html)
            if not ok:
                logging.error("Email to %s failed: %s", recipient, error)
        except Exception:
            logging.exception("Email to %s failed", recipient)

    run_after_response(_send)
