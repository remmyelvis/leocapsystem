import pdfplumber
import pandas as pd
import re
from datetime import datetime

def unlock_and_parse_mpesa(filepath, password=None):
    extracted_data = []
    try:
        with pdfplumber.open(filepath, password=password) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                table = page.extract_table()
                
                if table:
                    for row in table:
                        if not row or len(row) < 5:
                            continue
                        try:
                            date_str = str(row[1]).strip()
                            if len(date_str) < 10:
                                continue
                            try:
                                dt = datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
                            except ValueError:
                                try:
                                    dt = pd.to_datetime(date_str).to_pydatetime()
                                except:
                                    continue
                                    
                            desc = str(row[2]).strip() if row[2] else ""
                            ref = str(row[0]).strip() if row[0] else ""
                            
                            def clean_amt(v):
                                if not v: return 0.0
                                v = str(v).replace(',', '').strip()
                                try: return float(v)
                                except: return 0.0
                            
                            paid_in = clean_amt(row[4]) if len(row) > 4 else 0.0
                            withdrawn = clean_amt(row[5]) if len(row) > 5 else 0.0
                            balance = clean_amt(row[6]) if len(row) > 6 else 0.0
                                
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
