from flask import Flask

app = Flask(__name__)

# ✅ Add a test route directly here
@app.route('/ping')
def ping():
    return {"status": "ok", "message": "Flask is working!"}

if __name__ == "__main__":
    app.run()
    
