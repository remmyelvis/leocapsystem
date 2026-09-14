from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from website.models import db, StatementUpload, ParsedTransaction
from website.parsers.pdf_parser import unlock_and_parse_mpesa
from website.financial_engine.transaction_classifier import classify_transactions, teach_keyword
from website.financial_engine.reconciliation_engine import reconcile_internal_transfers
from website.financial_engine.income_detector import detect_recurring_income
from website.financial_engine.mpesa_analyzer import analyze_mpesa
import os
from werkzeug.utils import secure_filename

statement_analysis_bp = Blueprint('statement_analysis', __name__)

@statement_analysis_bp.route('/api/statements/upload', methods=['POST'])
@jwt_required()
def upload_statement():
    user_id = get_jwt_identity()
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    password = request.form.get('password')
    source = request.form.get('source', 'mpesa')
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    filename = secure_filename(file.filename)
    filepath = os.path.join('uploads', filename)
    os.makedirs('uploads', exist_ok=True)
    file.save(filepath)
    
    upload = StatementUpload(
        applicant_id=user_id,
        filename=filename,
        filepath=filepath,
        source=source,
        password=password
    )
    db.session.add(upload)
    db.session.commit()
    
    # Trigger Parsing
    if source == 'mpesa':
        result = unlock_and_parse_mpesa(filepath, password)
        if result['error']:
            upload.parsing_error = result['error']
            db.session.commit()
            return jsonify({'error': result['error']}), 400
            
        # Save transactions
        for tx in result['data']:
            pt = ParsedTransaction(
                applicant_id=user_id,
                statement_id=upload.id,
                date=tx['date'],
                description=tx['description'],
                reference=tx['reference'],
                money_in=tx['money_in'],
                money_out=tx['money_out'],
                balance=tx['balance']
            )
            db.session.add(pt)
            
        upload.is_parsed = True
        db.session.commit()
        
        # Run Engines
        reconcile_internal_transfers(user_id)
        classify_transactions(upload.id)
        
        return jsonify({'success': True, 'message': f'Parsed {len(result["data"])} transactions'})
        
    return jsonify({'error': 'Source not supported yet'}), 400


@statement_analysis_bp.route('/api/statements/analysis/<string:applicant_id>', methods=['GET'])
@jwt_required()
def get_analysis(applicant_id):
    income = detect_recurring_income(applicant_id)
    mpesa = analyze_mpesa(applicant_id)
    
    txns = ParsedTransaction.query.filter_by(applicant_id=applicant_id).order_by(ParsedTransaction.date.desc()).limit(100).all()
    
    return jsonify({
        'income_detection': income,
        'mpesa_metrics': mpesa,
        'recent_transactions': [t.to_dict() for t in txns]
    })


@statement_analysis_bp.route('/api/statements/learn', methods=['POST'])
@jwt_required()
def learn_keyword():
    admin_id = get_jwt_identity()
    data = request.json
    
    keyword = data.get('keyword')
    category = data.get('category')
    
    if not keyword or not category:
        return jsonify({'error': 'Missing data'}), 400
        
    teach_keyword(keyword, category, admin_id)
    
    # Retroactively apply to unclassified or existing? 
    # For now, just saved for future.
    return jsonify({'success': True})
