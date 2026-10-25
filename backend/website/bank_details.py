"""Where borrowers are told to send money, in one place. In the demo these are plainly made-up sample details, so a PDF or
Excel file produced there can never send a real payment to the lender's (or anyone's) real account."""
import os

DEMO = os.getenv("DEMO_MODE") == "True"

ACCOUNT_NAME = "SAMPLE LENDER LTD" if DEMO else "LEOCAP INVEST"
BANK = "Sample Bank (demo)" if DEMO else "NCBA Bank Kenya PLC"
BANK_UPPER = BANK.upper()
BANK_SHORT = "Sample Bank" if DEMO else "NCBA Bank"
ACCOUNT_NUMBER = "0000 0000 0001" if DEMO else "9710240013"
BRANCH = "DEMO" if DEMO else "PRESTIGE"
SWIFT = "SAMPLEXX" if DEMO else "CBAFKENX"
MPESA_NUMBER = "0700 000 000" if DEMO else "0722221502"
PAYBILL = "000000" if DEMO else "880100"
PAYBILL_ACCOUNT = "000000" if DEMO else "005605"
# Nakama's repayment reports name Nakama's own account
NAKAMA_ACCOUNT = {"account_name": "SAMPLE EMPLOYER (DEMO)" if DEMO else "ELVIS KAREMI NYAGA",
                  "account_number": "0000 0000 0002" if DEMO else "8460950033"}
