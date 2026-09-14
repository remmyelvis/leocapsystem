import re
from website.models import TransactionKeywordMapping, ParsedTransaction, db

DEFAULT_RULES = [
    # INCOME
    (r'\b(salary|payroll|wages)\b', 'Salary'),
    (r'\b(dividend|interest)\b', 'Investment income'),
    (r'\b(received from.*mpesa)\b', 'M-Pesa receipts'),
    # EXPENSES
    (r'\b(kplc|token|water|nairobi water)\b', 'Utilities'),
    (r'\b(fuel|shell|rubis|total|petrol)\b', 'Fuel'),
    (r'\b(school|university|academy)\b', 'School fees'),
    (r'\b(naivas|carrefour|quickmart|supermarket)\b', 'Shopping'),
    (r'\b(hospital|pharmacy|clinic|nhif)\b', 'Medical'),
    (r'\b(safaricom.*airtime|airtel)\b', 'Airtime'),
    # DEBT
    (r'\b(fuliza)\b', 'Fuliza/overdraft'),
    (r'\b(kcb m-pesa loan|mshwari loan|tala|branch)\b', 'Mobile loan repayment'),
    (r'\b(sacco)\b', 'SACCO loan'),
]

def classify_transactions(statement_id):
    # Load dynamic keywords from DB
    mappings = TransactionKeywordMapping.query.all()
    dynamic_rules = [(re.escape(m.keyword.lower()), m.category) for m in mappings]
    
    # Combine (Dynamic overrides default)
    all_rules = dynamic_rules + DEFAULT_RULES
    compiled_rules = [(re.compile(pattern, re.IGNORECASE), category) for pattern, category in all_rules]

    txns = ParsedTransaction.query.filter_by(statement_id=statement_id).all()
    
    for txn in txns:
        if txn.category:
            continue # already classified by user manually or internal transfer
            
        desc = (txn.description or "").lower()
        matched = False
        
        for regex, category in compiled_rules:
            if regex.search(desc):
                txn.category = category
                matched = True
                break
                
        if not matched:
            if txn.money_in > 0:
                txn.category = 'Other income'
            elif txn.money_out > 0:
                txn.category = 'Other'
                
    db.session.commit()

def teach_keyword(keyword, category, admin_id=None):
    existing = TransactionKeywordMapping.query.filter_by(keyword=keyword.lower()).first()
    if existing:
        existing.category = category
    else:
        new_map = TransactionKeywordMapping(keyword=keyword.lower(), category=category, added_by=admin_id)
        db.session.add(new_map)
    db.session.commit()
