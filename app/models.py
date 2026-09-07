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
class Medication(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    medicine_name = db.Column(db.String(100))
    dosage = db.Column(db.String(50))
    schedule_time = db.Column(db.String(10))  # Format: "HH:MM" like "10:00"
    is_taken = db.Column(db.Boolean, default=False)
    alert_count = db.Column(db.Integer, default=0)  # 0=no alert, 1=15min, 2=30min, 3=45min+
    
    def __repr__(self):
        return f"<Medication {self.medicine_name} at {self.schedule_time}>"