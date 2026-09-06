from flask import Blueprint, jsonify, request
from app.models import User, GameSession, db
from datetime import datetime, timedelta

# ========== THIS LINE WAS MISSING! ==========
main_bp = Blueprint('main', __name__)
# ============================================

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
    from datetime import datetime, timedelta
    from app.models import GameSession
    
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
    from flask import send_file
    import os
    # Absolute path to game.html inside the app folder
    game_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'game.html')
    return send_file(game_path)
# ========== AI: RECOMMEND DIFFICULTY ==========
@main_bp.route('/api/recommend_difficulty/<int:user_id>', methods=['GET'])
def recommend_difficulty(user_id):
    from datetime import datetime, timedelta
    from app.models import GameSession
    
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