# app/caregiver_routes.py
from flask import Blueprint, request, jsonify
from app.models import db, User, Medication, GameSession
from datetime import datetime, timedelta
import jwt
from functools import wraps

caregiver_bp = Blueprint('caregiver', __name__)

SECRET_KEY = 'your-super-secret-jwt-key-change-in-production'


def get_current_user():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ')[1]
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return User.query.get(data['user_id'])
    except Exception as e:
        print(f"JWT decode error: {e}")
        return None


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(user, *args, **kwargs)
    return decorated


# ── LIST PATIENTS ──
@caregiver_bp.route('/api/caregiver/patients', methods=['GET'])
@token_required
def get_patients(current_user):
    # 🔥 Exclude yourself from the list
    patients = User.query.filter(
        User.caregiver_id == current_user.id,
        User.id != current_user.id
    ).all()

    result = []
    for p in patients:
        total_meds = Medication.query.filter_by(user_id=p.id).count()
        taken_meds = Medication.query.filter_by(user_id=p.id, is_taken=True).count()
        last_game = GameSession.query.filter_by(user_id=p.id).order_by(GameSession.played_at.desc()).first()
        result.append({
            "id": p.id, "name": p.name, "email": p.email, "language": p.language,
            "total_medications": total_meds,
            "taken_medications": taken_meds,
            "last_active": last_game.played_at.isoformat() if last_game else None,
            "last_score": last_game.score if last_game else None,
        })
    return jsonify(result), 200


# ── PATIENT DETAILS ──
@caregiver_bp.route('/api/caregiver/patient/<int:patient_id>', methods=['GET'])
@token_required
def get_patient_details(current_user, patient_id):
    # 🔥 Extra safety: block viewing self
    if patient_id == current_user.id:
        return jsonify({"error": "You cannot view yourself as a patient"}), 400

    patient = User.query.get(patient_id)
    if not patient or patient.caregiver_id != current_user.id:
        return jsonify({"error": "Patient not found or not linked to you"}), 404

    meds = Medication.query.filter_by(user_id=patient_id).all()
    med_list = [{
        "id": m.id, "medicine_name": m.medicine_name, "dosage": m.dosage,
        "schedule_time": m.schedule_time, "is_taken": m.is_taken,
    } for m in meds]

    week_ago = datetime.utcnow() - timedelta(days=7)
    sessions = GameSession.query.filter(
        GameSession.user_id == patient_id,
        GameSession.played_at >= week_ago
    ).all()
    games = [{
        "game_id": s.game_id, "score": s.score,
        "difficulty": s.difficulty, "played_at": s.played_at.isoformat(),
    } for s in sessions]

    return jsonify({
        "patient": {"id": patient.id, "name": patient.name,
                     "email": patient.email, "language": patient.language},
        "medications": med_list,
        "games": games,
    }), 200


# ── ADD MEDICATION FOR PATIENT ──
@caregiver_bp.route('/api/caregiver/medication/add', methods=['POST'])
@token_required
def caregiver_add_medication(current_user):
    data = request.get_json()
    patient_id = data.get('patient_id')

    # 🔥 Block adding meds to yourself via caregiver dashboard
    if patient_id == current_user.id:
        return jsonify({"error": "You cannot add medications to yourself from here"}), 400

    patient = User.query.get(patient_id)
    if not patient or patient.caregiver_id != current_user.id:
        return jsonify({"error": "Patient not found or not linked to you"}), 404

    required = ['medicine_name', 'dosage', 'schedule_time']
    if not all(k in data for k in required):
        return jsonify({"error": "Missing fields"}), 400

    new_med = Medication(
        user_id=patient_id, medicine_name=data['medicine_name'],
        dosage=data['dosage'], schedule_time=data['schedule_time']
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
@token_required
def caregiver_delete_medication(current_user, med_id):
    med = Medication.query.get(med_id)
    if not med:
        return jsonify({"error": "Medication not found"}), 404
    patient = User.query.get(med.user_id)
    if not patient or patient.caregiver_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403
    db.session.delete(med)
    db.session.commit()
    return jsonify({"status": "success", "message": "Medication deleted"}), 200


# ── LINK PATIENT ──
@caregiver_bp.route('/api/caregiver/link', methods=['POST'])
@token_required
def link_patient(current_user):
    data = request.get_json()
    patient_email = data.get('patient_email')

    if not patient_email:
        return jsonify({"error": "Patient email required"}), 400

    # 🔥 Normalize email
    patient_email = patient_email.strip().lower()

    # 🔥 Block self-linking by email BEFORE lookup
    if patient_email == current_user.email.lower():
        return jsonify({"error": "You cannot link your own email"}), 400

    patient = User.query.filter(User.email.ilike(patient_email)).first()
    if not patient:
        return jsonify({"error": "No user found with that email. Ask them to register first."}), 404

    # 🔥 Block self-linking by ID
    if patient.id == current_user.id:
        return jsonify({"error": "You cannot link yourself as a patient"}), 400

    # 🔥 Block if patient is already linked to someone else
    if patient.caregiver_id and patient.caregiver_id != current_user.id:
        return jsonify({"error": "This patient is already linked to another caregiver"}), 409

    # 🔥 Block if this user is already a linked patient (can't be caregiver)
    if current_user.caregiver_id is not None:
        return jsonify({"error": "You are already linked as a patient. You cannot be a caregiver."}), 403

    # 🔥 Link patient
    patient.caregiver_id = current_user.id

    # 🔥 Promote current user to caregiver
    if current_user.role != 'caregiver':
        current_user.role = 'caregiver'

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"Linked to {patient.name} successfully!"
    }), 200


# ── UNLINK PATIENT ──
@caregiver_bp.route('/api/caregiver/unlink/<int:patient_id>', methods=['POST'])
@token_required
def unlink_patient(current_user, patient_id):
    patient = User.query.get(patient_id)
    if not patient or patient.caregiver_id != current_user.id:
        return jsonify({"error": "Patient not found or not linked to you"}), 404

    patient.caregiver_id = None
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"Unlinked from {patient.name}"
    }), 200


# ── CAREGIVER SUMMARY ──
@caregiver_bp.route('/api/caregiver/summary', methods=['GET'])
@token_required
def caregiver_summary(current_user):
    # 🔥 Exclude self from patient list
    patients = User.query.filter(
        User.caregiver_id == current_user.id,
        User.id != current_user.id
    ).all()

    total_meds = sum(Medication.query.filter_by(user_id=p.id).count() for p in patients)
    taken_meds = sum(Medication.query.filter_by(user_id=p.id, is_taken=True).count() for p in patients)
    total_games = sum(GameSession.query.filter_by(user_id=p.id).count() for p in patients)
    adherence = round((taken_meds / total_meds * 100) if total_meds > 0 else 0, 1)

    return jsonify({
        "total_patients": len(patients),
        "total_medications": total_meds,
        "taken_medications": taken_meds,
        "adherence_rate": adherence,
        "total_games_played": total_games,
    }), 200


# ── ⚠️ TEMPORARY ADMIN ROUTE – Remove after cleanup ──
@caregiver_bp.route('/api/caregiver/admin/reset-links', methods=['POST'])
def reset_all_links():
    """
    ⚠️ ADMIN ONLY – Use this ONCE to clean up the database.
    Call: POST /api/caregiver/admin/reset-links
    Remove this route after cleanup.
    """
    User.query.update({User.caregiver_id: None})
    User.query.update({User.role: 'patient'})
    db.session.commit()
    return jsonify({
        "status": "success",
        "message": "All caregiver links reset. Everyone is now a patient."
    }), 200
