# app/routes.py
from flask import Blueprint, jsonify, request, send_file, session
from app.models import User, GameSession, Medication, db
from datetime import datetime, timedelta
import os

main_bp = Blueprint('main', __name__)

# ========== VOICE ASSISTANT MEMORY ==========
conversation_memory = {}

# ========== HELPER: Get logged-in user ==========
def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return User.query.get(user_id)

# ========== HEALTH CHECK ==========
@main_bp.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "success", "message": "Backend is running perfectly!"})

# ========== USER REGISTRATION (Deprecated – use /api/auth/register) ==========
@main_bp.route('/api/register', methods=['POST'])
def register_user():
    # Keep for backward compatibility, but redirect to auth route
    return jsonify({"error": "Use /api/auth/register"}), 400

# ========== SAVE GAME SCORE ==========
@main_bp.route('/api/save_game', methods=['POST'])
def save_game():
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    
    # Validate the sent user_id matches the logged-in user
    if data.get('user_id') != current_user.id:
        return jsonify({"error": "Forbidden"}), 403

    new_game = GameSession(
        user_id=current_user.id,  # Always use session user ID
        game_id=data.get('game_id'),
        difficulty=data.get('difficulty', 'Easy'),
        score=data.get('score'),
        time_taken=data.get('time_taken', 0)
    )
    
    db.session.add(new_game)
    db.session.commit()
    
    return jsonify({
        "status": "success",
        "message": "Game score saved!",
        "game_id": new_game.id
    }), 201

# ========== REAL PROGRESS DASHBOARD ==========
@main_bp.route('/api/progress/<int:user_id>', methods=['GET'])
def get_progress(user_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401
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
        if date_str not in daily_scores:
            daily_scores[date_str] = []
        daily_scores[date_str].append(session.score)
    
    if not daily_scores:
        return jsonify([]), 200
    
    result = []
    for date, scores in daily_scores.items():
        avg_score = sum(scores) / len(scores)
        result.append({
            "date": date,
            "avg_score": round(avg_score, 2)
        })
    
    result.sort(key=lambda x: x['date'])
    return jsonify(result), 200

# ========== GET USER BY ID (For display) ==========
@main_bp.route('/api/user/<int:user_id>', methods=['GET'])
def get_user(user_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401
    if current_user.id != user_id:
        return jsonify({"error": "Forbidden"}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({
        "id": user.id,
        "name": user.name,
        "language": user.language
    }), 200

# ========== SERVE THE GAME PAGE ==========
@main_bp.route('/game', methods=['GET'])
def serve_game():
    game_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'game.html')
    return send_file(game_path)

# ========== AI: RECOMMEND DIFFICULTY ==========
@main_bp.route('/api/recommend_difficulty/<int:user_id>', methods=['GET'])
def recommend_difficulty(user_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401
    if current_user.id != user_id:
        return jsonify({"error": "Forbidden"}), 403

    week_ago = datetime.utcnow() - timedelta(days=7)
    sessions = GameSession.query.filter(
        GameSession.user_id == user_id,
        GameSession.played_at >= week_ago,
        GameSession.score.isnot(None)
    ).all()
    
    if not sessions:
        return jsonify({
            "recommended_difficulty": "Easy",
            "reason": "No games played yet",
            "average_score": 0,
            "games_played": 0
        }), 200
    
    total = sum(session.score for session in sessions)
    avg = total / len(sessions)
    
    if avg >= 70:
        difficulty = "Hard"
        reason = f"Your average is {avg:.1f}% — Challenge time!"
    elif avg >= 40:
        difficulty = "Medium"
        reason = f"Your average is {avg:.1f}% — Keep going!"
    else:
        difficulty = "Easy"
        reason = f"Your average is {avg:.1f}% — Let's start easy."
    
    return jsonify({
        "user_id": user_id,
        "average_score": round(avg, 2),
        "recommended_difficulty": difficulty,
        "reason": reason,
        "games_played": len(sessions)
    }), 200

# ========== NEW GAME: Kichu Kichu Tambulam ==========
@main_bp.route('/api/save_kichu_kichu', methods=['POST'])
def save_kichu_kichu():
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "No data"}), 400

    if data.get('user_id') != current_user.id:
        return jsonify({"error": "Forbidden"}), 403
    
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

# ========== MEDICATION ROUTES ==========

@main_bp.route('/api/medication/<int:user_id>', methods=['GET'])
def get_medications(user_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401
    if current_user.id != user_id:
        return jsonify({"error": "Forbidden"}), 403

    meds = Medication.query.filter_by(user_id=user_id, is_taken=False).all()
    result = []
    for med in meds:
        result.append({
            "id": med.id,
            "medicine_name": med.medicine_name,
            "dosage": med.dosage,
            "schedule_time": med.schedule_time,
            "is_taken": med.is_taken,
            "alert_count": med.alert_count
        })
    return jsonify(result), 200

@main_bp.route('/api/medication/take', methods=['POST'])
def mark_medication_taken():
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    if not data or 'medication_id' not in data:
        return jsonify({"status": "error", "message": "medication_id required"}), 400
    
    med_id = data['medication_id']
    med = Medication.query.get(med_id)
    
    if not med:
        return jsonify({"status": "error", "message": "Medication not found"}), 404
    
    # Ensure the medication belongs to the logged-in user
    if med.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403
    
    med.is_taken = True
    med.alert_count = 0
    db.session.commit()
    
    return jsonify({
        "status": "success",
        "message": f"{med.medicine_name} marked as taken!",
        "medication_id": med.id
    }), 200

@main_bp.route('/api/medication/add', methods=['POST'])
def add_medication():
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    required = ['medicine_name', 'dosage', 'schedule_time']
    if not all(k in data for k in required):
        return jsonify({"status": "error", "message": "Missing fields"}), 400
    
    # Use the session user_id, ignore what frontend sends
    new_med = Medication(
        user_id=current_user.id,
        medicine_name=data['medicine_name'],
        dosage=data['dosage'],
        schedule_time=data['schedule_time']
    )
    db.session.add(new_med)
    db.session.commit()
    
    return jsonify({
        "status": "success",
        "message": f"{data['medicine_name']} added successfully!",
        "medication_id": new_med.id
    }), 200

# ============================================================
# 🗣️ VOICE ASSISTANT ENDPOINT
# ============================================================
@main_bp.route('/api/assistant', methods=['POST'])
def voice_assistant():
    data = request.get_json()
    user_id = data.get('user_id', 1)
    
    # Verify the user exists and is logged in (optional but recommended)
    current_user = get_current_user()
    if current_user and current_user.id != user_id:
        return jsonify({"error": "Forbidden"}), 403
    if not current_user:
        # If no session, fallback to provided user_id (for compatibility)
        pass

    query = data.get('query', '').lower().strip()
    
    # --- MEMORY CHECK ---
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
                    return jsonify({
                        "reply": f"Done! I marked {med.medicine_name} as taken.",
                        "action": {"type": "UPDATE_MEDICINE"}
                    })
            return jsonify({
                "reply": f"I didn't find '{query}' in your pending list. Please say the name again.",
                "action": {"type": "IDLE"}
            })
        
        if context.get('context') == 'waiting_for_confirmation':
            med_id = context.get('med_id')
            if 'yes' in query or 'ok' in query or 'হয়' in query:
                med = Medication.query.get(med_id)
                if med:
                    med.is_taken = True
                    med.alert_count = 0
                    db.session.commit()
                conversation_memory[user_id] = {}
                return jsonify({
                    "reply": "Great! I marked it as taken for you.",
                    "action": {"type": "UPDATE_MEDICINE"}
                })
            else:
                conversation_memory[user_id] = {}
                return jsonify({
                    "reply": "Okay, I cancelled that action.",
                    "action": {"type": "IDLE"}
                })
    
    # --- INTENT 1: MEDICINE ---
    if 'medicine' in query or 'med' in query or 'pill' in query or 'ঔষধ' in query:
        pending = Medication.query.filter_by(user_id=user_id, is_taken=False).all()
        if not pending:
            return jsonify({
                "reply": "Great job! You have taken all your medicines today.",
                "action": {"type": "NAVIGATE", "target": "medicine", "highlight": "medicine-section"}
            })
        if len(pending) == 1:
            med = pending[0]
            conversation_memory[user_id] = {'context': 'waiting_for_confirmation', 'med_id': med.id}
            return jsonify({
                "reply": f"You have {med.medicine_name} pending. Should I mark it as taken?",
                "action": {"type": "ASK_CONFIRMATION"}
            })
        else:
            names = ", ".join([m.medicine_name for m in pending])
            conversation_memory[user_id] = {'context': 'waiting_for_medicine_name'}
            return jsonify({
                "reply": f"You have {len(pending)} pending: {names}. Which one should I mark?",
                "action": {"type": "IDLE"}
            })
    
    # INTENT 2: GAME
    if 'game' in query or 'play' in query or 'গেম' in query:
        return jsonify({
            "reply": "Taking you to the Games page. Try the Memory Match card!",
            "action": {"type": "NAVIGATE", "target": "game", "highlight": "memory-card"}
        })
    
    # INTENT 3: WHERE IS
    if 'where' in query or 'find' in query or 'ক' in query:
        if 'game' in query:
            return jsonify({
                "reply": "Opening the Games page for you. Look for the yellow Memory Match card.",
                "action": {"type": "NAVIGATE", "target": "game", "highlight": "memory-card"}
            })
        if 'medicine' in query or 'med' in query:
            return jsonify({
                "reply": "Taking you to your Medicine page.",
                "action": {"type": "NAVIGATE", "target": "medicine", "highlight": "medicine-section"}
            })
    
    # INTENT 4: SOS / HELP
    if 'sos' in query or 'help' in query or 'emergency' in query or 'সাহায্য' in query:
        return jsonify({
            "reply": "Opening the emergency contact section immediately.",
            "action": {"type": "OPEN_SOS", "highlight": "emergency-box"}
        })
    
    # FALLBACK
    return jsonify({
        "reply": "I didn't quite catch that. You can say 'Medicine', 'Game', or 'Help'.",
        "action": {"type": "IDLE"}
    })

# ========== TEST ROUTE ==========
@main_bp.route('/api/ping', methods=['GET'])
def ping():
    return {"status": "ok", "message": "Backend is alive!"}
