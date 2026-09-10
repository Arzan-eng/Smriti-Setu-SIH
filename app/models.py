# app/models.py
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

# ============================================================
#  USER MODEL (UPDATED WITH AUTHENTICATION + CAREGIVER SUPPORT)
# ============================================================
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)   # For login
    password_hash = db.Column(db.String(200), nullable=False)        # Stores hashed password
    language = db.Column(db.String(10), default='as')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)     # Track when user joined

    # ── 👈 ADDED: Caregiver support ──
    role = db.Column(db.String(20), default='patient')               # 'patient' or 'caregiver'
    caregiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Links patient to caregiver

    # ── Password methods ──
    def set_password(self, password):
        """Hash and store the password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check if the provided password matches the hash"""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.name} ({self.email}) - {self.role}>"


# ============================================================
#  GAME SESSION MODEL (UNCHANGED)
# ============================================================
class GameSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    game_id = db.Column(db.String(50), nullable=False)          # e.g., 'memory_match'
    difficulty = db.Column(db.String(10), default='Easy')       # 'Easy', 'Medium', 'Hard'
    score = db.Column(db.Integer)                               # 0 to 100
    time_taken = db.Column(db.Integer)                          # in seconds
    played_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<GameSession {self.game_id} for user {self.user_id}>"


# ============================================================
#  MEDICATION MODEL (UNCHANGED)
# ============================================================
class Medication(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    medicine_name = db.Column(db.String(100))
    dosage = db.Column(db.String(50))
    schedule_time = db.Column(db.String(10))          # Format: "HH:MM" like "10:00"
    is_taken = db.Column(db.Boolean, default=False)
    alert_count = db.Column(db.Integer, default=0)    # 0=no alert, 1=15min, 2=30min, 3=45min+

    def __repr__(self):
        return f"<Medication {self.medicine_name} at {self.schedule_time}>"
