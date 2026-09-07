from flask import Blueprint, jsonify, request, send_file
from app.models import User, GameSession, Medication, db
from datetime import datetime, timedelta
import os

# ========== BLUEPRINT ==========
main_bp = Blueprint('main', __name__)

# ========== VOICE ASSISTANT MEMORY (NEW - Added by You) ==========
conversation_memory = {}  # Remembers what the user was just talking about

# ========== HEALTH CHECK ==========
@main_bp.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "success", "message": "Backend is running perfectly!"})

# ========== USER REGISTRATION ==========
@main_bp.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()
    
    new_user = User(
        name=data.get('name'),
        language=data.get('language', 'as')
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({
        "status": "success",
        "message": f"User {new_user.name} created!",
        "user_id": new_user.id
    }), 201

# ========== SAVE GAME SCORE ==========
@main_bp.route('/api/save_game', methods=['POST'])
def save_game():
    data = request.get_json()
    
    new_game = GameSession(
        user_id=data['user_id'],
        game_id=data['game_id'],
        difficulty=data.get('difficulty', 'Easy'),
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
    week_ago = datetime.utcnow() - timedelta(days=7)
    sessions = GameSession.query.filter(
        GameSession.user_id == user_id,
        GameSession.played_at >= week_ago
    ).all()
    
    if not sessions:
        return jsonify([]), 200
    
    daily_scores = {}
    for session in sessions:
        # ✅ SKIP scores that are None (empty)
        if session.score is None:
            continue
        
        date_str = session.played_at.strftime('%Y-%m-%d')
        if date_str not in daily_scores:
            daily_scores[date_str] = []
        daily_scores[date_str].append(session.score)
    
    # ✅ If all scores were None, return empty array
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

# ========== GET USER BY ID ==========
@main_bp.route('/api/user/<int:user_id>', methods=['GET'])
def get_user(user_id):
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
    # Absolute path to game.html inside the app folder
    game_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'game.html')
    return send_file(game_path)

# ========== AI: RECOMMEND DIFFICULTY ==========
@main_bp.route('/api/recommend_difficulty/<int:user_id>', methods=['GET'])
def recommend_difficulty(user_id):
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
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "No data"}), 400
    
    # Check if required fields exist
    if not all(k in data for k in ('user_id', 'score', 'time_taken', 'difficulty')):
        return jsonify({"status": "error", "message": "Missing fields"}), 400
    
    # Save to database with a fixed game_id
    new_game = GameSession(
        user_id=data['user_id'],
        game_id='kichu_kichu_tambulam',  # This is the new game name
        difficulty=data['difficulty'],
        score=data['score'],
        time_taken=data['time_taken']
    )
    db.session.add(new_game)
    db.session.commit()
    
    return jsonify({"status": "success", "message": "Kichu Kichu score saved!"}), 200

# ========== MEDICATION ROUTES ==========

# 1. GET all medications for a user (today's schedule)
@main_bp.route('/api/medication/<int:user_id>', methods=['GET'])
def get_medications(user_id):
    """Returns all medications for a user (not marked as taken today)"""
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

# 2. POST - Mark a medication as taken (user presses "I Took This")
@main_bp.route('/api/medication/take', methods=['POST'])
def mark_medication_taken():
    data = request.get_json()
    
    if not data or 'medication_id' not in data:
        return jsonify({"status": "error", "message": "medication_id required"}), 400
    
    med_id = data['medication_id']
    med = Medication.query.get(med_id)
    
    if not med:
        return jsonify({"status": "error", "message": "Medication not found"}), 404
    
    # Mark as taken and reset alert count
    med.is_taken = True
    med.alert_count = 0
    db.session.commit()
    
    return jsonify({
        "status": "success",
        "message": f"{med.medicine_name} marked as taken!",
        "medication_id": med.id
    }), 200

# 3. POST - Add a new medication (for caregiver)
@main_bp.route('/api/medication/add', methods=['POST'])
def add_medication():
    data = request.get_json()
    
    required = ['user_id', 'medicine_name', 'dosage', 'schedule_time']
    if not all(k in data for k in required):
        return jsonify({"status": "error", "message": "Missing fields"}), 400
    
    new_med = Medication(
        user_id=data['user_id'],
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
# 🗣️ NEW: VOICE ASSISTANT ENDPOINT (Added by You)
# ============================================================
@main_bp.route('/api/assistant', methods=['POST'])
def voice_assistant():
    """
    This is the BRAIN of your voice assistant.
    Frontend sends voice text -> We reply with TEXT + ACTION.
    """
    data = request.get_json()
    user_id = data.get('user_id', 1)  # Default to user 1
    query = data.get('query', '').lower().strip()
    
    # --- A. CHECK MEMORY (Are we in the middle of a conversation?) ---
    if user_id in conversation_memory:
        context = conversation_memory[user_id]
        
        # Case 1: We asked "Which medicine?" and they replied with a name
        if context.get('context') == 'waiting_for_medicine_name':
            # Fetch pending meds using your existing Medication model
            pending_meds = Medication.query.filter_by(
                user_id=user_id, 
                is_taken=False
            ).all()
            
            for med in pending_meds:
                if med.medicine_name.lower() in query:
                    # Mark as taken (using your exact DB logic)
                    med.is_taken = True
                    med.alert_count = 0
                    db.session.commit()
                    
                    # Clear memory
                    conversation_memory[user_id] = {}
                    
                    return jsonify({
                        "reply": f"Done! I marked {med.medicine_name} as taken.",
                        "action": {"type": "UPDATE_MEDICINE"}
                    })
            
            # If name not found
            return jsonify({
                "reply": f"I didn't find '{query}' in your pending list. Please say the name again.",
                "action": {"type": "IDLE"}
            })
        
        # Case 2: We asked "Mark Aspirin?" and they said "Yes" or "No"
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

    # --- B. NEW CONVERSATION (Intent Detection) ---
    
    # --- INTENT 1: MEDICINE (Mark or View) ---
    if 'medicine' in query or 'med' in query or 'pill' in query or 'ঔষধ' in query:
        # Use your existing Medication model to fetch pending
        pending = Medication.query.filter_by(user_id=user_id, is_taken=False).all()
        
        if not pending:
            return jsonify({
                "reply": "Great job! You have taken all your medicines today.",
                "action": {"type": "NAVIGATE", "target": "medicine"}
            })
        
        # If exactly 1 pending medicine
        if len(pending) == 1:
            med = pending[0]
            # Remember we asked a Yes/No question
            conversation_memory[user_id] = {
                'context': 'waiting_for_confirmation',
                'med_id': med.id
            }
            return jsonify({
                "reply": f"You have {med.medicine_name} pending. Should I mark it as taken?",
                "action": {"type": "ASK_CONFIRMATION"}
            })
        
        # If multiple pending
        else:
            names = ", ".join([m.medicine_name for m in pending])
            # Remember we asked "Which one?"
            conversation_memory[user_id] = {
                'context': 'waiting_for_medicine_name'
            }
            return jsonify({
                "reply": f"You have {len(pending)} pending: {names}. Which one should I mark?",
                "action": {"type": "IDLE"}
            })

    # --- INTENT 2: GAME (Navigate to games) ---
    if 'game' in query or 'play' in query or 'গেম' in query:
        return jsonify({
            "reply": "Taking you to the Games page. Try the Memory Match card!",
            "action": {"type": "NAVIGATE", "target": "game", "highlight": "game-memory-card"}
        })

    # --- INTENT 3: WHERE IS / NAVIGATION HELP ---
    if 'where' in query or 'find' in query or 'ক' in query:
        if 'game' in query:
            return jsonify({
                "reply": "Opening the Games page for you. Look for the yellow Memory Match card.",
                "action": {"type": "NAVIGATE", "target": "game", "highlight": "game-memory-card"}
            })
        if 'medicine' in query or 'med' in query:
            return jsonify({
                "reply": "Taking you to your Medicine page.",
                "action": {"type": "NAVIGATE", "target": "medicine"}
            })

    # --- INTENT 4: SOS / HELP ---
    if 'sos' in query or 'help' in query or 'emergency' in query or 'সাহায্য' in query:
        return jsonify({
            "reply": "Opening the emergency contact section immediately.",
            "action": {"type": "OPEN_SOS"}
        })

    # --- FALLBACK: I don't understand ---
    return jsonify({
        "reply": "I didn't quite catch that. You can say 'Medicine', 'Game', or 'Help'.",
        "action": {"type": "IDLE"}
    })
# ========== TEST ROUTE ==========
@main_bp.route('/api/ping', methods=['GET'])
def ping():
    return {"status": "ok", "message": "Backend is alive!"}