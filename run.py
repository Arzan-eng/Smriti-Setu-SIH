import os
from app.config import Config
from app.models import db
from app.routes import main_bp
from flask import Flask
from flask_cors import CORS
import logging

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
app.config.from_object(Config)

# ✅ Use PostgreSQL from Render's environment variable
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///instance/smriti.db')

CORS(app)
db.init_app(app)

# ✅ Register blueprint
app.register_blueprint(main_bp)

with app.app_context():
    db.create_all()
    print("✅ Database is ready!")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"🔥 Server starting on port {port}")
    app.run(debug=True, host='0.0.0.0', port=port)
