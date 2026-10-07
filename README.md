# Connectly — Modern Dating & Social Discovery Platform

Connectly is a full-stack real-time dating and social discovery platform built with modern web technologies, ultra-responsive design, and strict security architecture.

---

## 🌟 Tech Stack

### Frontend
- **Framework**: React 18 / TypeScript / Vite
- **Styling**: Vanilla CSS, Glassmorphism design tokens, CSS Modules & Modern Themes
- **State & Routing**: React Router v6, Context API
- **Real-Time**: Socket.IO Client
- **Icons & UI**: Lucide React, Canvas Confetti

### Backend
- **Runtime**: Node.js & Express (TypeScript)
- **Database**: MySQL with connection pooling (`mysql2`)
- **Real-Time Communication**: Socket.IO (WebSockets & polling fallback)
- **Authentication**: JWT (Access Token + Secure HTTP-only Refresh Token)
- **Security**: Helmet, CORS, Rate Limiting, Input Validation, Role-Based Access Control
- **File Uploads**: Multer with MIME verification & secure document inspection

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MySQL (v8.0+)
- npm or yarn

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure your MySQL credentials and JWT secrets in .env
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

---

## 📦 Production Builds

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd frontend
npm run build
```

---

## 🛡️ License
Private & Proprietary. All rights reserved.
