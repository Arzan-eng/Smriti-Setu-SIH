import os
from app.config import Config
from app.models import db
from app.routes import main_bp
from flask import Flask
from flask_cors import CORS
import logging

# Scheduler temporarily disabled
# from scheduler import start_scheduler

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
app.config.from_object(Config)

# ============================================================
# 🔥 FIX: Force PostgreSQL using Render's DATABASE_URL
# ============================================================
# If DATABASE_URL exists, use it (PostgreSQL)
# Otherwise, fallback to SQLite (local development)
database_url = os.environ.get('DATABASE_URL')
if database_url:
    # Render automatically adds '?sslmode=require' sometimes, but we need to handle it
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    print("✅ Using PostgreSQL database")
else:
    # Fallback to SQLite (for local testing)
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    instance_path = os.path.join(BASE_DIR, 'instance')
    if not os.path.exists(instance_path):
        os.makedirs(instance_path)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'instance', 'smriti.db')
    print("⚠️ Using SQLite (local mode)")

CORS(app)
db.init_app(app)

# ✅ Register blueprint
app.register_blueprint(main_bp)

with app.app_context():
    db.create_all()
    print("✅ Database is ready!")

# Scheduler temporarily disabled
# start_scheduler(app)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"🔥 Server starting on port {port}")
    app.run(debug=True, host='0.0.0.0', port=port)
