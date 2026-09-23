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
from website.financial_engine.pdf_report_generator import generate_credit_profile_pdf
from flask import send_file
from website.models import Applicant
from website.financial_engine.gemini_agent import generate_statement_narrative, chat_with_statement

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
    loan_ask_str = request.args.get('loan_ask')
    loan_ask = None
    if loan_ask_str:
        try:
            loan_ask = float(loan_ask_str)
        except ValueError:
            pass

    income = detect_recurring_income(applicant_id)
    mpesa = analyze_mpesa(applicant_id)
    credit_analysis = generate_credit_analysis(applicant_id, loan_ask=loan_ask)
    
    txns = ParsedTransaction.query.filter_by(applicant_id=applicant_id).order_by(ParsedTransaction.date.desc()).limit(100).all()
    
    gemini_narrative = generate_statement_narrative(applicant_id, txns, mpesa, credit_analysis)
    return jsonify({
        'income_detection': income,
        'mpesa_metrics': mpesa,
        'credit_analysis': credit_analysis,
        'gemini_narrative': gemini_narrative,
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

@statement_analysis_bp.route('/api/statements/list/<string:applicant_id>', methods=['GET'])
@jwt_required()
def list_statements(applicant_id):
    uploads = StatementUpload.query.filter_by(applicant_id=applicant_id).order_by(StatementUpload.uploaded_at.desc()).all()
    return jsonify([u.to_dict() for u in uploads])

@statement_analysis_bp.route('/api/statements/<string:upload_id>', methods=['DELETE'])
@jwt_required()
def delete_statement(upload_id):
    upload = StatementUpload.query.get_or_404(upload_id)
    # Also delete associated parsed transactions
    ParsedTransaction.query.filter_by(statement_id=upload.id).delete()
    db.session.delete(upload)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Statement deleted'})

@statement_analysis_bp.route('/api/statements/chat/<string:applicant_id>', methods=['POST'])
@jwt_required()
def handle_chat(applicant_id):
    query = request.json.get('message')
    if not query:
        return jsonify({'error': 'Message is required'}), 400
    
    answer = chat_with_statement(applicant_id, query)
    return jsonify({'answer': answer})

@statement_analysis_bp.route('/api/statements/export_report/<string:applicant_id>', methods=['GET'])
@jwt_required()
def export_report(applicant_id):
    loan_ask_str = request.args.get('loan_ask', '0')
    try:
        loan_ask = int(loan_ask_str)
    except:
        loan_ask = 0
        
    applicant = Applicant.query.get(applicant_id)
    if not applicant:
        return jsonify({'error': 'Applicant not found'}), 404
        
    txns = ParsedTransaction.query.filter_by(applicant_id=applicant_id).order_by(ParsedTransaction.date.desc()).all()
    if not txns:
        return jsonify({'error': 'No transactions found'}), 404
        
    # Generate data
    credit_analysis = generate_credit_analysis(applicant_id, loan_ask=loan_ask)
    mpesa = analyze_mpesa(applicant_id)
    
    # Try getting cached narrative if we don't want to hit Gemini again, but for now we generate it
    # Note: in production we would cache this in the DB to avoid 10s wait times
    try:
        narrative = generate_statement_narrative(applicant_id, txns, mpesa, credit_analysis)
    except Exception as e:
        narrative = "AI Narrative unavailable: " + str(e)
        
    pdf_buffer = generate_credit_profile_pdf(applicant, credit_analysis, mpesa, narrative, loan_ask)
    
    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=f"Credit_Risk_Profile_{applicant_id}.pdf",
        mimetype='application/pdf'
    )
