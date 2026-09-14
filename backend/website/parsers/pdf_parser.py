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
                    # Very naive extraction: assumes headers are usually present, we just grab rows that look like transactions
                    for row in table:
                        if not row or len(row) < 5:
                            continue
                        
                        # Usually M-Pesa format: Receipt, Time, Details, Status, Paid In, Withdrawn, Balance
                        # Let's try to parse the time (usually column 1)
                        try:
                            # e.g., '2023-10-01 14:20:00'
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
                            
                            # Paid In is usually col 4, Withdrawn is col 5, Balance is col 6
                            # We can also detect based on length
                            paid_in = clean_amt(row[4]) if len(row) > 4 else 0.0
                            withdrawn = clean_amt(row[5]) if len(row) > 5 else 0.0
                            balance = clean_amt(row[6]) if len(row) > 6 else 0.0
                            
                            # Fallback if standard mapping fails
                            if paid_in == 0.0 and withdrawn == 0.0:
                                # try to extract from text
                                pass
                                
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
