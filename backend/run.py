import os
from app.config import Config
from app.models import db
from app.routes import main_bp
from flask import Flask
from flask_cors import CORS
from scheduler import start_scheduler  # 👈 NEW: Import scheduler
import logging

# Set up logging to see alerts in terminal
logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config.from_object(Config)
# Override the database path to point to the new local folder
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'instance', 'smriti.db')
CORS(app)
db.init_app(app)
app.register_blueprint(main_bp)

with app.app_context():
    db.create_all()
    print("✅ Database is ready!")

# 👈 NEW: Start the scheduler
start_scheduler(app)

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    print(f"🔥 Server starting on port {port}")
    app.run(debug=True, host='0.0.0.0', port=port)