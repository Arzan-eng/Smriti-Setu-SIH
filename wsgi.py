from flask import Flask, jsonify

app = Flask(__name__)

# ✅ ADD A ROUTE
@app.route('/ping')
def ping():
    return jsonify({"status": "ok", "message": "Flask is working!"})

# ✅ ADD A ROOT ROUTE
@app.route('/')
def home():
    return jsonify({"message": "Hello from Smriti-Setu!"})

if __name__ == "__main__":
    app.run()
