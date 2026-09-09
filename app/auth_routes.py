# app/auth_routes.py
from flask import Blueprint, request, jsonify, session
from app.models import db, User
from datetime import timedelta
import re

auth_bp = Blueprint('auth', __name__)

# ── Helper: Validate email ──
def is_valid_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email)

# ── REGISTER ──
@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Validate required fields
    if not data.get('name') or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Name, email, and password are required"}), 400
    
    # Validate email
    if not is_valid_email(data['email']):
        return jsonify({"error": "Invalid email format"}), 400
    
    # Check if user already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "Email already registered"}), 409
    
    # Create new user
    new_user = User(
        name=data['name'],
        email=data['email'],
        language=data.get('language', 'as')
    )
    new_user.set_password(data['password'])
    
    db.session.add(new_user)
    db.session.commit()
    
    # Create session
    session['user_id'] = new_user.id
    session.permanent = True
    
    return jsonify({
        "status": "success",
        "message": "User registered successfully!",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "language": new_user.language
        }
    }), 201

# ── LOGIN ──
@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data.get('email') or not data.get('password'):
        return jsonify({"error": "Email and password are required"}), 400
    
    # Find user by email
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({"error": "Invalid email or password"}), 401
    
    # Create session
    session['user_id'] = user.id
    session.permanent = True
    
    return jsonify({
        "status": "success",
        "message": "Login successful!",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "language": user.language
        }
    }), 200

# ── LOGOUT ──
@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({
        "status": "success",
        "message": "Logged out successfully"
    }), 200

# ── GET CURRENT USER ──
@auth_bp.route('/api/auth/me', methods=['GET'])
def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401
    
    user = User.query.get(user_id)
    if not user:
        session.clear()
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "language": user.language
    }), 200
