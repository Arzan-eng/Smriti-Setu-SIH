# wsgi.py
from flask import Flask, jsonify
from flask_cors import CORS
from app.routes import main_bp
from app.auth_routes import auth_bp
from app.caregiver_routes import caregiver_bp   # 👈 ADDED
from app.models import db
from sqlalchemy import text                     # 👈 ADDED
import os
from datetime import timedelta

app = Flask(__name__)

# ── Secret key & session config ──
app.secret_key = 'your-super-secret-key-change-this-in-production'
app.permanent_session_lifetime = timedelta(days=7)

# ── 🔥 CROSS‑SITE COOKIE SETTINGS ──
app.config.update(
    SESSION_COOKIE_SECURE=True,          # Required for HTTPS
    SESSION_COOKIE_SAMESITE='None',      # Allows cross‑origin cookies
)

# ── CORS with credentials support ──
CORS(app,
     resources={r"/*": {"origins": "*"}},
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"]
)

# ── Instance folder ──
instance_path = os.path.join(os.path.dirname(__file__), 'instance')
if not os.path.exists(instance_path):
    os.makedirs(instance_path)
    print("✅ Created instance folder")

# ── Database ──
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(instance_path, 'smriti.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()
    print("✅ Database tables created")

    # 👈 ADDED — Safely add new caregiver columns to existing user table
    try:
        db.session.execute(text("ALTER TABLE user ADD COLUMN role VARCHAR(20) DEFAULT 'patient'"))
        db.session.commit()
        print("✅ Added 'role' column to user table")
    except Exception:
        db.session.rollback()   # Column already exists — safe to ignore

    try:
        db.session.execute(text("ALTER TABLE user ADD COLUMN caregiver_id INTEGER REFERENCES user(id)"))
        db.session.commit()
        print("✅ Added 'caregiver_id' column to user table")
    except Exception:
        db.session.rollback()   # Column already exists — safe to ignore

# ── Register blueprints ──
app.register_blueprint(main_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(caregiver_bp)   # 👈 ADDED

# ── Test routes ──
@app.route('/ping')
def ping():
    return jsonify({"status": "ok", "message": "Flask is working!"})

@app.route('/')
def home():
    return jsonify({"message": "Hello from Smriti-Setu!"})

if __name__ == "__main__":
    app.run()
