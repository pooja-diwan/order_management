from fastapi import FastAPI, HTTPException, Query, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from datetime import datetime, timezone, timedelta
import uuid
import asyncio
import logging
import os
import json
from urllib.parse import quote_plus

from passlib.context import CryptContext
from jose import jwt, JWTError

import google.generativeai as genai

from sqlalchemy import (
    create_engine, Column, String, Float, Text, DateTime, JSON, Integer,
    Enum as SAEnum, inspect, ForeignKey
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from sqlalchemy.exc import OperationalError
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Database setup ─────────────────────────────────────────────────────────────

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

# ── Auth / JWT setup ─────────────────────────────────────────────────────────

JWT_SECRET    = os.getenv("JWT_SECRET", "orderflow-super-secret-dev-key-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return {}


# ── DB Models ─────────────────────────────────────────────────────────────────

class UserModel(Base):
    __tablename__ = "users"

    id              = Column(String(36),  primary_key=True, index=True)
    name            = Column(String(255), nullable=False)
    email           = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at      = Column(String(50),  nullable=False)


class ProductModel(Base):
    __tablename__ = "products"

    id           = Column(String(36),   primary_key=True, index=True)
    name         = Column(String(255),  nullable=False)
    description  = Column(Text,         nullable=False)
    category     = Column(String(100),  nullable=False, index=True)
    price        = Column(Float,        nullable=False)   # in INR
    original_price = Column(Float,      nullable=True)    # MRP / strike-through price
    image_url    = Column(String(500),  nullable=True)
    stock        = Column(Integer,      nullable=False, default=100)
    rating_avg   = Column(Float,        nullable=False, default=0.0)
    rating_count = Column(Integer,      nullable=False, default=0)
    brand        = Column(String(100),  nullable=True)
    created_at   = Column(String(50),   nullable=False)


class CartItemModel(Base):
    __tablename__ = "cart_items"

    id         = Column(String(36),  primary_key=True, index=True)
    user_id    = Column(String(36),  nullable=False, index=True)
    product_id = Column(String(36),  nullable=False)
    quantity   = Column(Integer,     nullable=False, default=1)
    added_at   = Column(String(50),  nullable=False)


class RatingModel(Base):
    __tablename__ = "ratings"

    id         = Column(String(36),  primary_key=True, index=True)
    user_id    = Column(String(36),  nullable=False, index=True)
    user_name  = Column(String(255), nullable=False)
    product_id = Column(String(36),  nullable=False, index=True)
    stars      = Column(Integer,     nullable=False)   # 1-5
    review     = Column(Text,        nullable=True)
    created_at = Column(String(50),  nullable=False)


class OrderModel(Base):
    __tablename__ = "orders"

    id               = Column(String(36),   primary_key=True, index=True)
    user_id          = Column(String(36),   nullable=True, index=True)
    customer_name    = Column(String(255),  nullable=False)
    customer_email   = Column(String(255),  nullable=False)
    shipping_address = Column(Text,         nullable=False)
    status           = Column(String(50),   nullable=False, default="PENDING")
    total_amount     = Column(Float,        nullable=False)   # in INR
    payment_method   = Column(String(50),   nullable=True, default="COD")
    payment_status   = Column(String(50),   nullable=True, default="PENDING")
    created_at       = Column(String(50),   nullable=False)
    updated_at       = Column(String(50),   nullable=False)
    items            = Column(JSON,         nullable=False)
    status_history   = Column(JSON,         nullable=False)


class ReturnModel(Base):
    __tablename__ = "returns"

    id          = Column(String(36),  primary_key=True, index=True)
    order_id    = Column(String(36),  nullable=False, index=True)
    user_id     = Column(String(36),  nullable=False, index=True)
    reason      = Column(Text,        nullable=False)
    return_type = Column(String(20),  nullable=False, default="RETURN")  # RETURN | EXCHANGE
    status      = Column(String(20),  nullable=False, default="PENDING") # PENDING | APPROVED | REJECTED
    created_at  = Column(String(50),  nullable=False)
    updated_at  = Column(String(50),  nullable=False)


def wait_for_db(engine, retries=5, delay=3):
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


# ── Gemini AI setup ───────────────────────────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyDgsg80-jXmGJGjaJFj7s3rqwxqX2KQjIQ")
_gemini_model = None

_GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.5-pro",
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

app = FastAPI(title="ShopFlow – E-Commerce API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Enums & Pydantic Models ────────────────────────────────────────────────────

class OrderStatus(str, Enum):
    PENDING    = "PENDING"
    PROCESSING = "PROCESSING"
    SHIPPED    = "SHIPPED"
    DELIVERED  = "DELIVERED"
    CANCELLED  = "CANCELLED"


class PaymentMethod(str, Enum):
    COD  = "COD"
    UPI  = "UPI"
    CARD = "CARD"


class ReturnType(str, Enum):
    RETURN   = "RETURN"
    EXCHANGE = "EXCHANGE"


# Product
class ProductResponse(BaseModel):
    id:             str
    name:           str
    description:    str
    category:       str
    price:          float
    original_price: Optional[float]
    image_url:      Optional[str]
    stock:          int
    rating_avg:     float
    rating_count:   int
    brand:          Optional[str]
    created_at:     str


# Cart
class AddToCartRequest(BaseModel):
    product_id: str
    quantity:   int = Field(1, ge=1)


class UpdateCartItemRequest(BaseModel):
    quantity: int = Field(..., ge=1)


class CartItemResponse(BaseModel):
    id:         str
    product_id: str
    quantity:   int
    product:    Optional[ProductResponse]


# Rating
class AddRatingRequest(BaseModel):
    product_id: str
    stars:      int = Field(..., ge=1, le=5)
    review:     Optional[str] = None


class RatingResponse(BaseModel):
    id:         str
    user_id:    str
    user_name:  str
    product_id: str
    stars:      int
    review:     Optional[str]
    created_at: str


# Checkout
class CheckoutRequest(BaseModel):
    shipping_address: str
    payment_method:   PaymentMethod = PaymentMethod.COD
    user_id:          Optional[str] = None  # fallback if token not parsed


# Order
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
    payment_method:   Optional[str] = "COD"
    user_id:          Optional[str] = None


class UpdateStatusRequest(BaseModel):
    status: OrderStatus


class OrderResponse(BaseModel):
    id:               str
    user_id:          Optional[str]
    customer_name:    str
    customer_email:   str
    items:            List[OrderItem]
    shipping_address: str
    status:           OrderStatus
    total_amount:     float
    payment_method:   Optional[str]
    payment_status:   Optional[str]
    created_at:       str
    updated_at:       str
    status_history:   List[dict]


# Return
class CreateReturnRequest(BaseModel):
    reason:      str
    return_type: ReturnType = ReturnType.RETURN


class ReturnResponse(BaseModel):
    id:          str
    order_id:    str
    user_id:     str
    reason:      str
    return_type: str
    status:      str
    created_at:  str
    updated_at:  str


# Auth
class SignupRequest(BaseModel):
    name:     str = Field(..., min_length=1)
    email:    str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email:    str
    password: str


class AuthResponse(BaseModel):
    token: str
    user:  dict


# Chat
class ChatRequest(BaseModel):
    question: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def row_to_order_dict(row: OrderModel) -> dict:
    return {
        "id":               row.id,
        "user_id":          row.user_id,
        "customer_name":    row.customer_name,
        "customer_email":   row.customer_email,
        "shipping_address": row.shipping_address,
        "status":           row.status,
        "total_amount":     row.total_amount,
        "payment_method":   row.payment_method,
        "payment_status":   row.payment_status,
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
        user_id          = req.user_id,
        customer_name    = req.customer_name,
        customer_email   = req.customer_email,
        shipping_address = req.shipping_address,
        status           = OrderStatus.PENDING,
        total_amount     = round(total, 2),
        payment_method   = req.payment_method or "COD",
        payment_status   = "PAID" if (req.payment_method or "COD") != "COD" else "PENDING",
        created_at       = now,
        updated_at       = now,
        items            = [i.model_dump() for i in req.items],
        status_history   = [{"status": OrderStatus.PENDING, "timestamp": now, "note": "Order placed"}],
    )


def product_to_dict(p: ProductModel) -> dict:
    return {
        "id":             p.id,
        "name":           p.name,
        "description":    p.description,
        "category":       p.category,
        "price":          p.price,
        "original_price": p.original_price,
        "image_url":      p.image_url,
        "stock":          p.stock,
        "rating_avg":     p.rating_avg,
        "rating_count":   p.rating_count,
        "brand":          p.brand,
        "created_at":     p.created_at,
    }


def recalc_product_rating(db: Session, product_id: str):
    """Recompute avg rating for a product after a new rating is added."""
    ratings = db.query(RatingModel).filter(RatingModel.product_id == product_id).all()
    count = len(ratings)
    avg   = round(sum(r.stars for r in ratings) / count, 1) if count else 0.0
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if product:
        product.rating_avg   = avg
        product.rating_count = count
        db.commit()


# ── Background job ────────────────────────────────────────────────────────────

async def auto_process_pending_orders():
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

SEED_PRODUCTS = [
    # Electronics
    {"id": "P001", "name": "boAt Rockerz 450 Bluetooth Headphones", "description": "On-ear wireless headphones with 15 hours of playback, deep bass, and soft padded earcups. Perfect for music lovers on the go.", "category": "Electronics", "price": 1299.0, "original_price": 3990.0, "brand": "boAt", "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80", "stock": 150},
    {"id": "P002", "name": "Redmi Note 13 Pro (8GB/256GB)", "description": "6.67\" AMOLED display, 200MP primary camera, Snapdragon 7s Gen 2, 5000mAh battery with 67W turbo charging.", "category": "Electronics", "price": 24999.0, "original_price": 29999.0, "brand": "Redmi", "image_url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80", "stock": 75},
    {"id": "P003", "name": "Logitech MK270r Wireless Keyboard & Mouse", "description": "Reliable wireless combo with 10m range, 24-month battery life for the mouse, plug-and-play nano receiver.", "category": "Electronics", "price": 1595.0, "original_price": 2495.0, "brand": "Logitech", "image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80", "stock": 200},
    {"id": "P004", "name": "Samsung 27\" FHD IPS Monitor (LS27F358FHWXXL)", "description": "27-inch Full HD IPS panel, 5ms response time, AMD FreeSync, HDMI & VGA ports, flicker-free technology.", "category": "Electronics", "price": 14999.0, "original_price": 19999.0, "brand": "Samsung", "image_url": "https://images.unsplash.com/photo-1527443224154-c4a573d1e5d0?w=400&q=80", "stock": 60},
    {"id": "P005", "name": "Anker 65W GaN USB-C Fast Charger", "description": "Compact GaN charger with 65W output, supports PPS fast charging, foldable prongs, USB-C + USB-A ports.", "category": "Electronics", "price": 2499.0, "original_price": 3999.0, "brand": "Anker", "image_url": "https://images.unsplash.com/photo-1609592806596-b9cc62c364b2?w=400&q=80", "stock": 300},
    # Clothing
    {"id": "P006", "name": "Allen Solly Men's Classic Fit Shirt", "description": "Premium cotton-blend formal shirt, wrinkle-resistant, perfect for office and casual outings. Available in multiple colours.", "category": "Clothing", "price": 1199.0, "original_price": 2299.0, "brand": "Allen Solly", "image_url": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&q=80", "stock": 500},
    {"id": "P007", "name": "Levi's 511 Slim Fit Jeans", "description": "Slim fit jeans with a hint of stretch for all-day comfort, classic 5-pocket styling, durable denim construction.", "category": "Clothing", "price": 2699.0, "original_price": 3999.0, "brand": "Levi's", "image_url": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80", "stock": 400},
    {"id": "P008", "name": "Nike Air Max 270 Running Shoes", "description": "Lightweight mesh upper, Air Max cushioning for all-day comfort, rubber outsole for durability.", "category": "Clothing", "price": 8995.0, "original_price": 12995.0, "brand": "Nike", "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80", "stock": 180},
    {"id": "P009", "name": "W Women's Kurta Set (XS-3XL)", "description": "Elegant cotton kurta with palazzo pants, traditional Indian prints, machine washable, festive wear.", "category": "Clothing", "price": 1599.0, "original_price": 2799.0, "brand": "W", "image_url": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80", "stock": 350},
    {"id": "P010", "name": "Peter England Men's Chinos", "description": "Slim tapered fit chinos, stretch fabric, versatile for casual and semi-formal occasions.", "category": "Clothing", "price": 1299.0, "original_price": 2499.0, "brand": "Peter England", "image_url": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&q=80", "stock": 420},
    # Home & Kitchen
    {"id": "P011", "name": "Prestige Iris 750W Mixer Grinder", "description": "750W motor, 3 stainless steel jars (0.4L, 0.8L, 1.5L), 3-speed control with inching, 5-year motor warranty.", "category": "Home & Kitchen", "price": 2699.0, "original_price": 4499.0, "brand": "Prestige", "image_url": "https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&q=80", "stock": 120},
    {"id": "P012", "name": "Milton Thermosteel Flip Lid Flask 500ml", "description": "Double-wall stainless steel thermos, keeps beverages hot 24 hours / cold 12 hours, leak-proof flip lid.", "category": "Home & Kitchen", "price": 599.0, "original_price": 999.0, "brand": "Milton", "image_url": "https://images.unsplash.com/photo-1544816495-f6e2c5b0fa9f?w=400&q=80", "stock": 800},
    {"id": "P013", "name": "Wonderchef Nutri-Blend Smart 400W Blender", "description": "Personal blender with two 450ml jars, stainless steel blades, powerful 400W motor, BPA-free Tritan jars.", "category": "Home & Kitchen", "price": 1999.0, "original_price": 3299.0, "brand": "Wonderchef", "image_url": "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&q=80", "stock": 90},
    {"id": "P014", "name": "Solimo 100% Cotton Bath Towel (Pack of 2)", "description": "Super-soft 450 GSM cotton towels, quick-dry, fade-resistant, 70×140 cm each, machine washable.", "category": "Home & Kitchen", "price": 799.0, "original_price": 1399.0, "brand": "Solimo", "image_url": "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&q=80", "stock": 600},
    {"id": "P015", "name": "Philips 9W LED Bulb (Pack of 6)", "description": "Energy-efficient B22 base LEDs, 830 lumens, 6500K cool daylight, 25,000 hours lifespan, BEE 5-star rated.", "category": "Home & Kitchen", "price": 449.0, "original_price": 749.0, "brand": "Philips", "image_url": "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=400&q=80", "stock": 1000},
    # Books
    {"id": "P016", "name": "Atomic Habits – James Clear", "description": "The life-changing million-copy bestseller on building good habits and breaking bad ones with tiny changes.", "category": "Books", "price": 499.0, "original_price": 799.0, "brand": "Penguin", "image_url": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80", "stock": 500},
    {"id": "P017", "name": "Rich Dad Poor Dad – Robert Kiyosaki", "description": "The #1 personal finance book of all time. What the rich teach their kids about money that the poor do not.", "category": "Books", "price": 299.0, "original_price": 499.0, "brand": "Plata Publishing", "image_url": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80", "stock": 700},
    # Fitness
    {"id": "P018", "name": "Decathlon Corength Rubber Hex Dumbbell 5 kg", "description": "Ergonomic hex shape prevents rolling, non-slip rubber coating, cast-iron core for durability, sold as pair.", "category": "Fitness", "price": 999.0, "original_price": 1499.0, "brand": "Decathlon", "image_url": "https://images.unsplash.com/photo-1587401010200-c9c7eb1db4a7?w=400&q=80", "stock": 400},
    {"id": "P019", "name": "Boldfit Yoga Mat 6mm Non-Slip", "description": "Extra-thick 6mm TPE yoga mat, double-sided non-slip texture, carrying strap included, eco-friendly material.", "category": "Fitness", "price": 699.0, "original_price": 1299.0, "brand": "Boldfit", "image_url": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&q=80", "stock": 300},
    # Beauty
    {"id": "P020", "name": "Lakme Absolute Skin Natural Mousse SPF 8 (Golden Medium)", "description": "Lightweight foundation mousse, buildable coverage, matte finish, 30ml, suitable for Indian skin tones.", "category": "Beauty", "price": 449.0, "original_price": 749.0, "brand": "Lakme", "image_url": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80", "stock": 600},
    {"id": "P021", "name": "Mamaearth Vitamin C Face Serum 30ml", "description": "10% Vitamin C + 1% Niacinamide, reduces dark spots, brightens skin, dermatologically tested, cruelty-free.", "category": "Beauty", "price": 599.0, "original_price": 999.0, "brand": "Mamaearth", "image_url": "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&q=80", "stock": 450},
    # Stationery
    {"id": "P022", "name": "Parker Jotter Ballpoint Pen – Pack of 3", "description": "Classic stainless steel ballpoint pens, smooth medium-point writing, interchangeable refills, gift-worthy design.", "category": "Stationery", "price": 799.0, "original_price": 1299.0, "brand": "Parker", "image_url": "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&q=80", "stock": 350},
]


@app.on_event("startup")
async def startup_event():
    wait_for_db(engine)
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ensured.")

    asyncio.create_task(auto_process_pending_orders())
    logger.info("Background job started (runs every 5 minutes).")

    # Seed products
    db: Session = SessionLocal()
    try:
        if db.query(ProductModel).count() == 0:
            now = datetime.now(timezone.utc).isoformat()
            for sp in SEED_PRODUCTS:
                p = ProductModel(
                    id             = sp["id"],
                    name           = sp["name"],
                    description    = sp["description"],
                    category       = sp["category"],
                    price          = sp["price"],
                    original_price = sp.get("original_price"),
                    image_url      = sp.get("image_url"),
                    stock          = sp.get("stock", 100),
                    brand          = sp.get("brand"),
                    rating_avg     = 0.0,
                    rating_count   = 0,
                    created_at     = now,
                )
                db.add(p)
            db.commit()
            logger.info(f"Seeded {len(SEED_PRODUCTS)} products.")

        # Seed demo orders if empty
        if db.query(OrderModel).count() == 0:
            demo_orders = [
                CreateOrderRequest(
                    customer_name    = "Aarav Sharma",
                    customer_email   = "aarav@example.com",
                    items=[
                        OrderItem(product_id="P001", product_name="boAt Rockerz 450 Headphones",   quantity=1, unit_price=1299.0),
                        OrderItem(product_id="P005", product_name="Anker 65W GaN Charger",         quantity=2, unit_price=2499.0),
                    ],
                    shipping_address = "12, MG Road, Bengaluru, Karnataka 560001",
                    payment_method   = "UPI",
                ),
                CreateOrderRequest(
                    customer_name    = "Priya Nair",
                    customer_email   = "priya@example.com",
                    items=[OrderItem(product_id="P002", product_name="Redmi Note 13 Pro 8/256GB", quantity=1, unit_price=24999.0)],
                    shipping_address = "45, Connaught Place, New Delhi 110001",
                    payment_method   = "CARD",
                ),
                CreateOrderRequest(
                    customer_name    = "Rohit Mehta",
                    customer_email   = "rohit@example.com",
                    items=[
                        OrderItem(product_id="P011", product_name="Prestige Iris Mixer Grinder", quantity=1, unit_price=2699.0),
                        OrderItem(product_id="P014", product_name="Solimo Bath Towel Pack of 2", quantity=2, unit_price=799.0),
                    ],
                    shipping_address = "8, Marine Lines, Mumbai, Maharashtra 400002",
                    payment_method   = "COD",
                ),
            ]
            rows = [make_order_row(r) for r in demo_orders]
            db.add_all(rows)
            db.flush()

            now = datetime.now(timezone.utc).isoformat()
            rows[1].status     = OrderStatus.SHIPPED
            rows[1].updated_at = now
            h = list(rows[1].status_history)
            h.extend([
                {"status": OrderStatus.PROCESSING, "timestamp": now, "note": "Payment confirmed"},
                {"status": OrderStatus.SHIPPED,    "timestamp": now, "note": "Dispatched via Ekart Logistics"},
            ])
            rows[1].status_history = h

            db.commit()
            logger.info("Demo orders seeded.")
    except Exception as e:
        logger.error(f"Seeding error: {e}")
        db.rollback()
    finally:
        db.close()


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "ShopFlow E-Commerce API is running 🚀"}


@app.get("/health")
def health():
    db    = SessionLocal()
    orders = db.query(OrderModel).count()
    products = db.query(ProductModel).count()
    db.close()
    return {"status": "ok", "total_orders": orders, "total_products": products}


# ── Product Routes ────────────────────────────────────────────────────────────

@app.get("/products", response_model=List[ProductResponse])
def list_products(
    category: Optional[str] = Query(None),
    search:   Optional[str] = Query(None),
    sort:     Optional[str] = Query(None),   # "price_asc" | "price_desc" | "rating"
):
    db = SessionLocal()
    q  = db.query(ProductModel)
    if category:
        q = q.filter(ProductModel.category == category)
    if search:
        q = q.filter(ProductModel.name.ilike(f"%{search}%"))
    rows = q.all()
    db.close()

    result = [product_to_dict(p) for p in rows]
    if sort == "price_asc":
        result.sort(key=lambda x: x["price"])
    elif sort == "price_desc":
        result.sort(key=lambda x: x["price"], reverse=True)
    elif sort == "rating":
        result.sort(key=lambda x: x["rating_avg"], reverse=True)
    return result


@app.get("/products/categories")
def list_categories():
    db  = SessionLocal()
    cats = db.query(ProductModel.category).distinct().all()
    db.close()
    return {"categories": [c[0] for c in cats]}


@app.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: str):
    db = SessionLocal()
    p  = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    db.close()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return product_to_dict(p)


# ── Rating Routes ─────────────────────────────────────────────────────────────

@app.get("/products/{product_id}/ratings", response_model=List[RatingResponse])
def get_product_ratings(product_id: str):
    db      = SessionLocal()
    ratings = db.query(RatingModel).filter(RatingModel.product_id == product_id).all()
    db.close()
    return [
        {
            "id":         r.id,
            "user_id":    r.user_id,
            "user_name":  r.user_name,
            "product_id": r.product_id,
            "stars":      r.stars,
            "review":     r.review,
            "created_at": r.created_at,
        }
        for r in ratings
    ]


@app.post("/ratings", response_model=RatingResponse, status_code=201)
def add_rating(req: AddRatingRequest, x_user_id: Optional[str] = Header(None), x_user_name: Optional[str] = Header(None)):
    """Add a rating. Pass X-User-Id and X-User-Name headers."""
    db = SessionLocal()
    try:
        product = db.query(ProductModel).filter(ProductModel.id == req.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        uid   = x_user_id   or "anonymous"
        uname = x_user_name or "Anonymous User"
        now   = datetime.now(timezone.utc).isoformat()

        # Check if already rated by this user
        existing = db.query(RatingModel).filter(
            RatingModel.user_id == uid,
            RatingModel.product_id == req.product_id
        ).first()

        if existing:
            existing.stars      = req.stars
            existing.review     = req.review
            existing.created_at = now
            db.commit()
            recalc_product_rating(db, req.product_id)
            result = {
                "id": existing.id, "user_id": uid, "user_name": uname,
                "product_id": req.product_id, "stars": req.stars,
                "review": req.review, "created_at": now,
            }
        else:
            rating = RatingModel(
                id         = str(uuid.uuid4()),
                user_id    = uid,
                user_name  = uname,
                product_id = req.product_id,
                stars      = req.stars,
                review     = req.review,
                created_at = now,
            )
            db.add(rating)
            db.commit()
            recalc_product_rating(db, req.product_id)
            result = {
                "id": rating.id, "user_id": uid, "user_name": uname,
                "product_id": req.product_id, "stars": req.stars,
                "review": req.review, "created_at": now,
            }
        return result
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Rating error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save rating")
    finally:
        db.close()


# ── Cart Routes ───────────────────────────────────────────────────────────────

def _get_cart_with_products(db: Session, user_id: str):
    items = db.query(CartItemModel).filter(CartItemModel.user_id == user_id).all()
    result = []
    for item in items:
        product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
        result.append({
            "id":         item.id,
            "product_id": item.product_id,
            "quantity":   item.quantity,
            "product":    product_to_dict(product) if product else None,
        })
    return result


@app.get("/cart/{user_id}")
def get_cart(user_id: str):
    db     = SessionLocal()
    result = _get_cart_with_products(db, user_id)
    db.close()
    return {"items": result}


@app.post("/cart", status_code=201)
def add_to_cart(req: AddToCartRequest, x_user_id: Optional[str] = Header(None)):
    uid = x_user_id or "anonymous"
    db  = SessionLocal()
    try:
        product = db.query(ProductModel).filter(ProductModel.id == req.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        if product.stock < req.quantity:
            raise HTTPException(status_code=400, detail=f"Only {product.stock} units in stock")

        existing = db.query(CartItemModel).filter(
            CartItemModel.user_id == uid,
            CartItemModel.product_id == req.product_id
        ).first()

        if existing:
            existing.quantity = min(existing.quantity + req.quantity, product.stock)
        else:
            item = CartItemModel(
                id         = str(uuid.uuid4()),
                user_id    = uid,
                product_id = req.product_id,
                quantity   = req.quantity,
                added_at   = datetime.now(timezone.utc).isoformat(),
            )
            db.add(item)

        db.commit()
        result = _get_cart_with_products(db, uid)
        return {"items": result, "message": "Added to cart"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Cart add error: {e}")
        raise HTTPException(status_code=500, detail="Failed to add to cart")
    finally:
        db.close()


@app.put("/cart/{item_id}")
def update_cart_item(item_id: str, req: UpdateCartItemRequest, x_user_id: Optional[str] = Header(None)):
    uid = x_user_id or "anonymous"
    db  = SessionLocal()
    try:
        item = db.query(CartItemModel).filter(
            CartItemModel.id == item_id,
            CartItemModel.user_id == uid
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="Cart item not found")
        item.quantity = req.quantity
        db.commit()
        result = _get_cart_with_products(db, uid)
        return {"items": result}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.delete("/cart/{item_id}")
def remove_cart_item(item_id: str, x_user_id: Optional[str] = Header(None)):
    uid = x_user_id or "anonymous"
    db  = SessionLocal()
    try:
        item = db.query(CartItemModel).filter(
            CartItemModel.id == item_id,
            CartItemModel.user_id == uid
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="Cart item not found")
        db.delete(item)
        db.commit()
        result = _get_cart_with_products(db, uid)
        return {"items": result, "message": "Item removed"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.delete("/cart/clear/{user_id}")
def clear_cart(user_id: str):
    db = SessionLocal()
    try:
        db.query(CartItemModel).filter(CartItemModel.user_id == user_id).delete()
        db.commit()
        return {"message": "Cart cleared"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# ── Checkout Route ────────────────────────────────────────────────────────────

@app.post("/checkout", response_model=OrderResponse, status_code=201)
def checkout(req: CheckoutRequest, x_user_id: Optional[str] = Header(None), x_user_name: Optional[str] = Header(None), x_user_email: Optional[str] = Header(None)):
    uid    = x_user_id    or req.user_id or "anonymous"
    uname  = x_user_name  or "Guest User"
    uemail = x_user_email or "guest@shopflow.in"

    db = SessionLocal()
    try:
        cart_items = db.query(CartItemModel).filter(CartItemModel.user_id == uid).all()
        if not cart_items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        order_items = []
        for ci in cart_items:
            product = db.query(ProductModel).filter(ProductModel.id == ci.product_id).first()
            if not product:
                continue
            order_items.append(OrderItem(
                product_id   = ci.product_id,
                product_name = product.name,
                quantity     = ci.quantity,
                unit_price   = product.price,
            ))

        if not order_items:
            raise HTTPException(status_code=400, detail="No valid items in cart")

        create_req = CreateOrderRequest(
            customer_name    = uname,
            customer_email   = uemail,
            items            = order_items,
            shipping_address = req.shipping_address,
            payment_method   = req.payment_method.value,
            user_id          = uid,
        )
        order = make_order_row(create_req)
        db.add(order)

        # Clear cart
        db.query(CartItemModel).filter(CartItemModel.user_id == uid).delete()
        db.commit()
        db.refresh(order)
        result = row_to_order_dict(order)
        logger.info(f"Checkout completed for user {uid}, order {order.id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Checkout error: {e}")
        raise HTTPException(status_code=500, detail=f"Checkout failed: {str(e)}")
    finally:
        db.close()


# ── Order Routes ──────────────────────────────────────────────────────────────

@app.post("/orders", response_model=OrderResponse, status_code=201)
def create_order(req: CreateOrderRequest):
    db    = SessionLocal()
    order = make_order_row(req)
    db.add(order)
    db.commit()
    db.refresh(order)
    logger.info(f"Order created: {order.id}")
    result = row_to_order_dict(order)
    db.close()
    return result


@app.get("/orders", response_model=List[OrderResponse])
def list_orders(status: Optional[OrderStatus] = Query(None), user_id: Optional[str] = Query(None)):
    db = SessionLocal()
    q  = db.query(OrderModel)
    if status:
        q = q.filter(OrderModel.status == status.value)
    if user_id:
        q = q.filter(OrderModel.user_id == user_id)
    rows   = q.all()
    result = sorted([row_to_order_dict(r) for r in rows], key=lambda o: o["created_at"], reverse=True)
    db.close()
    return result


@app.get("/orders/{order_id}", response_model=OrderResponse)
def get_order(order_id: str):
    db    = SessionLocal()
    order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
    db.close()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order '{order_id}' not found")
    return row_to_order_dict(order)


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
    history.append({"status": body.status, "timestamp": now, "note": "Status updated"})
    order.status_history = history
    db.commit()
    result = row_to_order_dict(order)
    db.close()
    return result


@app.delete("/orders/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(order_id: str):
    db    = SessionLocal()
    order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
    if not order:
        db.close()
        raise HTTPException(status_code=404, detail=f"Order '{order_id}' not found")
    if order.status not in [OrderStatus.PENDING, OrderStatus.PROCESSING]:
        db.close()
        raise HTTPException(
            status_code=400,
            detail=f"Only PENDING or PROCESSING orders can be cancelled. Current status: {order.status}",
        )
    now              = datetime.now(timezone.utc).isoformat()
    order.status     = OrderStatus.CANCELLED
    order.updated_at = now
    history          = list(order.status_history)
    history.append({"status": OrderStatus.CANCELLED, "timestamp": now, "note": "Cancelled by customer"})
    order.status_history = history
    db.commit()
    result = row_to_order_dict(order)
    db.close()
    return result


# ── Return / Exchange Routes ──────────────────────────────────────────────────

@app.post("/orders/{order_id}/return", response_model=ReturnResponse, status_code=201)
def create_return(order_id: str, req: CreateReturnRequest, x_user_id: Optional[str] = Header(None)):
    uid = x_user_id or "anonymous"
    db  = SessionLocal()
    try:
        order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.status != OrderStatus.DELIVERED:
            raise HTTPException(status_code=400, detail="Only DELIVERED orders can be returned or exchanged")

        # Check no existing return request
        existing = db.query(ReturnModel).filter(ReturnModel.order_id == order_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="A return/exchange request already exists for this order")

        now = datetime.now(timezone.utc).isoformat()
        ret = ReturnModel(
            id          = str(uuid.uuid4()),
            order_id    = order_id,
            user_id     = uid,
            reason      = req.reason,
            return_type = req.return_type.value,
            status      = "PENDING",
            created_at  = now,
            updated_at  = now,
        )
        db.add(ret)
        db.commit()
        return {
            "id": ret.id, "order_id": order_id, "user_id": uid,
            "reason": req.reason, "return_type": req.return_type.value,
            "status": "PENDING", "created_at": now, "updated_at": now,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.get("/returns/{user_id}", response_model=List[ReturnResponse])
def list_returns(user_id: str):
    db      = SessionLocal()
    returns = db.query(ReturnModel).filter(ReturnModel.user_id == user_id).all()
    db.close()
    return [
        {
            "id": r.id, "order_id": r.order_id, "user_id": r.user_id,
            "reason": r.reason, "return_type": r.return_type, "status": r.status,
            "created_at": r.created_at, "updated_at": r.updated_at,
        }
        for r in returns
    ]


# ── Stats ─────────────────────────────────────────────────────────────────────

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


# ── Auth endpoints ────────────────────────────────────────────────────────────

@app.post("/auth/signup", response_model=AuthResponse, status_code=201)
def signup(req: SignupRequest):
    db = SessionLocal()
    try:
        existing = db.query(UserModel).filter(UserModel.email == req.email.lower()).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")
        now  = datetime.now(timezone.utc).isoformat()
        user = UserModel(
            id              = str(uuid.uuid4()),
            name            = req.name.strip(),
            email           = req.email.lower().strip(),
            hashed_password = hash_password(req.password),
            created_at      = now,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        token = create_access_token({"sub": user.id, "email": user.email, "name": user.name})
        logger.info(f"New user registered: {user.email}")
        return {"token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")
    finally:
        db.close()


@app.post("/auth/login", response_model=AuthResponse)
def login(req: LoginRequest):
    db = SessionLocal()
    try:
        user = db.query(UserModel).filter(UserModel.email == req.email.lower().strip()).first()
        if not user or not verify_password(req.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        token = create_access_token({"sub": user.id, "email": user.email, "name": user.name})
        logger.info(f"User logged in: {user.email}")
        return {"token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")
    finally:
        db.close()


# ── Chatbot ───────────────────────────────────────────────────────────────────

@app.post("/chat")
def chat(req: ChatRequest):
    if not _gemini_model:
        raise HTTPException(
            status_code=503,
            detail="Chatbot unavailable: GEMINI_API_KEY is not configured."
        )
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    db   = SessionLocal()
    rows = db.query(OrderModel).all()
    products = db.query(ProductModel).all()
    db.close()

    total         = len(rows)
    by_status     = {}
    total_revenue = 0.0
    order_summaries = []

    for o in rows:
        by_status[o.status] = by_status.get(o.status, 0) + 1
        if o.status != OrderStatus.CANCELLED:
            total_revenue += o.total_amount
        items_str = ", ".join(
            f"{i.get('product_name','?')} x{i.get('quantity',1)}"
            for i in (o.items or [])
        )
        order_summaries.append(
            f"- Order ID: {o.id[:8]}... | Customer: {o.customer_name} "
            f"({o.customer_email}) | Status: {o.status} | "
            f"Total: ₹{o.total_amount:.2f} | Items: {items_str} | "
            f"Date: {o.created_at[:10]}"
        )

    product_summaries = [
        f"- {p.name} | Category: {p.category} | Price: ₹{p.price} | Stock: {p.stock} | Rating: {p.rating_avg}⭐"
        for p in products
    ]

    orders_block   = "\n".join(order_summaries) if order_summaries else "No orders yet."
    products_block = "\n".join(product_summaries) if product_summaries else "No products yet."
    stats_block    = (
        f"Total orders: {total}\n"
        f"By status: {json.dumps(by_status)}\n"
        f"Total revenue (excl. cancelled): ₹{total_revenue:.2f}"
    )

    prompt = f"""You are a helpful ShopFlow India e-commerce assistant.
Answer user questions based on the data below. Prices are in INR (₹).
Be concise, friendly, and accurate.

=== ORDER STATISTICS ===
{stats_block}

=== ORDER LIST ===
{orders_block}

=== PRODUCT CATALOGUE ===
{products_block}

=== USER QUESTION ===
{req.question.strip()}

Provide a clear, direct answer. If information is not in the data, say so honestly.
"""
    try:
        response = _gemini_model.generate_content(prompt)
        answer   = response.text.strip()
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")

    return {"answer": answer}
