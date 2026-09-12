# app/auth_routes.py
from flask import Blueprint, request, jsonify, session
from app.models import db, User
import re
import jwt
import datetime
from functools import wraps

auth_bp = Blueprint('auth', __name__)

SECRET_KEY = 'your-super-secret-jwt-key-change-in-production'

def is_valid_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email)

def create_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data.get('name') or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Name, email, and password are required"}), 400
    if not is_valid_email(data['email']):
        return jsonify({"error": "Invalid email format"}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "Email already registered"}), 409

    new_user = User(
        name=data['name'],
        email=data['email'],
        language=data.get('language', 'as')
    )
    new_user.set_password(data['password'])
    db.session.add(new_user)
    db.session.commit()

    token = create_token(new_user.id)
    return jsonify({
        "status": "success",
        "message": "User registered successfully!",
        "token": token,
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "language": new_user.language,
            "role": getattr(new_user, 'role', 'patient') or 'patient'
        }
    }), 201

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data.get('email') or not data.get('password'):
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=data['email']).first()
    if not user or not user.check_password(data['password']):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_token(user.id)
    return jsonify({
        "status": "success",
        "message": "Login successful!",
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "language": user.language,
            "role": getattr(user, 'role', 'patient') or 'patient'
        }
    }), 200

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    return jsonify({"status": "success", "message": "Logged out successfully"}), 200

@auth_bp.route('/api/auth/me', methods=['GET'])
def get_current_user():
    token = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]

    if not token:
        return jsonify({"error": "Not logged in"}), 401

    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user = User.query.get(data['user_id'])
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "language": user.language,
            "role": getattr(user, 'role', 'patient') or 'patient'
        }), 200
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401