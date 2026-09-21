from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

msg = MIMEMultipart()
msg['To'] = 'test@example.com'
msg['Cc'] = 'cc@example.com'

import smtplib
# We can't actually send, but let's see how we can manually construct the to_addrs
to_addrs = [msg['To']]
if msg['Cc']:
    to_addrs.append(msg['Cc'])
print(to_addrs)
