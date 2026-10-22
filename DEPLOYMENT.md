# REDPEX CRM — PRODUCTION DEPLOYMENT GUIDE (RENDER + VERCEL + ATLAS)

This guide provides complete, production-grade instructions for deploying the **Redpex CRM** application to **Render** (backend Express API) and **Vercel** (frontend React Vite SPA), connected to **MongoDB Atlas**.

---

## 1. Architecture & Deployment Targets

```mermaid
flowchart LR
    subgraph Browser ["Client Browser"]
        SPA["Vercel Frontend (Vite React)"]
    end

    subgraph CloudHosts ["Cloud Infrastructure"]
        Render["Render Web Service (Node.js/Express)"]
        Atlas[("MongoDB Atlas (Replica Set)")]
        Redis[("Redis (Optional Cache/Lockout)")]
        CDN["Cloudinary (Durable File Storage)"]
    end

    SPA -->|"HTTPS / REST API (/api/*)"| Render
    Render -->|"Mongoose TLS (SRV)"| Atlas
    Render -.->|"ioredis (Optional)"| Redis
    Render -.->|"Upload Stream (Optional)"| CDN
```

| Component | Target Platform | Root Directory | Build Command | Start Command |
|---|---|---|---|---|
| **Backend API** | Render Web Service | `backend` | `npm install` | `npm start` |
| **Frontend UI** | Vercel | `front crm` | `npm run build` | Static / SPA |
| **Database** | MongoDB Atlas | Cloud Cluster | N/A | Replica Set M0+ |

---

## 2. Step 1: MongoDB Atlas Configuration

Before deploying the backend, ensure your MongoDB Atlas cluster is accessible:

1. **Network Access (IP Whitelist):**
   - Navigate to **Network Access** in the MongoDB Atlas Console.
   - Click **Add IP Address**.
   - Because Render Web Services use dynamic outbound IP addresses, add:
     - `0.0.0.0/0` (Allow Access from Anywhere)
   - Ensure you use a strong, unique database user password.
2. **Database User:**
   - Under **Database Access**, verify your database user has `readWriteAnyDatabase` or `readWrite` on the `crm` database.
3. **Connection String:**
   - Click **Connect** > **Drivers** > **Node.js** (v5.5 or later).
   - Copy your connection string format:
     ```text
     mongodb+srv://<username>:<password>@<cluster-domain>.mongodb.net/crm?retryWrites=true&w=majority
     ```

---

## 3. Step 2: Backend Deployment on Render

### Option A: Automatic via Render Blueprint (`render.yaml`)
1. In the Render Dashboard, click **New +** > **Blueprint**.
2. Connect your Git repository (`Redpex-CRM`).
3. Render detects `render.yaml` and provisions `redpex-crm-backend`.
4. Enter your production secrets when prompted (`MONGODB_URI`, `FRONTEND_URL`, etc.).

### Option B: Manual Web Service Setup
1. In the Render Dashboard, click **New +** > **Web Service**.
2. Connect your Git repository.
3. Configure the service settings:
   - **Name:** `redpex-crm-backend`
   - **Region:** Choose the region closest to your MongoDB Atlas cluster (e.g., Singapore, Frankfurt, Oregon).
   - **Branch:** `main` (or your deployment branch)
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free` (or `Starter` for production persistent up-time)
4. Under **Advanced** > **Health Check Path**, enter:
   ```text
   /api/health
   ```
5. Under **Environment Variables**, add the required keys:

| Variable Key | Value Example / Description | Required? |
|---|---|---|
| `NODE_ENV` | `production` | **Yes** |
| `PORT` | `10000` (Render assigns automatically, but 10000 is default) | **Yes** |
| `HOST` | `0.0.0.0` | **Yes** |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/crm?retryWrites=true&w=majority` | **Yes** |
| `JWT_SECRET` | Super secure random string (minimum 32 characters) | **Yes** |
| `FRONTEND_URL` | `https://your-app.vercel.app` (Your deployed Vercel domain) | **Yes** |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` (Comma-separated origins) | **Yes** |
| `REDIS_URL` | `redis://...` (Render Redis or Upstash, optional) | Optional |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name (for durable file uploads) | Optional |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | Optional |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | Optional |
| `GROQ_API_KEY` | Groq API Key (for AI Analysis module) | Optional |
| `BREVO_API_KEY` | Brevo API Key (for automated emails/payslips) | Optional |

6. Click **Create Web Service**.
7. Once deployed, copy your Render URL: `https://redpex-crm-backend.onrender.com`.
8. Verify health status in browser: `https://redpex-crm-backend.onrender.com/api/health`.

---

## 4. Step 3: Frontend Deployment on Vercel

1. In the Vercel Dashboard, click **Add New...** > **Project**.
2. Import your Git repository (`Redpex-CRM`).
3. In the **Configure Project** screen:
   - **Project Name:** `redpex-crm`
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit** and select `front crm`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Expand **Environment Variables** and add:

| Variable Key | Value Example | Description |
|---|---|---|
| `VITE_API_URL` | `https://redpex-crm-backend.onrender.com/api` | Full URL to your Render backend `/api` root |
| `VITE_EMAIL_SENDER_NAME` | `Redpex Fire & Safety` | Default email sender display name |
| `VITE_EMAIL_SENDER_ADDRESS` | `info@redpex.in` | Verified business email address |

> [!WARNING]
> Do NOT set `VITE_BREVO_API_KEY` or any backend secrets in Vercel. All email dispatches and third-party API credentials are securely handled on the Render backend server.

5. Click **Deploy**.
6. Once deployed, note your live Vercel domain (e.g., `https://redpex-crm.vercel.app`).
7. **Important:** Copy your Vercel URL back to your Render backend's `FRONTEND_URL` and `ALLOWED_ORIGINS` environment variables, then trigger a quick redeploy on Render so CORS authorizes the production domain.

---

## 5. Step 4: Verification & Smoke Testing

After both services are live:

1. **Backend Health Check:**
   Visit `https://<render-url>/api/health` — Expect `200 OK`:
   ```json
   {
     "success": true,
     "status": "healthy",
     "service": "Redpex CRM API",
     "database": { "status": "connected", "connected": true, "name": "crm" }
   }
   ```
2. **Frontend Direct Route Refresh:**
   Log in and refresh a nested page (e.g., `/leads` or `/tasks`). Vercel rewrites will serve `index.html` without 404 errors.
3. **Cross-Origin Authentication:**
   Open the browser Developer Tools (F12) > Network Tab. Log in with your Super Admin credentials (`superadmin@gmail.com`). Verify that `POST /api/v1/auth/login` returns status `200` with CORS response header `Access-Control-Allow-Origin: https://your-app.vercel.app`.
4. **Super Admin Access:**
   Confirm access to MD Dashboard, Leads, Tasks, Users, and Settings.
