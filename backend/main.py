from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from datetime import datetime, timezone
import uuid
import asyncio
import logging
import os
import json
from urllib.parse import quote_plus

import google.generativeai as genai

from sqlalchemy import (
    create_engine, Column, String, Float, Text, DateTime, JSON,
    Enum as SAEnum, inspect
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.exc import OperationalError
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Database setup ────────────────────────────────────────────────────────────

MYSQL_USER     = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "Admin@123")
MYSQL_HOST     = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT     = os.getenv("MYSQL_PORT", "3306")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "orderdb")
encoded_password = quote_plus(MYSQL_PASSWORD)

DATABASE_URL = (
    f"mysql+pymysql://{MYSQL_USER}:{encoded_password}"
    f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
)

Base = declarative_base()

class OrderModel(Base):
    __tablename__ = "orders"

    id               = Column(String(36),   primary_key=True, index=True)
    customer_name    = Column(String(255),  nullable=False)
    customer_email   = Column(String(255),  nullable=False)
    shipping_address = Column(Text,         nullable=False)
    status           = Column(String(50),   nullable=False, default="PENDING")
    total_amount     = Column(Float,        nullable=False)
    created_at       = Column(String(50),   nullable=False)
    updated_at       = Column(String(50),   nullable=False)
    items            = Column(JSON,         nullable=False)   # stored as JSON array
    status_history   = Column(JSON,         nullable=False)   # stored as JSON array


def wait_for_db(engine, retries=5, delay=3):
    """Retry DB connection until MySQL is ready."""
    for i in range(retries):
        try:
            with engine.connect():
                logger.info("Database is ready.")
                return
        except OperationalError as e:
            logger.warning(f"DB not ready yet (attempt {i+1}/{retries}): {e}")
            time.sleep(delay)
    raise RuntimeError("Could not connect to MySQL after multiple retries.")


engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Gemini AI setup ──────────────────────────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyDvwlQvQhiCbDvsWngm6L0Uw0t3Mty6cb4")
_gemini_model = None

# Model priority list — tries each in order until one initialises successfully
_GEMINI_MODELS = [
    "gemini-2.5-flash",   # 🔥 best mix (latest + fast + cheap)
    "gemini-2.0-flash",   # fallback
    "gemini-2.5-pro",     # high quality fallback
]

if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        for _model_name in _GEMINI_MODELS:
            try:
                _gemini_model = genai.GenerativeModel(_model_name)
                logger.info(f"Gemini AI model initialised: {_model_name}")
                break
            except Exception as _e:
                logger.warning(f"Model {_model_name} unavailable: {_e}")
        if not _gemini_model:
            logger.error("All Gemini models failed to initialise.")
    except Exception as e:
        logger.error(f"Failed to configure Gemini: {e}")
else:
    logger.warning("GEMINI_API_KEY not set — /chat endpoint will return errors.")


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(title="Order Processing System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Enums & Models ────────────────────────────────────────────────────────────

class OrderStatus(str, Enum):
    PENDING    = "PENDING"
    PROCESSING = "PROCESSING"
    SHIPPED    = "SHIPPED"
    DELIVERED  = "DELIVERED"
    CANCELLED  = "CANCELLED"

class OrderItem(BaseModel):
    product_id:   str
    product_name: str
    quantity:     int   = Field(..., gt=0)
    unit_price:   float = Field(..., gt=0)

class CreateOrderRequest(BaseModel):
    customer_name:    str
    customer_email:   str
    items:            List[OrderItem] = Field(..., min_length=1)
    shipping_address: str

class UpdateStatusRequest(BaseModel):
    status: OrderStatus

class OrderResponse(BaseModel):
    id:               str
    customer_name:    str
    customer_email:   str
    items:            List[OrderItem]
    shipping_address: str
    status:           OrderStatus
    total_amount:     float
    created_at:       str
    updated_at:       str
    status_history:   List[dict]


# ── Helpers ───────────────────────────────────────────────────────────────────

def row_to_dict(row: OrderModel) -> dict:
    return {
        "id":               row.id,
        "customer_name":    row.customer_name,
        "customer_email":   row.customer_email,
        "shipping_address": row.shipping_address,
        "status":           row.status,
        "total_amount":     row.total_amount,
        "created_at":       row.created_at,
        "updated_at":       row.updated_at,
        "items":            row.items,
        "status_history":   row.status_history,
    }


def make_order_row(req: CreateOrderRequest) -> OrderModel:
    now   = datetime.now(timezone.utc).isoformat()
    total = sum(i.quantity * i.unit_price for i in req.items)
    oid   = str(uuid.uuid4())
    return OrderModel(
        id               = oid,
        customer_name    = req.customer_name,
        customer_email   = req.customer_email,
        shipping_address = req.shipping_address,
        status           = OrderStatus.PENDING,
        total_amount     = round(total, 2),
        created_at       = now,
        updated_at       = now,
        items            = [i.model_dump() for i in req.items],
        status_history   = [{"status": OrderStatus.PENDING, "timestamp": now, "note": "Order placed"}],
    )


# ── Background job ────────────────────────────────────────────────────────────

async def auto_process_pending_orders():
    """Runs every 5 minutes; moves PENDING → PROCESSING."""
    while True:
        await asyncio.sleep(300)
        db  = SessionLocal()
        now = datetime.now(timezone.utc).isoformat()
        try:
            pending = db.query(OrderModel).filter(OrderModel.status == OrderStatus.PENDING).all()
            for order in pending:
                order.status     = OrderStatus.PROCESSING
                order.updated_at = now
                history = list(order.status_history)
                history.append({
                    "status":    OrderStatus.PROCESSING,
                    "timestamp": now,
                    "note":      "Auto-promoted by background job",
                })
                order.status_history = history
            db.commit()
            if pending:
                logger.info(f"[bg-job] Promoted {len(pending)} PENDING order(s) → PROCESSING")
        except Exception as e:
            logger.error(f"[bg-job] Error: {e}")
            db.rollback()
        finally:
            db.close()


# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    wait_for_db(engine)
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ensured.")

    asyncio.create_task(auto_process_pending_orders())
    logger.info("Background job started (runs every 5 minutes).")

    # Seed demo data only when the table is empty
    db: Session = SessionLocal()
    try:
        if db.query(OrderModel).count() == 0:
            demo_orders = [
                CreateOrderRequest(
                    customer_name="Alice Johnson",
                    customer_email="alice@example.com",
                    items=[
                        OrderItem(product_id="P001", product_name="Mechanical Keyboard", quantity=1, unit_price=129.99),
                        OrderItem(product_id="P002", product_name="USB-C Hub",           quantity=2, unit_price=39.99),
                    ],
                    shipping_address="42 Elm Street, San Francisco, CA 94105",
                ),
                CreateOrderRequest(
                    customer_name="Bob Smith",
                    customer_email="bob@example.com",
                    items=[OrderItem(product_id="P003", product_name="Noise-Cancelling Headphones", quantity=1, unit_price=249.00)],
                    shipping_address="7 Oak Ave, New York, NY 10001",
                ),
                CreateOrderRequest(
                    customer_name="Carol White",
                    customer_email="carol@example.com",
                    items=[
                        OrderItem(product_id="P004", product_name="Standing Desk", quantity=1, unit_price=499.00),
                        OrderItem(product_id="P005", product_name="Monitor Arm",   quantity=1, unit_price=89.00),
                    ],
                    shipping_address="15 Pine Rd, Austin, TX 78701",
                ),
            ]
            rows = [make_order_row(r) for r in demo_orders]
            db.add_all(rows)
            db.flush()   # get the ids assigned

            # Give second order a SHIPPED status for variety
            if len(rows) >= 2:
                now = datetime.now(timezone.utc).isoformat()
                rows[1].status     = OrderStatus.SHIPPED
                rows[1].updated_at = now
                history = list(rows[1].status_history)
                history.extend([
                    {"status": OrderStatus.PROCESSING, "timestamp": now, "note": "Payment confirmed"},
                    {"status": OrderStatus.SHIPPED,    "timestamp": now, "note": "Dispatched via FedEx"},
                ])
                rows[1].status_history = history

            db.commit()
            logger.info("Demo orders seeded into MySQL.")
    except Exception as e:
        logger.error(f"Seeding error: {e}")
        db.rollback()
    finally:
        db.close()


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Order Processing API is running 🚀"}

@app.get("/health")
def health():
    db = SessionLocal()
    total = db.query(OrderModel).count()
    db.close()
    return {"status": "ok", "total_orders": total}

# Create order
@app.post("/orders", response_model=OrderResponse, status_code=201)
def create_order(req: CreateOrderRequest):
    db    = SessionLocal()
    order = make_order_row(req)
    db.add(order)
    db.commit()
    db.refresh(order)
    logger.info(f"Order created: {order.id}")
    result = row_to_dict(order)
    db.close()
    return result

# Get all orders (with optional status filter)
@app.get("/orders", response_model=List[OrderResponse])
def list_orders(status: Optional[OrderStatus] = Query(None)):
    db = SessionLocal()
    q  = db.query(OrderModel)
    if status:
        q = q.filter(OrderModel.status == status.value)
    rows   = q.all()
    result = sorted([row_to_dict(r) for r in rows], key=lambda o: o["created_at"], reverse=True)
    db.close()
    return result

# Get single order
@app.get("/orders/{order_id}", response_model=OrderResponse)
def get_order(order_id: str):
    db    = SessionLocal()
    order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
    db.close()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order '{order_id}' not found")
    return row_to_dict(order)

# Update order status
@app.patch("/orders/{order_id}/status", response_model=OrderResponse)
def update_order_status(order_id: str, body: UpdateStatusRequest):
    db    = SessionLocal()
    order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
    if not order:
        db.close()
        raise HTTPException(status_code=404, detail=f"Order '{order_id}' not found")
    if order.status == OrderStatus.CANCELLED:
        db.close()
        raise HTTPException(status_code=400, detail="Cannot update a cancelled order")
    now              = datetime.now(timezone.utc).isoformat()
    order.status     = body.status
    order.updated_at = now
    history          = list(order.status_history)
    history.append({"status": body.status, "timestamp": now, "note": "Manually updated"})
    order.status_history = history
    db.commit()
    result = row_to_dict(order)
    db.close()
    return result

# Cancel order
@app.delete("/orders/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(order_id: str):
    db    = SessionLocal()
    order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
    if not order:
        db.close()
        raise HTTPException(status_code=404, detail=f"Order '{order_id}' not found")
    if order.status != OrderStatus.PENDING:
        db.close()
        raise HTTPException(
            status_code=400,
            detail=f"Only PENDING orders can be cancelled. Current status: {order['status']}",
        )
    now              = datetime.now(timezone.utc).isoformat()
    order.status     = OrderStatus.CANCELLED
    order.updated_at = now
    history          = list(order.status_history)
    history.append({"status": OrderStatus.CANCELLED, "timestamp": now, "note": "Cancelled by customer"})
    order.status_history = history
    db.commit()
    result = row_to_dict(order)
    db.close()
    return result

# Stats
@app.get("/stats")
def get_stats():
    db   = SessionLocal()
    rows = db.query(OrderModel).all()
    db.close()
    total         = len(rows)
    by_status     = {}
    total_revenue = 0.0
    for o in rows:
        s            = o.status
        by_status[s] = by_status.get(s, 0) + 1
        if o.status != OrderStatus.CANCELLED:
            total_revenue += o.total_amount
    return {
        "total_orders":  total,
        "by_status":     by_status,
        "total_revenue": round(total_revenue, 2),
    }


# ── Chatbot ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str


@app.post("/chat")
def chat(req: ChatRequest):
    """Answer natural-language questions about orders using Gemini AI."""
    if not _gemini_model:
        raise HTTPException(
            status_code=503,
            detail="Chatbot unavailable: GEMINI_API_KEY is not configured. "
                   "Add it to docker-compose.yml and restart the containers."
        )

    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # ── Fetch live data from MySQL ────────────────────────────────────────────
    db   = SessionLocal()
    rows = db.query(OrderModel).all()
    db.close()

    total         = len(rows)
    by_status     = {}
    total_revenue = 0.0
    order_summaries = []

    for o in rows:
        by_status[o.status] = by_status.get(o.status, 0) + 1
        if o.status != OrderStatus.CANCELLED:
            total_revenue += o.total_amount

        # Build compact per-order summary (keeps prompt small)
        items_str = ", ".join(
            f"{i.get('product_name','?')} x{i.get('quantity',1)}"
            for i in (o.items or [])
        )
        order_summaries.append(
            f"- Order ID: {o.id[:8]}... | Customer: {o.customer_name} "
            f"({o.customer_email}) | Status: {o.status} | "
            f"Total: ${o.total_amount:.2f} | Items: {items_str} | "
            f"Date: {o.created_at[:10]}"
        )

    orders_block = "\n".join(order_summaries) if order_summaries else "No orders yet."
    stats_block  = (
        f"Total orders: {total}\n"
        f"By status: {json.dumps(by_status)}\n"
        f"Total revenue (excl. cancelled): ${total_revenue:.2f}"
    )

    # ── Build prompt ──────────────────────────────────────────────────────────
    prompt = f"""You are an intelligent order management assistant for an e-commerce system.
Answer the user's question based ONLY on the order data provided below.
Be concise, friendly, and accurate.

=== ORDER STATISTICS ===
{stats_block}

=== ORDER LIST ===
{orders_block}

=== USER QUESTION ===
{req.question.strip()}

Provide a clear, direct answer. If the question asks about a specific customer or order,
look it up in the data. If the information is not available in the data, say so honestly.
"""

    # ── Call Gemini ───────────────────────────────────────────────────────────
    try:
        response = _gemini_model.generate_content(prompt)
        answer   = response.text.strip()
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Gemini API error: {str(e)}"
        )

    return {"answer": answer}
