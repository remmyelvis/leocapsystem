import os

path = 'backend/website/.env'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.startswith("SENDER_ADDRESS="):
        new_lines.append("SENDER_ADDRESS=hr@leocapinvest.co.ke\n")
    elif line.startswith("SENDER_PASSWORD="):
        new_lines.append("SENDER_PASSWORD=4#+zrJXCIR?8ZpK(\n")
    else:
        new_lines.append(line)

new_lines.append("SMTP_HOST=mail.leocapinvest.co.ke\n")
new_lines.append("SMTP_PORT=465\n")

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Updated backend/website/.env")
