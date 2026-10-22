# Redpex CRM — Fire & Safety Enterprise Operations Platform

A complete, production-ready Customer Relationship Management (CRM) and Field Operations Tracking System engineered for **Redpex Fire & Safety** (*"Fire prevention is better than fire fighting"*).

Built with **React 19**, **Vite 8**, **Node.js/Express**, and **MongoDB Atlas**.

---

## 🚀 Key Modules & Capabilities

### 🎯 1. Lead Pipeline & Telecaller Management
- Multi-stage pipeline tracking (*New, Contacted, Follow Up, Interested, Converted, Lost*).
- Lead temperature classification (*Hot Lead, Warm Lead, Cold Lead, Switched Off, Call Back*).
- Telecaller call logging, follow-up scheduling, and activity trails.
- Bulk Excel (`.xlsx`) import and export engine with PDF report downloads.

### 🏢 2. Client & Account Directory
- Comprehensive client directory with contact profiles, inspection records, and service contracts.
- Commercial status, NDA agreements, and account manager assignments.

### 📋 3. Operations & Safety Task Tracking
- Field inspection and maintenance work orders.
- Priority assignment (*Critical, High, Medium, Low*), deadline monitoring, and completion verification.
- Document and certification attachments.

### 📄 4. Daily Shift & Field Operations Reporting
- Automated reporting for safety technicians, engineers, telecallers, and operations staff.
- Daily activity logs, blocker identification, and review gates.

### 🕒 5. Staff Attendance & HR
- Clock-in and clock-out tracking with attendance history.
- Granular Role-Based Access Control (RBAC): *Super Admin, Admin, Manager, Team Lead, Employee/Technician*.
- Dynamic sidebar navigation permissions.

### 📊 6. Executive & Command Dashboards
- Executive KPI tracking, pipeline conversion funnels, and department workload analytics.
- Real-time operational overview with light and dark mode support.

### 🛡️ 7. System Health & Centralized Database Architecture
- Centralized MongoDB connection manager with DNS IPv4 fallback and connection pooling.
- Health endpoint (`/api/health`) reporting database readiness safely without exposing credentials.
- Graceful shutdown handling and strict request validation.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, Framer Motion, Lucide React, Axios, React Router DOM 7 |
| **Backend** | Node.js v22, Express.js 4.22, Mongoose 9.6, JWT (RS256 / HMAC), Winston Logger |
| **Database** | MongoDB Atlas Cloud Database |
| **Testing** | Jest 29, Supertest 6 |

---

## 📁 Repository Structure

```
redpex-crm/
├── backend/                  # Express REST API Server
│   ├── src/
│   │   ├── config/           # Centralized DB manager (db.js), Redis, Sockets
│   │   ├── controllers/      # Route controllers (Auth, Leads, Clients, Tasks, Reports)
│   │   ├── middleware/       # JWT auth & RBAC guards
│   │   ├── models/           # Mongoose Database Schemas
│   │   ├── routes/           # REST API Endpoint Routers
│   │   ├── services/         # Email, Brevo, scheduler, notifications
│   │   ├── tests/            # Automated test suites
│   │   ├── utils/            # JWT, Bcrypt, PDF generator, logger
│   │   └── validators/       # Request validation schemas (Zod)
│   ├── app.js                # Express app setup & health check endpoints
│   ├── server.js             # HTTP server entry point & cron scheduler
│   ├── .env.example          # Environment variable template
│   └── package.json          # Backend dependencies & test scripts
│
├── front crm/                # React Vite SPA Client
│   ├── src/
│   │   ├── assets/           # Redpex Fire & Safety brand logos
│   │   ├── components/       # UI Components (Sidebar, Navbar, Modals, Badges)
│   │   ├── contexts/         # UserContext (Auth & permissions)
│   │   ├── pages/            # CRM Pages & Dashboards
│   │   ├── services/         # Axios API clients
│   │   ├── App.jsx           # Routing tree & protected route guards
│   │   └── main.jsx          # Frontend entry point
│   ├── public/               # Public assets (redpex.png favicon)
│   ├── index.html            # HTML entry point with Redpex branding
│   ├── .env.example          # Frontend environment template
│   └── vite.config.js        # Vite build & proxy settings
│
└── README.md                 # System Documentation
```

---

## ⚙️ Quick Start Guide

### 1. Backend Setup

```bash
cd backend
npm install
```

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set your configuration in `.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,https://workspace.redpex.in
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/crm?retryWrites=true&w=majority
JWT_SECRET=your_strong_jwt_secret_here
```

Start the backend:
```bash
npm run dev
# Server will run on http://localhost:5000
```

Run tests:
```bash
npm test
```

### 2. Frontend Setup

```bash
cd "front crm"
npm install
```

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Start the Vite development server:
```bash
npm run dev
# Frontend runs at http://localhost:5173
```

Build for production:
```bash
npm run build
# Creates optimized bundle in front crm/dist
```

---

## 📡 Core API Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| **GET** | `/api/health` | Service & MongoDB readiness status | Public |
| **POST** | `/api/v1/auth/login` | User authentication & JWT issuance | Public |
| **GET** | `/api/v1/leads` | List leads (filtered & paginated) | Authenticated |
| **POST** | `/api/v1/leads` | Create new sales/inquiry lead | Authenticated |
| **GET** | `/api/v1/clients` | Fetch client directory | Authenticated |
| **POST** | `/api/v1/clients` | Create new client profile | Authenticated |
| **GET** | `/api/v1/tasks` | Fetch operational & safety tasks | Authenticated |
| **POST** | `/api/v1/tasks` | Create operational work task | Authenticated |
| **GET** | `/api/v1/attendance` | Fetch attendance logs | Authenticated |
| **GET** | `/api/v1/md-dashboard` | Executive command metrics | Executive / Admin |

---

## 📄 License
Privately developed for **Redpex Fire & Safety**. All rights reserved.
