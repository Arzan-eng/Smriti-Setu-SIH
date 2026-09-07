from flask import Flask, jsonify
from app.routes import main_bp   # 👈 Import your blueprint

app = Flask(__name__)

# ✅ Register the blueprint (this loads all your routes)
app.register_blueprint(main_bp)

# ✅ Keep test routes (optional)
@app.route('/ping')
def ping():
    return jsonify({"status": "ok", "message": "Flask is working!"})

@app.route('/')
def home():
    return jsonify({"message": "Hello from Smriti-Setu!"})

if __name__ == "__main__":
    app.run()
