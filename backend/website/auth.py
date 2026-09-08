import string

from flask import Blueprint, request, jsonify

from website.system_email_utils import send_email_smtp
from website.models import User, Application
from website import db

import os

from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt, set_access_cookies

from website.role_decorator import role_required
import random

from dotenv import load_dotenv
load_dotenv()

auth = Blueprint('auth',__name__, url_prefix='/api/auth/users')

@auth.route('/register', methods=['POST'])
def register():

    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Please provide both email and password'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'User already exist'}), 409

    hashed_password = generate_password_hash(data['password'])

    new_user = User(
        name=data.get('name',''),
        email=data.get('email'),
        number=data.get('number'),
        password=hashed_password,
        role=data.get('role')
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User created successfully',
                    'user':new_user.to_dict()}), 201

@auth.route('/login', methods=['POST'])
def login():

    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Please provide both email and password'}), 400

    user = User.query.filter_by(email=data['email']).first()

    if not user:
        return jsonify({'message': 'User not found, please register'}), 401

    if not check_password_hash(user.password, data['password']):
        return jsonify({'message': 'Invalid credentials'}), 401

    access_token = create_access_token(
        identity=user.id,
        additional_claims={"role":user.role}
    )

    response = jsonify({
        'message': 'Logged in successfully',
        'user': user.to_dict()
    })

    set_access_cookies(response, access_token)

    return response, 200
    
@auth.route('/dev/login', methods=['POST'])
def dev_login():

    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Please provide both email and password'}), 400

    user = User.query.filter_by(email=data['email']).first()

    if not user:
        return jsonify({'message': 'User not found, please register'}), 401

    if not check_password_hash(user.password, data['password']):
        return jsonify({'message': 'Invalid credentials'}), 401

    access_token = create_access_token(
        identity=user.id,
        additional_claims={"role":user.role}
    )

    response = jsonify({
        'message': 'Logged in successfully',
        'token':access_token,
        'user': user.to_dict()
    })

    set_access_cookies(response, access_token)

    return response, 200

@auth.route('/delete/<string:id>', methods=['DELETE'])
@jwt_required()
def delete(id):
    user = User.query.get(id)

    if not user:
        return jsonify({'message': 'User does not exist'}), 404

    db.session.delete(user)
    db.session.commit()

    return jsonify({'message': 'User deleted successfully'}), 200

@auth.route('/update/<string:id>', methods=['PATCH'])
@jwt_required()
def update(id):

    user = User.query.get(id)

    if not user:
        return jsonify({'message': 'User does not exist'}), 404

    data = request.get_json()

    for key, value in data.items():
        if hasattr(user, key) and key != "id" and key != "role" and key != "password":
            setattr(user, key, value)
            
    db.session.commit()

    return jsonify({
        'message': 'User updated',
        'user': user.to_dict()
    }), 200

@auth.route('/forgot-password', methods=['PUT'])
@role_required("admin")
def forgot_password():
    data = request.get_json()
    request_email = data.get('email')
    
    user_obj = User.query.filter_by(email=request_email).first()
    if not user_obj:
        return jsonify({'message': 'User does not exist with this email'}), 400
        
    # SECURITY PATCH: Generate token instead of plaintext password
    reset_token = ''.join(random.choices(string.punctuation + string.digits + string.ascii_letters, k=32))
    user_obj.reset_token = reset_token
    from datetime import datetime, timedelta
    user_obj.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
    
    db.session.commit()
    
    link = os.getenv("SYSTEM_URL")
    # In a real scenario, this would send an email with a link like:
    # f"{link}/reset-password?token={reset_token}"
    return jsonify({'message': 'Password reset link sent to your email'}), 200




@auth.route('/change-password', methods=['PUT'])
@jwt_required()
def change_password():

    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return jsonify({'message': 'No data provided'}), 400

    old_password = data.get('temp_password')
    new_password = data.get('new_password')
    confirm_new_password = data.get('confirm_new_password')

    if not old_password or not new_password or not confirm_new_password:
        return jsonify({
            'message': 'Please fill in all fields'
        }), 400

    if new_password != confirm_new_password:
        return jsonify({
            "message":"New passwords do not much"
        })

    user = User.query.get(user_id)

    if not user:
        return jsonify({'message': 'User not found'}), 404

    # Verify old password
    if not check_password_hash(user.password, old_password):
        return jsonify({'message': 'Current password is incorrect'}), 401

    # Optional: prevent same password reuse
    if check_password_hash(user.password, new_password):
        return jsonify({
            'message': 'New password must be different'
        }), 400

    user.password = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({
        'message': 'Password changed successfully'
    }), 200
