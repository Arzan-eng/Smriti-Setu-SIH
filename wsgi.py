from flask import Flask, jsonify
from app.routes import main_bp   # 👈 Import all your routes

app = Flask(__name__)

# ✅ Register the blueprint (THIS LOADS EVERYTHING!)
app.register_blueprint(main_bp)

# Test routes (keep these)
@app.route('/ping')
def ping():
    return jsonify({"status": "ok", "message": "Flask is working!"})

@app.route('/')
def home():
    return jsonify({"message": "Hello from Smriti-Setu!"})

if __name__ == "__main__":
    app.run()
