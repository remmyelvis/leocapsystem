from website.models import ParsedTransaction, db
from datetime import timedelta

def reconcile_internal_transfers(applicant_id):
    """
    Finds double-counted transactions across all statements for the applicant.
    Matches money_out == money_in within a 48 hour window where it looks like a transfer.
    """
    all_txns = ParsedTransaction.query.filter_by(applicant_id=applicant_id).order_by(ParsedTransaction.date.asc()).all()
    
    outflows = [t for t in all_txns if t.money_out > 0 and not t.is_internal_transfer]
    inflows = [t for t in all_txns if t.money_in > 0 and not t.is_internal_transfer]
    
    for out_t in outflows:
        # Potential match window
        min_date = out_t.date - timedelta(hours=48)
        max_date = out_t.date + timedelta(hours=48)
        
        for in_t in inflows:
            if in_t.is_internal_transfer:
                continue
                
            if in_t.date >= min_date and in_t.date <= max_date:
                # Same exact amount?
                if abs(in_t.money_in - out_t.money_out) < 0.01:
                    # Mark both as internal transfers
                    out_t.is_internal_transfer = True
                    out_t.category = 'Internal Transfer (Money Out)'
                    
                    in_t.is_internal_transfer = True
                    in_t.category = 'Internal Transfer (Money In)'
                    break # Move to next outflow
                    
    db.session.commit()
