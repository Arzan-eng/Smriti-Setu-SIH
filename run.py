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
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config.from_object(Config)

# Ensure instance folder exists for SQLite
instance_path = os.path.join(BASE_DIR, 'instance')
if not os.path.exists(instance_path):
    os.makedirs(instance_path)
    print("✅ Created instance folder for SQLite")

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'instance', 'smriti.db')
print("✅ Using SQLite database")

CORS(app)
db.init_app(app)

# ============================================================
# 🔥 CRITICAL: THIS MUST BE OUTSIDE THE if __name__ BLOCK
# ============================================================
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
    
