import pdfplumber
import pandas as pd
import re
from datetime import datetime

def unlock_and_parse_mpesa(filepath, password=None):
    extracted_data = []
    try:
        with pdfplumber.open(filepath, password=password) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        for row in table:
                            if not row or len(row) < 6:
                                continue
                            
                            try:
                                # Ensure we are reading the correct columns by looking for strict datetime
                                date_str = str(row[1]).strip()
                                if len(date_str) < 19:
                                    continue
                                
                                try:
                                    # M-Pesa format is EXACTLY YYYY-MM-DD HH:MM:SS
                                    dt = datetime.strptime(date_str[:19], '%Y-%m-%d %H:%M:%S')
                                except ValueError:
                                    continue
                                        
                                desc = str(row[2]).strip() if row[2] else ""
                                ref = str(row[0]).strip() if row[0] else ""
                                
                                def clean_amt(v):
                                    if not v or str(v).strip() == '': return 0.0
                                    # Remove non-numeric chars except dot and minus
                                    v_clean = re.sub(r'[^0-9.-]', '', str(v))
                                    try: return float(v_clean)
                                    except: return 0.0
                                
                                # M-Pesa standard columns
                                # 3: Transaction Status
                                # 4: Paid In
                                # 5: Withdrawn
                                # 6: Balance
                                
                                # Use fixed column indices for M-Pesa
                                paid_in_str = row[4] if len(row) > 4 else "0"
                                withdrawn_str = row[5] if len(row) > 5 else "0"
                                balance_str = row[6] if len(row) > 6 else "0" 

                                paid_in = clean_amt(paid_in_str)
                                withdrawn = clean_amt(withdrawn_str)
                                # Withdrawn is often represented as a negative number in M-Pesa. Convert to positive for logic
                                if withdrawn < 0: withdrawn = abs(withdrawn)
                                
                                balance = clean_amt(balance_str)
                                

                                    
                                extracted_data.append({
                                    'date': dt,
                                    'description': desc,
                                    'reference': ref,
                                    'money_in': paid_in,
                                    'money_out': withdrawn,
                                    'balance': balance
                                })
                            except Exception as e:
                                continue
    except pdfplumber.pdfminer.pdfdocument.PDFPasswordIncorrect:
        return {"error": "Incorrect password", "data": []}
    except Exception as e:
        return {"error": str(e), "data": []}
        
    # Sort data by date
    extracted_data = sorted(extracted_data, key=lambda x: x['date'])
    return {"error": None, "data": extracted_data}


def unlock_and_parse_bank(filepath, password=None):
    extracted_data = []
    try:
        with pdfplumber.open(filepath, password=password) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if not row or len(row) < 4:
                            continue
                        
                        # Generic Bank Heuristic:
                        # Find the first column that looks like a date
                        date_idx = -1
                        dt = None
                        for i, cell in enumerate(row):
                            if cell:
                                cell_str = str(cell).strip()
                                try:
                                    # Very loose date parsing
                                    if len(cell_str) >= 8 and any(char.isdigit() for char in cell_str):
                                        dt = pd.to_datetime(cell_str).to_pydatetime()
                                        date_idx = i
                                        break
                                except:
                                    pass
                        
                        if date_idx == -1 or not dt:
                            continue
                            
                        # Combine remaining columns for description
                        desc_parts = []
                        amts = []
                        
                        for i, cell in enumerate(row):
                            if i == date_idx or not cell:
                                continue
                            cell_str = str(cell).strip().replace(',', '')
                            # Is it a number?
                            try:
                                val = float(cell_str)
                                amts.append(val)
                            except ValueError:
                                desc_parts.append(str(cell).strip().replace('\n', ' '))
                                
                        desc = " ".join(desc_parts)
                        
                        money_in = 0.0
                        money_out = 0.0
                        balance = 0.0
                        
                        if len(amts) == 1:
                            if amts[0] > 0: money_in = amts[0]
                            else: money_out = abs(amts[0])
                        elif len(amts) >= 2:
                            if len(amts) == 3:
                                money_out = abs(amts[0])
                                money_in = abs(amts[1])
                                balance = amts[2]
                            else:
                                # 2 numbers: Usually it's either (Amount, Balance) or (Money Out, Money In)
                                # If the second number is massive, it's likely the balance.
                                # But safely, if we only have 2, let's assume Debit and Credit, no balance.
                                # Wait, if it's Amount and Balance, we don't know if it's debit or credit without a sign.
                                # Let's assume standard (Money Out, Money In) if they are normal, or if one is clearly a balance...
                                # Actually, standard Kenyan bank statements often just drop the empty column, so 2 numbers could be (Amount, Balance).
                                # Let's just do a naive check: if the last column is very large compared to the first, it's a balance.
                                val1 = abs(amts[0])
                                val2 = abs(amts[1])
                                if val2 > val1 * 5 and val2 > 10000:
                                    # highly likely val2 is balance. But is val1 in or out? 
                                    # Fallback: assume money_out for safety
                                    money_out = val1
                                    balance = val2
                                else:
                                    money_out = val1
                                    money_in = val2
                                
                        extracted_data.append({
                            'date': dt,
                            'description': desc,
                            'reference': '',
                            'money_in': money_in,
                            'money_out': money_out,
                            'balance': balance
                        })
    except pdfplumber.pdfminer.pdfdocument.PDFPasswordIncorrect:
        return {"error": "Incorrect password", "data": []}
    except Exception as e:
        return {"error": str(e), "data": []}
        
    return {"error": None, "data": extracted_data}
