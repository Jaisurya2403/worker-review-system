# QR-Based Worker Review System

A full-stack application that lets customers scan a QR code at a store, select the worker who served them, and submit a review. Store owners can manage their team and view analytics. Admins manage all stores from a central panel.

---

## 📁 Project Structure

```
worker-review-system/
├── backend/
│   ├── server.js               ← Main Express server
│   ├── package.json
│   ├── .env                    ← Your environment variables (edit this!)
│   ├── .env.example            ← Template
│   ├── config/
│   │   └── db.js               ← MySQL connection pool
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── storeRoutes.js
│   │   └── publicRoutes.js
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── storeController.js
│   │   └── publicController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── subscriptionMiddleware.js
│   │   └── uploadMiddleware.js
│   ├── uploads/                ← Worker images & QR codes stored here
│   └── database/
│       ├── schema.sql          ← Run this in MySQL first
│       └── seedAdmin.js        ← Creates default admin account
└── frontend/
    ├── index.html              ← Landing page
    ├── customer-review.html    ← Customer scans QR → opens this
    ├── store-login.html
    ├── store-dashboard.html
    ├── admin-login.html
    ├── admin-dashboard.html
    ├── css/
    │   └── style.css
    └── js/
        ├── customer.js
        ├── store.js
        └── admin.js
```

---

## 🚀 How to Run Locally (Step-by-Step)

### Prerequisites
- Node.js (v16 or later): https://nodejs.org/
- MySQL (v8 recommended): https://dev.mysql.com/downloads/
- VS Code: https://code.visualstudio.com/
- VS Code Extension: **Live Server** (by Ritwick Dey)

---

### Step 1: Set Up MySQL Database

1. Open MySQL Workbench or MySQL command line
2. Run the schema file:

```sql
-- In MySQL Workbench: File > Open SQL Script > select schema.sql > Run
-- OR in terminal:
mysql -u root -p < backend/database/schema.sql
```

This creates the `worker_review_db` database with all tables.

---

### Step 2: Configure Environment Variables

1. Open `backend/.env`
2. Update your MySQL password:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=worker_review_db
JWT_SECRET=any_long_random_string_here_make_it_unique
PORT=5000
FRONTEND_URL=http://127.0.0.1:5500
BASE_URL=http://127.0.0.1:5500
```

> ⚠️ FRONTEND_URL should match where Live Server runs your frontend (usually port 5500)

---

### Step 3: Install Backend Dependencies

Open a terminal in VS Code (Terminal → New Terminal):

```bash
cd backend
npm install
```

---

### Step 4: Create the Admin Account

```bash
cd backend
node database/seedAdmin.js
```

Output:
```
✅ Admin account created successfully!
   Username: admin
   Password: Admin@123
```

---

### Step 5: Start the Backend Server

```bash
cd backend
npm start
```

Or for auto-restart during development:
```bash
npm run dev
```

You should see:
```
✅ Database connected successfully!
🚀 Worker Review System Backend Started!
   Server running at: http://localhost:5000
```

Keep this terminal open.

---

### Step 6: Start the Frontend

1. In VS Code, right-click `frontend/index.html`
2. Select **"Open with Live Server"**
3. Browser opens at `http://127.0.0.1:5500/frontend/index.html`

> If it opens at port 5500, your `FRONTEND_URL` and `BASE_URL` in `.env` should be `http://127.0.0.1:5500`

---

### Step 7: First Login

**Admin Login:**
- URL: `http://127.0.0.1:5500/frontend/admin-login.html`
- Username: `admin`
- Password: `Admin@123`

**Create a Store:**
1. Go to Admin Dashboard → Stores tab
2. Click "Add Store"
3. Fill in store name, address, owner username & password
4. Click "Create Store"
5. Note down the owner credentials and QR URL shown

**Store Owner Login:**
- URL: `http://127.0.0.1:5500/frontend/store-login.html`
- Use the credentials you just created

**Customer Review:**
- URL: `http://127.0.0.1:5500/frontend/customer-review.html?store=STORE_SLUG`
- (Replace STORE_SLUG with the actual slug shown after creating the store)

---

## 📱 QR Code - How to Generate & Print

The QR code is **automatically generated** when admin creates a store.

**To print the QR code:**
1. Login as Admin → Stores → Click "📱 QR" button next to a store
2. Click "🖨️ Print QR Code"
3. A print dialog opens — print on A4 or card paper
4. Place it at the store counter or table

**To download the QR image:**
The QR image is saved at: `backend/uploads/qrcodes/store-{id}.png`
You can copy this file and print it.

---

## 📋 Sample Credentials

| Role         | Username        | Password   |
|--------------|-----------------|------------|
| Admin        | admin           | Admin@123  |
| Store Owner  | (set by admin)  | (set by admin) |

---

## 🌐 API Quick Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/admin/login | None | Admin login |
| GET | /api/admin/stores | Admin | Get all stores |
| POST | /api/admin/stores | Admin | Create store |
| PUT | /api/admin/stores/:id/status | Admin | Enable/disable |
| DELETE | /api/admin/stores/:id | Admin | Delete store |
| GET | /api/admin/stats | Admin | Platform stats |
| GET | /api/admin/reviews | Admin | All reviews |
| DELETE | /api/admin/reviews/:id | Admin | Delete review |
| POST | /api/store/login | None | Store login |
| GET | /api/store/dashboard | Store | Dashboard data |
| GET | /api/store/workers | Store | List workers |
| POST | /api/store/workers | Store | Add worker |
| PUT | /api/store/workers/:id | Store | Edit worker |
| DELETE | /api/store/workers/:id | Store | Deactivate worker |
| GET | /api/store/reviews | Store | Store reviews |
| GET | /api/public/store/:slug | None | Store info |
| GET | /api/public/store/:slug/workers | None | Active workers |
| POST | /api/public/store/:slug/reviews | None | Submit review |

---

## 🐛 Common Errors & Fixes

### Error: "Cannot connect to server"
- Make sure backend is running: `cd backend && npm start`
- Check the `API` variable in JS files points to `http://localhost:5000/api`

### Error: "Database connection failed"
- Is MySQL running? Start it in Services (Windows) or: `sudo service mysql start` (Linux/Mac)
- Check your `.env` DB_PASSWORD matches your MySQL root password
- Did you run `schema.sql` to create the database?

### Error: "CORS error" in browser console
- Make sure `FRONTEND_URL` in `.env` exactly matches your Live Server address
- Try both `http://localhost:5500` and `http://127.0.0.1:5500`
- Restart the backend after changing `.env`

### Error: "ER_NOT_SUPPORTED_AUTH_MODE" (MySQL 8)
Run in MySQL:
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

### Error: "Port 5000 already in use"
Change `PORT=5001` in `.env` and update `API` constant in all JS files.

### Images not showing
- Check the `uploads/` folder exists in backend
- The image URL format is: `http://localhost:5000/uploads/filename.jpg`

### QR code not loading in modal
- The QR image is at `http://localhost:5000/uploads/qrcodes/store-{id}.png`
- Make sure backend is running when viewing QR codes

---

## ☁️ FREE DEPLOYMENT GUIDE

### Option A: Railway.app (Recommended - Backend + MySQL)

**Deploy Backend + MySQL on Railway:**

1. Go to https://railway.app and sign up (free tier available)
2. Click "New Project" → "Deploy from GitHub"
3. Push your `backend/` folder to a GitHub repo
4. Add a MySQL plugin: In Railway project → "+ New" → "Database" → "MySQL"
5. Railway auto-sets `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` env vars
6. Set additional env vars in Railway → Your Service → Variables:
   ```
   JWT_SECRET=your_long_secret_key
   PORT=5000
   FRONTEND_URL=https://your-frontend-url.vercel.app
   BASE_URL=https://your-frontend-url.vercel.app
   ```
7. Railway gives you a public URL like `https://your-app.railway.app`
8. After deploy, run seed: In Railway → Your Service → Shell:
   ```bash
   node database/seedAdmin.js
   ```
9. Run schema in Railway MySQL: Use the Railway MySQL connection URL with a MySQL client

**Deploy Frontend on Vercel:**

1. Go to https://vercel.com and sign up
2. Push your `frontend/` folder to GitHub (or the whole project)
3. Import repo in Vercel → set Root Directory to `frontend`
4. Before deploying, update the `API` constant in all JS files:
   ```javascript
   const API = 'https://your-railway-app.railway.app/api';
   ```
5. Deploy → Vercel gives you `https://your-app.vercel.app`

---

### Option B: Render.com (Backend) + Vercel (Frontend)

**Backend on Render:**
1. Go to https://render.com → New → Web Service
2. Connect GitHub repo → Set Root Directory to `backend`
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Add Environment Variables (same as Railway above)
6. For MySQL: Use Render's PostgreSQL (requires schema changes) OR use PlanetScale (free MySQL)

**Free MySQL with PlanetScale:**
1. Go to https://planetscale.com (free tier)
2. Create database → Get connection string
3. Update `.env` DB_ variables with PlanetScale credentials
4. Run schema.sql via PlanetScale console

---

### Option C: Local Network (Simplest for small stores)

Run on a computer/Raspberry Pi on the same WiFi:
1. Find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Update `.env`: `BASE_URL=http://192.168.1.xxx:5000`
3. Update JS files: `const API = 'http://192.168.1.xxx:5000/api'`
4. Customer scans QR → opens on their phone (same WiFi network)

---

## 🔒 Security Notes for Production

1. Change admin password immediately after first login
2. Use a strong random JWT_SECRET (32+ characters)
3. Enable HTTPS in production (Railway/Render/Vercel handle this automatically)
4. Set specific CORS origins (not wildcards)
5. Consider rate limiting review submissions to prevent spam

---

## 📞 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript (Vanilla) |
| Backend | Node.js + Express.js |
| Database | MySQL |
| Auth | JWT (JSON Web Tokens) |
| Images | Multer (local disk storage) |
| QR Code | qrcode npm package |
| Charts | Chart.js |
| Passwords | bcryptjs |
