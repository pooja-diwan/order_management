from sqlalchemy import create_engine, text
from main import DATABASE_URL
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    engine = create_engine(DATABASE_URL)
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE orders ADD COLUMN user_id VARCHAR(36) DEFAULT NULL;"))
            logger.info("Added user_id column")
        except Exception as e:
            logger.info("user_id column might already exist: %s", e)
        
        try:
            conn.execute(text("ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) DEFAULT 'COD';"))
            logger.info("Added payment_method column")
        except Exception as e:
            logger.info("payment_method column might already exist: %s", e)
            
        try:
            conn.execute(text("ALTER TABLE orders ADD COLUMN payment_status VARCHAR(50) DEFAULT 'PENDING';"))
            logger.info("Added payment_status column")
        except Exception as e:
            logger.info("payment_status column might already exist: %s", e)

if __name__ == "__main__":
    migrate()
    print("Migration completed.")
