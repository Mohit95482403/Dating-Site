# Connectly Backend

Production-style Node.js + Express + TypeScript + MySQL + Socket.IO backend for the Connectly dating and social discovery platform.

## Architecture

- **Runtime**: Node.js v24+ with TypeScript
- **Framework**: Express.js
- **Architecture**: Controller → Service → Model / Database pattern
- **Real-Time Gateway**: Socket.IO (unified on HTTP port 5000 with JWT authentication and multi-device registry)
- **Database**: MySQL 8.x / MariaDB with `mysql2/promise` connection pool
- **Encoding & Storage**: `utf8mb4_unicode_ci` on `InnoDB` storage engine
- **Authentication Prep**: JWT access & refresh token utilities, bcrypt password hashing (12 rounds), auth/role middleware
- **File Uploads**: Multer configured with 5MB limit, disk storage, and strict image MIME validation (`image/jpeg`, `image/png`, `image/webp`)

---

## Directory Structure

```text
backend/
├── src/
│   ├── config/
│   │   ├── database.ts        # Connection pool, query/execute, and atomic transaction helpers
│   │   ├── databaseInit.ts    # Automated schema migration & idempotent seed initialization
│   │   ├── env.ts             # Centralized environment configuration with validation
│   │   └── socket.ts          # Socket.IO server options and CORS setup
│   ├── controllers/
│   │   ├── healthController.ts# API & DB Health check handlers
│   │   └── testController.ts  # Architectural demonstration controller
│   ├── middleware/
│   │   ├── authMiddleware.ts  # JWT Bearer token authentication
│   │   ├── roleMiddleware.ts  # Role-based authorization ('user', 'admin')
│   │   ├── uploadMiddleware.ts# Multer file upload & MIME validation
│   │   ├── requestLogger.ts   # HTTP request latency & status logger
│   │   ├── errorHandler.ts    # Centralized operational error middleware
│   │   └── notFoundHandler.ts # 404 API route handler
│   ├── models/
│   │   ├── user.model.ts      # User SQL data access
│   │   ├── profile.model.ts   # Profile SQL data access
│   │   ├── match.model.ts     # Match SQL data access
│   │   ├── message.model.ts   # Chat message SQL data access
│   │   ├── notification.model.ts # Notification SQL data access
│   │   └── interest.model.ts  # Interest catalog SQL data access
│   ├── routes/
│   │   ├── index.ts           # Master API router (/api)
│   │   ├── healthRoutes.ts    # /api/health and /api/health/db
│   │   ├── test.routes.ts     # /api/test and /api/test/interests
│   │   ├── auth.routes.ts     # /api/auth
│   │   ├── profile.routes.ts  # /api/profile
│   │   ├── discover.routes.ts # /api/discover
│   │   ├── like.routes.ts     # /api/likes
│   │   ├── match.routes.ts    # /api/matches
│   │   ├── conversation.routes.ts # /api/conversations
│   │   ├── message.routes.ts  # /api/messages
│   │   ├── notification.routes.ts # /api/notifications
│   │   ├── block.routes.ts    # /api/blocks
│   │   ├── report.routes.ts   # /api/reports
│   │   ├── admin.routes.ts    # /api/admin
│   │   └── upload.routes.ts   # /api/upload
│   ├── services/
│   │   ├── auth.service.ts    # Authentication business logic
│   │   ├── profile.service.ts # Profile management service
│   │   ├── discovery.service.ts # Feed & compatibility service
│   │   ├── like.service.ts    # Likes & interaction service
│   │   ├── match.service.ts   # Matchmaking service
│   │   ├── conversation.service.ts # Conversation service
│   │   ├── message.service.ts # Chat messaging service
│   │   ├── notification.service.ts # In-app notification service
│   │   ├── block.service.ts   # User block service
│   │   ├── report.service.ts  # User report & moderation service
│   │   ├── admin.service.ts   # Administrative metrics service
│   │   └── interest.service.ts# Interest catalog service
│   ├── sockets/
│   │   ├── socket.ts          # Socket.IO connection and lifecycle handler
│   │   ├── socketAuth.ts      # Real-time JWT socket authentication
│   │   └── socketEvents.ts    # Socket events and multi-device user registry
│   ├── types/
│   │   ├── user.types.ts
│   │   ├── profile.types.ts
│   │   ├── matching.types.ts
│   │   ├── chat.types.ts
│   │   ├── notification.types.ts
│   │   ├── audit.types.ts
│   │   ├── request.types.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── apiResponse.ts     # Standardized JSON response wrapper
│   │   ├── AppError.ts        # Custom operational error hierarchy
│   │   ├── asyncHandler.ts    # Async controller wrapper
│   │   ├── httpStatus.ts      # HTTP status code constants
│   │   ├── jwt.ts             # JWT sign/verify utilities
│   │   ├── password.ts        # bcrypt password hashing & verification
│   │   ├── pagination.ts      # Pagination parsing & clamping
│   │   ├── logger.ts          # Structured application logger
│   │   ├── testDatabase.ts    # Database test suite
│   │   └── testBackendArchitecture.ts # Backend architecture test suite
│   ├── validators/
│   │   ├── validationMiddleware.ts # Request schema validation runner
│   │   ├── auth.validator.ts  # Auth inputs validation
│   │   ├── profile.validator.ts# Profile inputs validation
│   │   └── message.validator.ts# Message inputs validation
│   ├── app.ts                 # Express application configuration
│   └── server.ts              # Unified HTTP + Socket.IO server entrypoint
├── uploads/                   # Media uploads storage
├── .env                       # Environment secrets (ignored in git)
├── .env.example               # Environment variables template
├── package.json
└── tsconfig.json
```

---

## Setup & Running

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and configure your credentials:
   ```env
   PORT=5000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=connectly
   DB_USER=root
   DB_PASSWORD=your_password
   JWT_SECRET=your_jwt_access_secret_key
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
   JWT_REFRESH_EXPIRES_IN=7d
   FRONTEND_URL=http://localhost:5173
   CLIENT_URL=http://localhost:5173
   ```

3. **Run Architecture & Database Test Suites**:
   ```bash
   # Test database (20 tables, seeds, transactions)
   npm run test:db

   # Test backend architecture (config, errors, JWT, bcrypt, pagination, validators)
   npm run test:backend
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

5. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

---

## Verified Endpoints

### Day 4 Authentication Suite
- `POST /api/auth/register` — Atomic user, profile, preferences, and session creation (HTTP 201)
- `POST /api/auth/login` — Credential validation, status checking, and session issuance (HTTP 200)
- `POST /api/auth/refresh` — Refresh token rotation and short-lived access token renewal (HTTP 200)
- `POST /api/auth/logout` — Terminate current session and clear HTTP-only refresh cookie (HTTP 200)
- `POST /api/auth/logout-all` — Revoke all active sessions across all devices (HTTP 200)
- `GET /api/auth/me` — Retrieve authenticated user identity & profile (HTTP 200, Protected)
- `GET /api/auth/sessions` — List active sessions without token hash exposure (HTTP 200, Protected)
- `DELETE /api/auth/sessions/:sessionId` — Revoke a specific active session (HTTP 200, Protected)

### Infrastructure & Health
- `GET /api/health` — API health & environment status
- `GET /api/health/db` — MySQL connection check (`SELECT 1`)
- `GET /api/test` — Backend operational status check
- `GET /api/test/interests` — Demonstration of `Controller -> Service -> Model -> Database` pattern
- `POST /api/upload` — Multer file upload endpoint (JPEG, PNG, WebP up to 5MB)
- `* /api/*` (unmatched) — Centralized 404 handler returning `{ "success": false, "message": "API route not found" }`

---

## Test Suites

```bash
# Test complete Day 4 authentication flow (31/31 passing)
npm run test:auth

# Test complete Day 3 backend architecture (19/19 passing)
npm run test:backend

# Test complete Day 2 database architecture & tables (28/28 passing)
npm run test:db
```
