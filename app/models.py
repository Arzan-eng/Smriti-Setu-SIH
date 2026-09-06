from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    language = db.Column(db.String(10), default='as')

class GameSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    game_id = db.Column(db.String(50), nullable=False)   # e.g., 'memory_match'
    difficulty = db.Column(db.String(10), default='Easy') # 'Easy', 'Medium', 'Hard'
    score = db.Column(db.Integer)                         # 0 to 100
    time_taken = db.Column(db.Integer)                    # in seconds
    played_at = db.Column(db.DateTime, default=datetime.utcnow)  # When it was played