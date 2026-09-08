from flask import Flask, jsonify
from flask_cors import CORS  # ✅ ADD THIS LINE (Import CORS)
from app.routes import main_bp
from app.models import db
import os

app = Flask(__name__)

# ✅ ADD THIS LINE RIGHT HERE (Enable CORS for your frontend)
CORS(app, origins=["https://smriti-setu-sih-1.vercel.app", "http://localhost:3000"])

# ✅ Create instance folder (for SQLite)
instance_path = os.path.join(os.path.dirname(__file__), 'instance')
if not os.path.exists(instance_path):
    os.makedirs(instance_path)
    print("✅ Created instance folder")

# ✅ Set database path
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(instance_path, 'smriti.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# ✅ Initialize database
db.init_app(app)

# ✅ Create all tables
with app.app_context():
    db.create_all()
    print("✅ Database tables created")

# ✅ Register blueprint (this loads ALL your routes)
app.register_blueprint(main_bp)

# ✅ Test routes
@app.route('/ping')
def ping():
    return jsonify({"status": "ok", "message": "Flask is working!"})

@app.route('/')
def home():
    return jsonify({"message": "Hello from Smriti-Setu!"})

if __name__ == "__main__":
    app.run()
