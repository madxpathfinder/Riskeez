# PostgreSQL Setup Guide

## 1. Configure the backend

Edit `backend/.env` and set your PostgreSQL credentials:

```
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_SERVER_IP:5432/riskeez
DB_SSL=false
JWT_SECRET=change-this-to-a-long-random-string
```

## 2. Create the database

On your PostgreSQL server:

```sql
CREATE DATABASE riskeez;
```

## 3. Install backend dependencies and create tables

```bash
cd backend
npm install
npm run setup-db
```

This creates all tables and an initial admin user (email: `admin`, password: `admin`).

## 4. Configure the frontend

Edit `.env` in the project root:

```
VITE_DATA_PROVIDER=api
VITE_API_URL=http://YOUR_SERVER_IP:3001
```

## 5. Start the backend

```bash
cd backend
npm start
```

## 6. Build the frontend

```bash
npm run build
```

Serve the `dist/` folder with nginx or any static host. Point it to your server.

## 7. Running in development

```bash
# Terminal 1 — backend
cd backend
npm run dev

# Terminal 2 — frontend
npm run dev
```

---

## Switching back to localStorage (mock mode)

Change `.env` in the project root:

```
VITE_DATA_PROVIDER=mock
```

Then rebuild: `npm run build`
