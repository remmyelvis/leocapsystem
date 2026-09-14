from website.models import ParsedTransaction
from datetime import timedelta
import numpy as np

def detect_recurring_income(applicant_id):
    """
    Analyzes all income to detect recurring patterns (Salary/Business).
    """
    inflows = ParsedTransaction.query.filter(
        ParsedTransaction.applicant_id == applicant_id,
        ParsedTransaction.money_in > 0,
        ParsedTransaction.is_internal_transfer == False
    ).order_by(ParsedTransaction.date.asc()).all()
    
    # Group by description (simplified grouping, in reality needs fuzzy matching)
    groups = {}
    for t in inflows:
        # Simplistic fuzzy: first 3 words
        words = str(t.description).upper().split()
        key = " ".join(words[:3]) if len(words) >= 3 else str(t.description).upper()
        
        if key not in groups:
            groups[key] = []
        groups[key].append(t)
        
    results = []
    
    for key, txns in groups.items():
        if len(txns) >= 3: # Need at least 3 occurrences to gauge recurrence
            amounts = [t.money_in for t in txns]
            avg_amt = sum(amounts) / len(amounts)
            std_amt = np.std(amounts) if len(amounts) > 1 else 0
            
            # Date variance
            dates = [t.date for t in txns]
            diffs = [(dates[i] - dates[i-1]).days for i in range(1, len(dates))]
            avg_days = sum(diffs) / len(diffs) if diffs else 0
            
            # If it happens roughly monthly (25 to 35 days)
            if 25 <= avg_days <= 35:
                confidence = 100 - min(100, (std_amt / avg_amt) * 100)
                if confidence > 50:
                    results.append({
                        "employer": key,
                        "average_salary": avg_amt,
                        "confidence": confidence,
                        "consistency": f"{len(txns)} occurrences, avg {avg_days:.1f} days apart"
                    })
                    
    # Sort by highest confidence and amount
    results.sort(key=lambda x: (x['confidence'], x['average_salary']), reverse=True)
    return results
