import os
from sqlalchemy import create_engine, text
from main import DATABASE_URL
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_db():
    engine = create_engine(DATABASE_URL)
    with engine.begin() as conn:
        res = conn.execute(text("SELECT id, name, email FROM users LIMIT 1"))
        row = res.fetchone()
        if row:
            uid, uname, email = row
            logger.info("Found user %s %s. Updating anonymous records...", uname, uid)
            conn.execute(
                text("UPDATE orders SET user_id = :uid, customer_name = :uname, customer_email = :email WHERE user_id = 'anonymous'"),
                {"uid": uid, "uname": uname, "email": email}
            )
            conn.execute(text("UPDATE cart_items SET user_id = :uid WHERE user_id = 'anonymous'"), {"uid": uid})
            conn.execute(text("UPDATE ratings SET user_id = :uid, user_name = :uname WHERE user_id = 'anonymous'"), {"uid": uid, "uname": uname})
            logger.info("Database fixed. The recent order has been linked to your account.")
        else:
            logger.warning("No users found in database.")

if __name__ == "__main__":
    fix_db()
