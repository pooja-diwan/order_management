# OrderFlow — E-commerce Order Processing System

A full-stack order management system built with **Python (FastAPI)** backend and **React + Tailwind CSS** frontend, now fully integrated with **MySQL** and an **AI Chatbot** powered by Gemini.

---

## ✨ Features

### Core Requirements
- ✅ **Create orders** — multi-item orders with customer details and shipping address
- ✅ **Retrieve order details** — by order ID with full status history
- ✅ **Update order status** — PENDING → PROCESSING → SHIPPED → DELIVERED
- ✅ **Background job** — auto-promotes PENDING orders to PROCESSING every 5 minutes
- ✅ **List all orders** — with optional filter by status
- ✅ **Cancel orders** — only allowed when status is PENDING

### Advanced & Bonus Features
- 🗄️ **MySQL Integration** — fully persistent storage using SQLAlchemy mapped to a robust MySQL database
- 🤖 **AI Chatbot** — natural language order querying powered by Google Gemini AI 
- 🔍 **Live search** — filter orders by name, email, or order ID
- 📊 **Stats dashboard** — real-time totals for orders, revenue, pending, and shipped
- 🕐 **Status history** — full audit trail of every status change with timestamps and notes
- 🔄 **Auto-refresh** — UI polls for new data every 30 seconds
- 🧪 **Demo seed data** — pre-loaded orders on startup for instant exploration
- 🐳 **Docker Compose** — one-command deployment with API, UI, and Database services
- 📦 **Quick product picker** — click to add catalog items when creating an order

---

## 🏗️ Architecture

```
order-system/
├── backend/
│   ├── main.py           # FastAPI app — routes, models, background job, Gemini integration
│   ├── requirement.txt   # Python dependencies
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.js                      # Root component, layout, data fetching
│   │   ├── components/                 # React UI components
│   │   └── utils/                      # Axios client & helpers
│   ├── tailwind.config.js
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml       # Orchestrates frontend, backend, and MySQL DB
```

---

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose (Recommended)
- Node.js 18+ and Python 3.12 (For local manual setup)
- A **Google Gemini API Key** for the Chatbot features

### Option 1 — Docker Compose (Recommended)

This is the easiest way to run the application, as it automatically spins up the MySQL database, the FastAPI backend, and the React frontend.

1. (Optional) Ensure your `docker-compose.yml` has your `GEMINI_API_KEY` populated under the `backend` environment variables.
2. Run the platform:
```bash
docker-compose up --build -d
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **Database**: MySQL running on port 3306

---

### Option 2 — Local Development Setup (Manual)

#### 1. Database (MySQL)
Ensure you have a local MySQL server running. Create a database and user matching these credentials (or update your environment variables accordingly):
- Host: `localhost`
- Port: `3306`
- Database: `orderdb`
- User: `orderuser`
- Password: `orderpass`

#### 2. Backend Setup

```bash
cd backend
python -m venv venv
# Activate virtualenv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# Install dependencies (note the filename is requirement.txt)
pip install -r requirement.txt

# Set required environment variables (Windows PowerShell example)
$env:MYSQL_HOST="localhost"
$env:MYSQL_USER="orderuser"
$env:MYSQL_PASSWORD="orderpass"
$env:MYSQL_DATABASE="orderdb"
$env:GEMINI_API_KEY="your_gemini_api_key_here"

# Linux/Mac Example:
# export MYSQL_HOST=localhost && export MYSQL_USER=orderuser ...

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```

#### 3. Frontend Setup

```bash
cd frontend
npm install

# Set the backend URL if running on a different port (Windows PowerShell example)
$env:REACT_APP_API_URL="http://localhost:8000"

# Linux/Mac Example:
# export REACT_APP_API_URL=http://localhost:8000

# Start the React development server
npm start
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/orders` | List all orders (optional `?status=PENDING`) |
| `POST` | `/orders` | Create a new order |
| `GET` | `/orders/{id}` | Get order by ID |
| `PATCH` | `/orders/{id}/status` | Update order status |
| `DELETE` | `/orders/{id}/cancel` | Cancel a PENDING order |
| `GET` | `/stats` | Aggregated stats |
| `POST` | `/chat` | Natural language interface with Gemini AI |
| `GET` | `/health` | Health check |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12, FastAPI, SQLAlchemy, Pydantic v2, Google Generative AI |
| **Frontend** | React 18, Tailwind CSS 3, Axios, react-hot-toast, lucide-react |
| **Database** | MySQL 8.0 |
| **Containers** | Docker, Docker Compose |

---

## 🤖 AI Tool Usage (for interview discussion)

This project was built with AI assistants (Claude/Gemini) as primary tools.

**How it was used:**
- Scaffolding the FastAPI project structure, SQLAlchemy models, and route handlers.
- Generating the React component tree and Tailwind styling.
- Writing the background job coroutine (`asyncio` + `on_event("startup")`).
- Producing complete Docker and `docker-compose.yml` configurations with MySQL integration.
- Implementing the `/chat` route with Gemini API for dynamic data summarization and querying.

**Issues encountered & Solved:**
- The background job needed careful placement — FastAPI's `@app.on_event("startup")` combined with `asyncio.create_task` was the right pattern.
- Migrating from in-memory dict to MySQL required adding a wait-for-db loop in the startup event to ensure Docker Compose sequenced correctly.
- Gemini Chatbot needed to inject actual DB data into the prompt while keeping token sizes small to handle natural language queries about the store's current state.

---

## 🔮 Possible Extensions

- **Authentication** — add JWT-based customer/admin auth
- **Email notifications** — trigger on status changes via SendGrid / SES
- **Pagination** — cursor-based pagination for large order volumes
- **Payment integration** — Stripe checkout flow before PENDING is created
