import time
import os
import json
import google.generativeai as genai
from website.models import ParsedTransaction

def _init_gemini():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("WARNING: GEMINI_API_KEY is not set.")
        return False
    genai.configure(api_key=api_key)
    return True

def generate_statement_narrative(applicant_id, txns, mpesa_metrics, credit_analysis):
    if not _init_gemini():
        return "Gemini API key not configured."
        
    try:
        model = genai.GenerativeModel('gemini-3.5-flash-lite')
        
        # Prepare context payload
        context = {
            "metrics": mpesa_metrics,
            "credit_score": credit_analysis.get("score"),
            "risk_factors": credit_analysis.get("scoring_details", []),
            "transactions": [{"date": str(t.date), "desc": t.description, "in": t.money_in, "out": t.money_out, "bal": t.balance} for t in txns[:200]] # Limit to recent 200 to save tokens/time
        }
        
        prompt = f"""
        You are a senior credit risk analyst at LeoCap (a Kenyan lending company).
        Analyze the following financial data for an applicant and provide a concise 2-3 paragraph executive summary of their financial behavior.
        Focus on liquidity, spending patterns, credit dependency (Fuliza, M-Shwari, etc.), and any red flags.
        Do not use markdown headers, just return a clean text narrative.
        
        Data: {json.dumps(context)}
        """
        
        for attempt in range(3):
            try:
                response = model.generate_content(prompt)
                return response.text.strip()
            except Exception as e:
                if "429" in str(e) and attempt < 3:
                    import re as regex
                    match = regex.search(r'retry in (\d+\.?\d*)s', str(e))
                    wait_time = float(match.group(1)) + 2 if match else 20
                    print(f"Rate limit hit. Waiting {wait_time} seconds before retry...")
                    time.sleep(wait_time)
                    continue
                return f"AI Analysis failed: {str(e)}"
    except Exception as e:
        return f"AI Analysis failed: {str(e)}"

def chat_with_statement(applicant_id, query):
    if not _init_gemini():
        return "Gemini API key not configured."
        
    try:
        txns = ParsedTransaction.query.filter_by(applicant_id=applicant_id).order_by(ParsedTransaction.date.desc()).limit(1000).all()
        model = genai.GenerativeModel('gemini-3.5-flash-lite')
        
        txns_context = [{"date": str(t.date), "desc": t.description, "in": t.money_in, "out": t.money_out, "bal": t.balance} for t in txns]
        
        prompt = f"""
        You are a helpful AI assistant integrated into a loan management system.
        An admin is asking a question about an applicant's bank/M-Pesa statement.
        Answer the question accurately using ONLY the transaction data provided.
        
        Transactions:
        {json.dumps(txns_context)}
        
        Admin's Question: {query}
        """
        
        for attempt in range(3):
            try:
                response = model.generate_content(prompt)
                return response.text.strip()
            except Exception as e:
                if "429" in str(e) and attempt < 2:
                    time.sleep(11)
                    continue
                return f"Chat failed: {str(e)}"
    except Exception as e:
        return f"Chat failed: {str(e)}"
