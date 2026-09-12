# app/hydration_routes.py
from flask import Blueprint, request, jsonify
from app.models import db, User, Hydration
from datetime import datetime, timedelta
import jwt
from functools import wraps

hydration_bp = Blueprint('hydration', __name__)

SECRET_KEY = 'your-super-secret-jwt-key-change-in-production'
DAILY_GOAL_ML = 2000  # 8 glasses of 250ml


def get_current_user():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ')[1]
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return User.query.get(data['user_id'])
    except Exception:
        return None


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(user, *args, **kwargs)
    return decorated


# ── LOG WATER INTAKE ──
@hydration_bp.route('/api/hydration/log', methods=['POST'])
@token_required
def log_hydration(current_user):
    data = request.get_json() or {}
    amount = data.get('amount_ml', 250)

    if amount <= 0 or amount > 2000:
        return jsonify({"error": "Amount must be between 1 and 2000ml"}), 400

    entry = Hydration(user_id=current_user.id, amount_ml=amount)
    db.session.add(entry)
    db.session.commit()

    # Get today's total after logging
    today = datetime.utcnow().date()
    entries = Hydration.query.filter(
        Hydration.user_id == current_user.id,
        db.func.date(Hydration.logged_at) == today
    ).all()
    total = sum(e.amount_ml for e in entries)

    return jsonify({
        "status": "success",
        "message": f"Logged {amount}ml",
        "today_total_ml": total,
        "today_glasses": round(total / 250, 1),
        "daily_goal_ml": DAILY_GOAL_ML
    }), 201


# ── GET TODAY'S HYDRATION ──
@hydration_bp.route('/api/hydration/today', methods=['GET'])
@token_required
def get_today_hydration(current_user):
    today = datetime.utcnow().date()
    entries = Hydration.query.filter(
        Hydration.user_id == current_user.id,
        db.func.date(Hydration.logged_at) == today
    ).order_by(Hydration.logged_at.desc()).all()

    total = sum(e.amount_ml for e in entries)
    glasses = round(total / 250, 1)

    return jsonify({
        "date": str(today),
        "total_ml": total,
        "glasses": glasses,
        "daily_goal_ml": DAILY_GOAL_ML,
        "goal_glasses": 8,
        "progress_percent": min(round((total / DAILY_GOAL_ML) * 100, 1), 100),
        "entries": [{
            "id": e.id,
            "amount_ml": e.amount_ml,
            "time": e.logged_at.isoformat()
        } for e in entries]
    }), 200


# ── GET WEEKLY HISTORY ──
@hydration_bp.route('/api/hydration/weekly', methods=['GET'])
@token_required
def get_weekly_hydration(current_user):
    week_ago = datetime.utcnow() - timedelta(days=7)
    entries = Hydration.query.filter(
        Hydration.user_id == current_user.id,
        Hydration.logged_at >= week_ago
    ).all()

    # Group by day
    daily = {}
    for e in entries:
        day = e.logged_at.strftime('%Y-%m-%d')
        daily[day] = daily.get(day, 0) + e.amount_ml

    result = []
    for i in range(6, -1, -1):
        d = (datetime.utcnow() - timedelta(days=i)).strftime('%Y-%m-%d')
        result.append({
            "date": d,
            "total_ml": daily.get(d, 0),
            "glasses": round(daily.get(d, 0) / 250, 1),
            "met_goal": daily.get(d, 0) >= DAILY_GOAL_ML
        })

    return jsonify(result), 200


# ── UNDO LAST ENTRY ──
@hydration_bp.route('/api/hydration/undo', methods=['POST'])
@token_required
def undo_last_hydration(current_user):
    last = Hydration.query.filter_by(user_id=current_user.id).order_by(
        Hydration.logged_at.desc()
    ).first()

    if not last:
        return jsonify({"error": "No entries to undo"}), 404

    db.session.delete(last)
    db.session.commit()
    return jsonify({"status": "success", "message": "Last entry removed"}), 200