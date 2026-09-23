from website.models import ParsedTransaction, StatementUpload
from sqlalchemy import func
from collections import Counter
import re
from datetime import timedelta

def _analyze_txns_subset(txns, loan_ask=None):
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
    
    active_lenders = set()
    heavy_credit_dependency_flags = []
    
    heavy_credit_keywords = ['extension', 'rollover', 'reschedule', 'restructuring', 'penalty', 'late fee', 'arrears', 'collection', 'recovery', 'default', 'overdue']
    
    digital_lender_mapping = {
        'fuliza': 'Fuliza', 'm-shwari': 'M-Shwari', 'kcb m-pesa': 'KCB M-Pesa', 'tala': 'Tala', 'branch': 'Branch',
        'zenka': 'Zenka', 'okash': 'Okash', 'fairmoney': 'FairMoney', 'migo': 'Migo', 'pesapal': 'PesaPal',
        'pesapap': 'PesaPap', 'timiza': 'Timiza', 'hustler fund': 'Hustler Fund', 'eazzy loan': 'Eazzy Loan',
        'ncba loop': 'NCBA Loop', 'loop': 'Loop', 'berry': 'Berry', 'pesaflex': 'PesaFlex',
        'kcb loan': 'KCB', 'equity loan': 'Equity', 'absa loan': 'Absa', 'co-op loan': 'Co-op Bank', 'family bank loan': 'Family Bank'
    }

    for t in txns:
        desc = str(t.description).lower()
        # Find explicit lenders
        for key, name in digital_lender_mapping.items():
            if key in desc:
                active_lenders.add(name)
        
        # General loan indicators mapping to category
        if any(w in desc for w in ['loan', 'credit', 'advance', 'overdraft', 'repayment', 'financing']):
            if t.category != 'debt':
                name = desc.split('-')[0].strip().title()
                if len(name) > 2 and name not in ['Loan', 'Credit', 'Advance', 'Overdraft', 'Repayment', 'Financing']:
                    active_lenders.add(name)

        if t.category == 'debt': 
            name = desc.split('-')[0].strip().title()
            if len(name) > 2: active_lenders.add(name)
            
        # Heavy dependency indicators
        if any(w in desc for w in heavy_credit_keywords):
            heavy_credit_dependency_flags.append({"date": t.date.isoformat() if t.date else None, "description": t.description})
            
    # Gambling and Lipa mdogo mdogo
    gambling_keywords = [
        'betting', ' bet ', 'wager', 'gambling', 'gaming', 'casino', 'jackpot', 'lottery', 'lotto',
        'sports betting', 'sportsbook', 'betslip', 'virtual games', 'slots', 'roulette', 'poker', 
        'crash', 'aviator', 'prediction', 'football betting', 'live betting',
        'sportpesa', 'betika', 'odibets', 'betway', '1xbet', 'mozzart', 'shabiki', 'betafriq',
        'odibet', 'premier bet', 'elitebet', 'bangbet', 'dafabet', 'melbet', 'mostbet', 'betlion',
        'betboss', 'betgr8', '22bet', '888sport', 'hollywoodbets', '1win', 'parimatch', '10bet', 'bet365', 'supabet'
    ]
    lipa_mdogo_keywords = ['m-kopa', 'watu', 'mkopa', 'lipa later', 'dlight', 'sun king', 'sunking', 'd-light', 'kopa', 'm kopa']
    
    gambling_instances = []
    lipa_mdogo_instances = []
    suspicious_payments = []
    money_laundering_indications = []
    
    highest_balance = 0
    lowest_balance = float('inf')
    highest_money_in = 0
    highest_money_out = 0
    
    if txns:
        highest_balance = max(t.balance for t in txns if t.balance is not None)
        lowest_balance = min(t.balance for t in txns if t.balance is not None)
        highest_money_in = max(t.money_in for t in txns if t.money_in is not None)
        highest_money_out = max(t.money_out for t in txns if t.money_out is not None)

    # Calculate duration of highest/lowest balance (very basic heuristic based on time difference between txns)
    # Sort txns by date
    sorted_txns = sorted(txns, key=lambda x: x.date) if txns else []
    
    high_bal_duration = timedelta(0)
    low_bal_duration = timedelta(0)
    
    for i in range(len(sorted_txns) - 1):
        curr_t = sorted_txns[i]
        next_t = sorted_txns[i+1]
        if curr_t.balance is not None:
            time_diff = next_t.date - curr_t.date
            if curr_t.balance >= highest_balance * 0.9: # Within 10% of highest
                high_bal_duration += time_diff
            if curr_t.balance <= lowest_balance + (highest_balance * 0.1): # Within 10% of lowest (or near absolute zero)
                low_bal_duration += time_diff

    # Rule-based flags
    for i, t in enumerate(sorted_txns):
        desc = str(t.description).lower()
        if any(g in desc for g in gambling_keywords):
            gambling_instances.append({"date": t.date.isoformat() if t.date else None, "amount": t.money_out, "description": t.description})
        if any(l in desc for l in lipa_mdogo_keywords):
            lipa_mdogo_instances.append({"date": t.date.isoformat() if t.date else None, "amount": t.money_out, "description": t.description})
            
        # Suspicious: Large round numbers at odd hours (12AM - 4AM)
        if t.date and 0 <= t.date.hour <= 4 and (t.money_in > 10000 or t.money_out > 10000) and (t.money_in % 1000 == 0 or t.money_out % 1000 == 0):
            suspicious_payments.append({"date": t.date.isoformat(), "amount": t.money_in or t.money_out, "reason": "Large round transaction at odd hour", "description": t.description})
            
        # Money Laundering: Rapid IN and OUT (structuring/layering heuristic)
        if t.money_in > 50000 and i < len(sorted_txns) - 1:
            next_t = sorted_txns[i+1]
            if next_t.money_out > 45000 and (next_t.date - t.date).total_seconds() < 3600:
                money_laundering_indications.append({"date": t.date.isoformat(), "amount": t.money_in, "reason": "Rapid large IN and OUT transfer within 1 hour", "description": f"IN: {t.description}, OUT: {next_t.description}"})

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
            "scoring_details": [{"factor": "No data", "impact": 0}],
            "advanced_metrics": {}
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
        
    if len(gambling_instances) > 10:
        score -= 40
        details.append({"factor": "Frequent gambling", "impact": "-40"})
        
    if len(money_laundering_indications) > 0:
        score -= 100
        details.append({"factor": "Suspicious rapid in/out transfers detected", "impact": "-100"})
        
    if len(heavy_credit_dependency_flags) > 0:
        score -= 60
        details.append({"factor": "Signs of heavy credit distress (arrears, penalties, recovery)", "impact": "-60"})

    total_in = sum(t.money_in for t in txns)
    total_out = sum(t.money_out for t in txns)
    avg_monthly_in = total_in / 6.0 if total_in > 0 else 0 # Assuming 6 months typical statement
    
    if total_in > 0:
        ratio = total_out / total_in
        if ratio < 0.8:
            score += 50
            details.append({"factor": "Healthy savings ratio (<80% spend)", "impact": "+50"})
        elif ratio > 0.95:
            score -= 40
            details.append({"factor": "High spend ratio (>95%)", "impact": "-40"})

    # Loan Ask Analysis (33% Retention Heuristic)
    loan_ask_details = None
    avg_retention_per_month = avg_monthly_in / 3.0 if avg_monthly_in > 0 else 0
    
    if loan_ask and loan_ask > 0:
        if avg_retention_per_month > 0:
            ask_ratio_to_retention = loan_ask / avg_retention_per_month
            if ask_ratio_to_retention > 3:
                score -= 50
                details.append({"factor": f"Loan ask ({loan_ask}) exceeds 3x average monthly retention", "impact": "-50"})
            elif ask_ratio_to_retention <= 1.5:
                score += 30
                details.append({"factor": f"Loan ask ({loan_ask}) is highly affordable (<=1.5x monthly retention)", "impact": "+30"})
        
        loan_ask_details = {
            "amount_requested": loan_ask,
            "avg_monthly_inflow": round(avg_monthly_in, 2),
            "avg_monthly_retention": round(avg_retention_per_month, 2),
            "ratio_to_retention": round(loan_ask / avg_retention_per_month, 2) if avg_retention_per_month > 0 else None,
            "affordability": "High Risk" if avg_retention_per_month == 0 or (loan_ask / avg_retention_per_month) > 3 else "Moderate Risk" if (loan_ask / avg_retention_per_month) > 1.5 else "Low Risk"
        }
            
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
        "scoring_details": details,
        "advanced_metrics": {
            "highest_balance": highest_balance,
            "lowest_balance": lowest_balance,
            "highest_money_in": highest_money_in,
            "highest_money_out": highest_money_out,
            "duration_highest_balance_days": round(high_bal_duration.total_seconds() / 86400, 1),
            "duration_lowest_balance_days": round(low_bal_duration.total_seconds() / 86400, 1),
            "gambling_instances": gambling_instances[:10],
            "heavy_credit_dependency_flags": heavy_credit_dependency_flags[:10],
            "lipa_mdogo_mdogo_instances": lipa_mdogo_instances[:10],
            "suspicious_payments": suspicious_payments[:5],
            "money_laundering_indications": money_laundering_indications[:5],
            "loan_ask_analysis": loan_ask_details
        }
    }

def generate_credit_analysis(applicant_id, loan_ask=None):
    txns = ParsedTransaction.query.join(StatementUpload, ParsedTransaction.statement_id == StatementUpload.id).filter(
        ParsedTransaction.applicant_id == applicant_id,
        ParsedTransaction.is_internal_transfer == False
    ).add_columns(StatementUpload.source).all()
    
    all_txns = [t[0] for t in txns]
    mpesa_txns = [t[0] for t in txns if t.source == 'mpesa']
    bank_txns = [t[0] for t in txns if t.source == 'bank']
    
    combined = _analyze_txns_subset(all_txns, loan_ask)
    mpesa = _analyze_txns_subset(mpesa_txns, loan_ask) if mpesa_txns else None
    bank = _analyze_txns_subset(bank_txns, loan_ask) if bank_txns else None
    
    return {
        "score": combined["score"],
        "scoring_details": combined["scoring_details"],
        "combined": combined,
        "mpesa": mpesa,
        "bank": bank
    }
