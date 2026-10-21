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
@jwt_required()
@role_required("admin", "super_admin")
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
    
@auth.route('/delete/<string:id>', methods=['DELETE'])
@jwt_required()
@role_required("admin", "super_admin")
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

    if id != get_jwt_identity() and get_jwt().get("role") not in ("admin", "super_admin"):
        return jsonify({'message': 'You are not authorized to update this user'}), 403

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
            "message":"New passwords do not match"
        }), 400

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
