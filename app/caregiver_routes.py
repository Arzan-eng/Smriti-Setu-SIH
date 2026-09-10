# app/caregiver_routes.py
from flask import Blueprint, request, jsonify, session
from app.models import db, User, Medication, GameSession
from datetime import datetime, timedelta

caregiver_bp = Blueprint('caregiver', __name__)

# ── Helper: Get current user ──
def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return User.query.get(user_id)

# ── GET PATIENTS (for a caregiver) ──
@caregiver_bp.route('/api/caregiver/patients', methods=['GET'])
def get_patients():
    current_user = get_current_user()
    if not current_user or current_user.role != 'caregiver':
        return jsonify({"error": "Unauthorized"}), 401

    patients = User.query.filter_by(caregiver_id=current_user.id).all()
    result = []
    for p in patients:
        # Count today's medications
        total_meds = Medication.query.filter_by(user_id=p.id).count()
        taken_meds = Medication.query.filter_by(user_id=p.id, is_taken=True).count()

        # Last game session
        last_game = GameSession.query.filter_by(user_id=p.id).order_by(GameSession.played_at.desc()).first()

        result.append({
            "id": p.id,
            "name": p.name,
            "email": p.email,
            "language": p.language,
            "total_medications": total_meds,
            "taken_medications": taken_meds,
            "last_active": last_game.played_at.isoformat() if last_game else None,
            "last_score": last_game.score if last_game else None,
        })
    return jsonify(result), 200

# ── GET PATIENT DETAILS ──
@caregiver_bp.route('/api/caregiver/patient/<int:patient_id>', methods=['GET'])
def get_patient_details(patient_id):
    current_user = get_current_user()
    if not current_user or current_user.role != 'caregiver':
        return jsonify({"error": "Unauthorized"}), 401

    patient = User.query.get(patient_id)
    if not patient or patient.caregiver_id != current_user.id:
        return jsonify({"error": "Patient not found or not linked to you"}), 404

    # Medications
    meds = Medication.query.filter_by(user_id=patient_id).all()
    med_list = [{
        "id": m.id,
        "medicine_name": m.medicine_name,
        "dosage": m.dosage,
        "schedule_time": m.schedule_time,
        "is_taken": m.is_taken,
    } for m in meds]

    # Game sessions (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    sessions = GameSession.query.filter(
        GameSession.user_id == patient_id,
        GameSession.played_at >= week_ago
    ).all()
    games = [{
        "game_id": s.game_id,
        "score": s.score,
        "difficulty": s.difficulty,
        "played_at": s.played_at.isoformat(),
    } for s in sessions]

    return jsonify({
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "email": patient.email,
            "language": patient.language,
        },
        "medications": med_list,
        "games": games,
    }), 200

# ── ADD MEDICATION FOR PATIENT ──
@caregiver_bp.route('/api/caregiver/medication/add', methods=['POST'])
def caregiver_add_medication():
    current_user = get_current_user()
    if not current_user or current_user.role != 'caregiver':
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    patient_id = data.get('patient_id')

    patient = User.query.get(patient_id)
    if not patient or patient.caregiver_id != current_user.id:
        return jsonify({"error": "Patient not found or not linked to you"}), 404

    required = ['medicine_name', 'dosage', 'schedule_time']
    if not all(k in data for k in required):
        return jsonify({"error": "Missing fields"}), 400

    new_med = Medication(
        user_id=patient_id,
        medicine_name=data['medicine_name'],
        dosage=data['dosage'],
        schedule_time=data['schedule_time']
    )
    db.session.add(new_med)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"{data['medicine_name']} added for {patient.name}!",
        "medication_id": new_med.id
    }), 201

# ── DELETE MEDICATION ──
@caregiver_bp.route('/api/caregiver/medication/<int:med_id>', methods=['DELETE'])
def caregiver_delete_medication(med_id):
    current_user = get_current_user()
    if not current_user or current_user.role != 'caregiver':
        return jsonify({"error": "Unauthorized"}), 401

    med = Medication.query.get(med_id)
    if not med:
        return jsonify({"error": "Medication not found"}), 404

    patient = User.query.get(med.user_id)
    if not patient or patient.caregiver_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403

    db.session.delete(med)
    db.session.commit()

    return jsonify({"status": "success", "message": "Medication deleted"}), 200

# ── LINK PATIENT TO CAREGIVER ──
@caregiver_bp.route('/api/caregiver/link', methods=['POST'])
def link_patient():
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    patient_email = data.get('patient_email')

    if not patient_email:
        return jsonify({"error": "Patient email required"}), 400

    patient = User.query.filter_by(email=patient_email).first()
    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    patient.caregiver_id = current_user.id
    if current_user.role != 'caregiver':
        current_user.role = 'caregiver'
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"Linked to {patient.name} successfully!"
    }), 200

# ── GET CAREGIVER DASHBOARD SUMMARY ──
@caregiver_bp.route('/api/caregiver/summary', methods=['GET'])
def caregiver_summary():
    current_user = get_current_user()
    if not current_user or current_user.role != 'caregiver':
        return jsonify({"error": "Unauthorized"}), 401

    patients = User.query.filter_by(caregiver_id=current_user.id).all()
    total_patients = len(patients)
    total_meds = 0
    taken_meds = 0
    total_games = 0

    for p in patients:
        total_meds += Medication.query.filter_by(user_id=p.id).count()
        taken_meds += Medication.query.filter_by(user_id=p.id, is_taken=True).count()
        total_games += GameSession.query.filter_by(user_id=p.id).count()

    adherence = round((taken_meds / total_meds * 100) if total_meds > 0 else 0, 1)

    return jsonify({
        "total_patients": total_patients,
        "total_medications": total_meds,
        "taken_medications": taken_meds,
        "adherence_rate": adherence,
        "total_games_played": total_games,
    }), 200
