# app/routes.py
from flask import Blueprint, jsonify, request, send_file
from app.models import User, GameSession, Medication, db
from datetime import datetime, timedelta
import os
import jwt
from functools import wraps

main_bp = Blueprint('main', __name__)
SECRET_KEY = 'your-super-secret-jwt-key-change-in-production'
conversation_memory = {}

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

@main_bp.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "success", "message": "Backend is running perfectly!"})

@main_bp.route('/api/register', methods=['POST'])
def register_user():
    return jsonify({"error": "Use /api/auth/register"}), 400

# ── SAVE GAME ──
@main_bp.route('/api/save_game', methods=['POST'])
@token_required
def save_game(current_user):
    data = request.get_json()
    new_game = GameSession(
        user_id=current_user.id,
        game_id=data.get('game_id'),
        difficulty=data.get('difficulty', 'Easy'),
        score=data.get('score'),
        time_taken=data.get('time_taken', 0)
    )
    db.session.add(new_game)
    db.session.commit()
    return jsonify({"status": "success", "message": "Game score saved!", "game_id": new_game.id}), 201

# ── PROGRESS ──
@main_bp.route('/api/progress/<int:user_id>', methods=['GET'])
@token_required
def get_progress(current_user, user_id):
    if current_user.id != user_id:
        return jsonify({"error": "Forbidden"}), 403
    week_ago = datetime.utcnow() - timedelta(days=7)
    sessions = GameSession.query.filter(
        GameSession.user_id == user_id,
        GameSession.played_at >= week_ago
    ).all()
    if not sessions:
        return jsonify([]), 200
    daily_scores = {}
    for session in sessions:
        if session.score is None:
            continue
        date_str = session.played_at.strftime('%Y-%m-%d')
        daily_scores.setdefault(date_str, []).append(session.score)
    if not daily_scores:
        return jsonify([]), 200
    result = [{"date": d, "avg_score": round(sum(s)/len(s), 2)} for d, s in daily_scores.items()]
    result.sort(key=lambda x: x['date'])
    return jsonify(result), 200

@main_bp.route('/api/user/<int:user_id>', methods=['GET'])
@token_required
def get_user(current_user, user_id):
    if current_user.id != user_id:
        return jsonify({"error": "Forbidden"}), 403
    return jsonify({"id": current_user.id, "name": current_user.name, "language": current_user.language}), 200

@main_bp.route('/game', methods=['GET'])
def serve_game():
    game_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'game.html')
    return send_file(game_path)

@main_bp.route('/api/recommend_difficulty/<int:user_id>', methods=['GET'])
@token_required
def recommend_difficulty(current_user, user_id):
    if current_user.id != user_id:
        return jsonify({"error": "Forbidden"}), 403
    week_ago = datetime.utcnow() - timedelta(days=7)
    sessions = GameSession.query.filter(
        GameSession.user_id == user_id,
        GameSession.played_at >= week_ago,
        GameSession.score.isnot(None)
    ).all()
    if not sessions:
        return jsonify({"recommended_difficulty": "Easy", "reason": "No games played yet", "average_score": 0, "games_played": 0}), 200
    avg = sum(s.score for s in sessions) / len(sessions)
    if avg >= 70:
        diff, reason = "Hard", f"Your average is {avg:.1f}% — Challenge time!"
    elif avg >= 40:
        diff, reason = "Medium", f"Your average is {avg:.1f}% — Keep going!"
    else:
        diff, reason = "Easy", f"Your average is {avg:.1f}% — Let's start easy."
    return jsonify({"user_id": user_id, "average_score": round(avg, 2), "recommended_difficulty": diff, "reason": reason, "games_played": len(sessions)}), 200

@main_bp.route('/api/save_kichu_kichu', methods=['POST'])
@token_required
def save_kichu_kichu(current_user):
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "No data"}), 400
    if not all(k in data for k in ('score', 'time_taken', 'difficulty')):
        return jsonify({"status": "error", "message": "Missing fields"}), 400
    new_game = GameSession(
        user_id=current_user.id,
        game_id='kichu_kichu_tambulam',
        difficulty=data['difficulty'],
        score=data['score'],
        time_taken=data['time_taken']
    )
    db.session.add(new_game)
    db.session.commit()
    return jsonify({"status": "success", "message": "Kichu Kichu score saved!"}), 200

# ── MEDICATIONS ──
@main_bp.route('/api/medication/<int:user_id>', methods=['GET'])
@token_required
def get_medications(current_user, user_id):
    if current_user.id != user_id:
        return jsonify({"error": "Forbidden"}), 403
    meds = Medication.query.filter_by(user_id=user_id, is_taken=False).all()
    return jsonify([{
        "id": m.id, "medicine_name": m.medicine_name, "dosage": m.dosage,
        "schedule_time": m.schedule_time, "is_taken": m.is_taken, "alert_count": m.alert_count
    } for m in meds]), 200

@main_bp.route('/api/medication/take', methods=['POST'])
@token_required
def mark_medication_taken(current_user):
    data = request.get_json()
    if not data or 'medication_id' not in data:
        return jsonify({"status": "error", "message": "medication_id required"}), 400
    med = Medication.query.get(data['medication_id'])
    if not med:
        return jsonify({"status": "error", "message": "Medication not found"}), 404
    if med.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403
    med.is_taken = True
    med.alert_count = 0
    db.session.commit()
    return jsonify({"status": "success", "message": f"{med.medicine_name} marked as taken!", "medication_id": med.id}), 200

@main_bp.route('/api/medication/add', methods=['POST'])
@token_required
def add_medication(current_user):
    data = request.get_json()
    required = ['medicine_name', 'dosage', 'schedule_time']
    if not all(k in data for k in required):
        return jsonify({"status": "error", "message": "Missing fields"}), 400
    new_med = Medication(
        user_id=current_user.id,
        medicine_name=data['medicine_name'],
        dosage=data['dosage'],
        schedule_time=data['schedule_time']
    )
    db.session.add(new_med)
    db.session.commit()
    return jsonify({"status": "success", "message": f"{data['medicine_name']} added successfully!", "medication_id": new_med.id}), 200

# ── VOICE ASSISTANT (no auth required for flexibility) ──
@main_bp.route('/api/assistant', methods=['POST'])
def voice_assistant():
    data = request.get_json()
    user_id = data.get('user_id', 1)
    query = data.get('query', '').lower().strip()

    if user_id in conversation_memory:
        context = conversation_memory[user_id]
        if context.get('context') == 'waiting_for_medicine_name':
            pending_meds = Medication.query.filter_by(user_id=user_id, is_taken=False).all()
            for med in pending_meds:
                if med.medicine_name.lower() in query:
                    med.is_taken = True
                    med.alert_count = 0
                    db.session.commit()
                    conversation_memory[user_id] = {}
                    return jsonify({"reply": f"Done! I marked {med.medicine_name} as taken.", "action": {"type": "UPDATE_MEDICINE"}})
            return jsonify({"reply": f"I didn't find '{query}' in your pending list. Please say the name again.", "action": {"type": "IDLE"}})
        if context.get('context') == 'waiting_for_confirmation':
            med_id = context.get('med_id')
            if 'yes' in query or 'ok' in query or 'হয়' in query:
                med = Medication.query.get(med_id)
                if med:
                    med.is_taken = True
                    med.alert_count = 0
                    db.session.commit()
                conversation_memory[user_id] = {}
                return jsonify({"reply": "Great! I marked it as taken for you.", "action": {"type": "UPDATE_MEDICINE"}})
            else:
                conversation_memory[user_id] = {}
                return jsonify({"reply": "Okay, I cancelled that action.", "action": {"type": "IDLE"}})

    if 'medicine' in query or 'med' in query or 'pill' in query or 'ঔষধ' in query:
        pending = Medication.query.filter_by(user_id=user_id, is_taken=False).all()
        if not pending:
            return jsonify({"reply": "Great job! You have taken all your medicines today.", "action": {"type": "NAVIGATE", "target": "medicine", "highlight": "medicine-section"}})
        if len(pending) == 1:
            med = pending[0]
            conversation_memory[user_id] = {'context': 'waiting_for_confirmation', 'med_id': med.id}
            return jsonify({"reply": f"You have {med.medicine_name} pending. Should I mark it as taken?", "action": {"type": "ASK_CONFIRMATION"}})
        else:
            names = ", ".join([m.medicine_name for m in pending])
            conversation_memory[user_id] = {'context': 'waiting_for_medicine_name'}
            return jsonify({"reply": f"You have {len(pending)} pending: {names}. Which one should I mark?", "action": {"type": "IDLE"}})

    if 'game' in query or 'play' in query or 'গেম' in query:
        return jsonify({"reply": "Taking you to the Games page. Try the Memory Match card!", "action": {"type": "NAVIGATE", "target": "game", "highlight": "memory-card"}})

    if 'where' in query or 'find' in query or 'ক' in query:
        if 'game' in query:
            return jsonify({"reply": "Opening the Games page for you.", "action": {"type": "NAVIGATE", "target": "game", "highlight": "memory-card"}})
        if 'medicine' in query or 'med' in query:
            return jsonify({"reply": "Taking you to your Medicine page.", "action": {"type": "NAVIGATE", "target": "medicine", "highlight": "medicine-section"}})

    if 'sos' in query or 'help' in query or 'emergency' in query or 'সাহায্য' in query:
        return jsonify({"reply": "Opening the emergency contact section immediately.", "action": {"type": "OPEN_SOS", "highlight": "emergency-box"}})

    return jsonify({"reply": "I didn't quite catch that. You can say 'Medicine', 'Game', or 'Help'.", "action": {"type": "IDLE"}})

@main_bp.route('/api/ping', methods=['GET'])
def ping():
    return {"status": "ok", "message": "Backend is alive!"}