# wsgi.py
from flask import Flask, jsonify
from flask_cors import CORS
from app.routes import main_bp
from app.auth_routes import auth_bp
from app.caregiver_routes import caregiver_bp
from app.models import db
from sqlalchemy import text
import os

app = Flask(__name__)

# 🔥 JWT-friendly CORS (no supports_credentials!)
CORS(app, resources={r"/*": {
    "origins": "*",
    "allow_headers": ["Content-Type", "Authorization"],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}})

instance_path = os.path.join(os.path.dirname(__file__), 'instance')
if not os.path.exists(instance_path):
    os.makedirs(instance_path)
    print("✅ Created instance folder")

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(instance_path, 'smriti.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()
    print("✅ Database tables created")
    try:
        db.session.execute(text("ALTER TABLE user ADD COLUMN role VARCHAR(20) DEFAULT 'patient'"))
        db.session.commit()
    except Exception:
        db.session.rollback()
    try:
        db.session.execute(text("ALTER TABLE user ADD COLUMN caregiver_id INTEGER REFERENCES user(id)"))
        db.session.commit()
    except Exception:
        db.session.rollback()

app.register_blueprint(main_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(caregiver_bp)

@app.route('/ping')
def ping():
    return jsonify({"status": "ok", "message": "Flask is working!"})

@app.route('/')
def home():
    return jsonify({"message": "Hello from Smriti-Setu!"})

if __name__ == "__main__":
    app.run()
