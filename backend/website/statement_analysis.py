import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from website.models import db, StatementUpload, ParsedTransaction
from website.parsers.pdf_parser import unlock_and_parse_mpesa, unlock_and_parse_bank
from website.financial_engine.transaction_classifier import classify_transactions, teach_keyword
from website.financial_engine.reconciliation_engine import reconcile_internal_transfers
from website.financial_engine.income_detector import detect_recurring_income
from website.financial_engine.mpesa_analyzer import analyze_mpesa
from website.financial_engine.credit_analyzer import generate_credit_analysis
from werkzeug.utils import secure_filename

statement_analysis_bp = Blueprint('statement_analysis', __name__)

@statement_analysis_bp.route('/api/statements/upload', methods=['POST'])
@jwt_required()
def upload_statement():
    user_id = get_jwt_identity()
    applicant_id = request.form.get('applicant_id')
    
    if not applicant_id:
        return jsonify({'error': 'Missing applicant_id'}), 400
        
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
        applicant_id=applicant_id,
        filename=filename,
        filepath=filepath,
        source=source,
        password=password
    )
    db.session.add(upload)
    db.session.commit()
    
    return jsonify({'success': True, 'upload_id': upload.id, 'message': 'Statement uploaded successfully'})

@statement_analysis_bp.route('/api/statements/analyze/<string:upload_id>', methods=['POST'])
@jwt_required()
def trigger_analysis(upload_id):
    upload = StatementUpload.query.get_or_404(upload_id)
    
    if upload.source == 'mpesa':
        result = unlock_and_parse_mpesa(upload.filepath, upload.password)
    else:
        result = unlock_and_parse_bank(upload.filepath, upload.password)
        
    if result['error']:
        upload.parsing_error = result['error']
        db.session.commit()
        return jsonify({'error': result['error']}), 400
        
    # Delete old transactions for this statement if re-running
    ParsedTransaction.query.filter_by(statement_id=upload.id).delete()
    
    for tx in result['data']:
        pt = ParsedTransaction(
            applicant_id=upload.applicant_id,
            statement_id=upload.id,
            date=tx['date'],
            description=tx['description'],
            reference=tx['reference'],
            money_in=tx['money_in'],
            money_out=tx['money_out'],
            balance=tx['balance']
        )
        db.session.add(pt)
    db.session.commit()
    
    classify_transactions(upload.id)
    reconcile_internal_transfers(upload.applicant_id)
    
    return jsonify({'success': True, 'message': f'Parsed {len(result["data"])} transactions'})

@statement_analysis_bp.route('/api/statements/analysis/<string:applicant_id>', methods=['GET'])
@jwt_required()
def get_analysis(applicant_id):
    income = detect_recurring_income(applicant_id)
    mpesa = analyze_mpesa(applicant_id)
    credit_analysis = generate_credit_analysis(applicant_id)
    
    txns = ParsedTransaction.query.filter_by(applicant_id=applicant_id).order_by(ParsedTransaction.date.desc()).limit(100).all()
    
    return jsonify({
        'income_detection': income,
        'mpesa_metrics': mpesa,
        'credit_analysis': credit_analysis,
        'recent_transactions': [t.to_dict() for t in txns]
    })

@statement_analysis_bp.route('/api/statements/learn', methods=['POST'])
@jwt_required()
def learn_keyword():
    admin_id = get_jwt_identity()
    data = request.json
    keyword = data.get('keyword')
    category = data.get('category')
    teach_keyword(keyword, category, admin_id)
    return jsonify({'success': True})
