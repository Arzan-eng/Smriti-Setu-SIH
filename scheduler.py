from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import logging

scheduler = None

def check_missed_medications(app):
    """Runs every 1 minute (for testing) to check for missed medicines"""
    with app.app_context():
        from app.models import db, Medication
        
        logging.info("🔍 Checking for missed medications...")
        now = datetime.now()
        current_time_str = now.strftime("%H:%M")
        
        # Get all medications NOT taken yet
        meds = Medication.query.filter_by(is_taken=False).all()
        
        for med in meds:
            # Only check if schedule_time has passed today
            if med.schedule_time <= current_time_str:
                # Calculate minutes late
                scheduled_hour, scheduled_min = map(int, med.schedule_time.split(':'))
                current_hour = now.hour
                current_min = now.minute
                minutes_late = (current_hour - scheduled_hour) * 60 + (current_min - scheduled_min)
                
                if minutes_late < 0:
                    continue  # scheduled for tomorrow
                
                # ---- ESCALATION LOGIC ----
                
                # ALERT 1: 15 minutes late
                if 15 <= minutes_late < 30 and med.alert_count < 1:
                    med.alert_count = 1
                    db.session.commit()
                    logging.warning(f"🔔 ALERT 1 (15 min): {med.medicine_name} for User {med.user_id}")
                
                # ALERT 2: 30 minutes late (SMS)
                elif 30 <= minutes_late < 45 and med.alert_count < 2:
                    med.alert_count = 2
                    db.session.commit()
                    logging.warning(f"📱 ALERT 2 (30 min): {med.medicine_name} for User {med.user_id}")
                    print(f"🚨 [MOCK SMS] Send SMS: Patient missed {med.medicine_name}!")
                
                # ALERT 3: 45+ minutes late (SOS)
                elif minutes_late >= 45 and med.alert_count < 3:
                    med.alert_count = 3
                    db.session.commit()
                    logging.warning(f"🆘 ALERT 3 (45+ min): {med.medicine_name} for User {med.user_id}")
                    print(f"🆘 [EMERGENCY] SOS triggered for User {med.user_id} - Missed {med.medicine_name}")

def start_scheduler(app):
    """Start the background scheduler"""
    global scheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        func=lambda: check_missed_medications(app),
        trigger="interval",
        minutes=1,   # Runs every 1 minute for testing
        id="medication_check"
    )
    scheduler.start()
    logging.info("✅ Medication scheduler started (running every 1 minute for testing)")

def stop_scheduler():
    """Stop the scheduler (clean shutdown)"""
    global scheduler
    if scheduler:
        scheduler.shutdown()
        logging.info("⏹️ Scheduler stopped")