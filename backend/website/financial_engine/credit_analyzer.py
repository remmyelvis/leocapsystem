from website.models import ParsedTransaction, StatementUpload
from sqlalchemy import func
from collections import Counter
import re

def _analyze_txns_subset(txns):
    # Categories (M-Pesa leaning)
    shopping_txns = [t for t in txns if t.category and t.category.lower() in ['shopping', 'groceries', 'household']]
    utility_txns = [t for t in txns if t.category and t.category.lower() in ['utilities', 'electricity', 'water']]
    
    # Categories (Bank leaning)
    bank_fees_txns = [t for t in txns if any(x in str(t.description).lower() for x in ['charge', 'fee', 'sms', 'excise', 'ledger'])]
    transfers_out_txns = [t for t in txns if any(x in str(t.description).lower() for x in ['mpesa', 'pesalink', 'transfer', 'rtgs', 'eft', 'mps']) and t.money_out > 0]
    
    # Extract entities
    entities_in = [t.description.split('-')[0].strip() for t in txns if t.money_in > 0 and t.description]
    entities_out = [t.description.split('-')[0].strip() for t in txns if t.money_out > 0 and t.description]
    
    frequent_in = Counter(entities_in).most_common(5)
    frequent_out = Counter(entities_out).most_common(5)
    
    credit_keywords = ['fuliza', 'm-shwari', 'tala', 'branch', 'zenka', 'kcb', 'ncba', 'loan', 'repayment']
    active_lenders = set()
    for t in txns:
        desc = str(t.description).lower()
        if 'fuliza' in desc: active_lenders.add('Fuliza (Safaricom)')
        elif 'm-shwari' in desc: active_lenders.add('M-Shwari')
        elif 'kcb m-pesa' in desc: active_lenders.add('KCB M-Pesa')
        elif 'tala' in desc: active_lenders.add('Tala')
        elif 'branch' in desc: active_lenders.add('Branch')
        elif 'zenka' in desc: active_lenders.add('Zenka')
        elif t.category == 'debt': 
            name = desc.split('-')[0].strip().title()
            if len(name) > 2: active_lenders.add(name)
            
    # Calculate Score out of 400 (Conservative)
    score = 200 # Base starting point
    details = []
    
    if not txns:
        return {
            "score": 0,
            "max_score": 400,
            "frequent_inflows": [],
            "frequent_outflows": [],
            "utilities": {"count": 0, "total": 0},
            "shopping": {"count": 0, "total": 0},
            "bank_fees": {"count": 0, "total": 0},
            "transfers_out": {"count": 0, "total": 0},
            "active_credit_facilities": list(active_lenders),
            "scoring_details": [{"factor": "No data", "impact": 0}]
        }
        
    if len(utility_txns) > 5:
        score += 30
        details.append({"factor": "Consistent utility payments", "impact": "+30"})
    elif len(utility_txns) > 0:
        score += 10
        details.append({"factor": "Some utility payments", "impact": "+10"})
        
    if len(shopping_txns) > 10:
        score += 20
        details.append({"factor": "Regular shopping/living expenses", "impact": "+20"})
        
    if len(active_lenders) == 0:
        score += 50
        details.append({"factor": "No competing credit facilities", "impact": "+50"})
    elif len(active_lenders) <= 2:
        score += 10
        details.append({"factor": "Manageable credit facilities", "impact": "+10"})
    elif len(active_lenders) > 4:
        score -= 60
        details.append({"factor": "High number of competing lenders", "impact": "-60"})
    else:
        score -= 20
        details.append({"factor": "Multiple credit facilities", "impact": "-20"})
        
    fuliza_txns = [t for t in txns if 'fuliza' in str(t.description).lower()]
    if len(fuliza_txns) > 10:
        score -= 50
        details.append({"factor": "High Fuliza dependency", "impact": "-50"})
    elif len(fuliza_txns) > 0:
        score -= 20
        details.append({"factor": "Occasional Fuliza usage", "impact": "-20"})
        
    total_in = sum(t.money_in for t in txns)
    total_out = sum(t.money_out for t in txns)
    if total_in > 0:
        ratio = total_out / total_in
        if ratio < 0.8:
            score += 50
            details.append({"factor": "Healthy savings ratio (<80% spend)", "impact": "+50"})
        elif ratio > 0.95:
            score -= 40
            details.append({"factor": "High spend ratio (>95%)", "impact": "-40"})
            
    score = max(0, min(400, int(score)))
    
    return {
        "score": score,
        "max_score": 400,
        "frequent_inflows": [{"name": k.title() if isinstance(k, str) else k, "count": v} for k, v in frequent_in],
        "frequent_outflows": [{"name": k.title() if isinstance(k, str) else k, "count": v} for k, v in frequent_out],
        "utilities": {
            "count": len(utility_txns),
            "total": sum(t.money_out for t in utility_txns)
        },
        "shopping": {
            "count": len(shopping_txns),
            "total": sum(t.money_out for t in shopping_txns)
        },
        "bank_fees": {
            "count": len(bank_fees_txns),
            "total": sum(t.money_out for t in bank_fees_txns)
        },
        "transfers_out": {
            "count": len(transfers_out_txns),
            "total": sum(t.money_out for t in transfers_out_txns)
        },
        "active_credit_facilities": list(active_lenders),
        "scoring_details": details
    }

def generate_credit_analysis(applicant_id):
    txns = ParsedTransaction.query.join(StatementUpload, ParsedTransaction.statement_id == StatementUpload.id).filter(
        ParsedTransaction.applicant_id == applicant_id,
        ParsedTransaction.is_internal_transfer == False
    ).add_columns(StatementUpload.source).all()
    
    all_txns = [t[0] for t in txns]
    mpesa_txns = [t[0] for t in txns if t.source == 'mpesa']
    bank_txns = [t[0] for t in txns if t.source == 'bank']
    
    combined = _analyze_txns_subset(all_txns)
    mpesa = _analyze_txns_subset(mpesa_txns) if mpesa_txns else None
    bank = _analyze_txns_subset(bank_txns) if bank_txns else None
    
    return {
        "score": combined["score"],
        "scoring_details": combined["scoring_details"],
        "combined": combined,
        "mpesa": mpesa,
        "bank": bank
    }
