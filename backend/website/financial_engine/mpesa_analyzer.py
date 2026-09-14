from website.models import ParsedTransaction

def analyze_mpesa(applicant_id):
    # Only analyze txns from M-Pesa statements
    txns = ParsedTransaction.query.filter(
        ParsedTransaction.applicant_id == applicant_id,
        ParsedTransaction.is_internal_transfer == False
    ).all()
    
    total_in = sum(t.money_in for t in txns)
    total_out = sum(t.money_out for t in txns)
    
    # Specific M-Pesa patterns
    paybill_till = sum(1 for t in txns if 'paybill' in str(t.description).lower() or 'till' in str(t.description).lower())
    fuliza = sum(1 for t in txns if 'fuliza' in str(t.description).lower())
    withdrawals = sum(1 for t in txns if 'withdrawal' in str(t.description).lower() or 'agent' in str(t.description).lower())
    
    return {
        "total_inflows": total_in,
        "total_outflows": total_out,
        "transaction_count": len(txns),
        "paybill_till_count": paybill_till,
        "fuliza_count": fuliza,
        "withdrawal_count": withdrawals,
        "dependency_ratio": (total_out / total_in * 100) if total_in > 0 else 0
    }
