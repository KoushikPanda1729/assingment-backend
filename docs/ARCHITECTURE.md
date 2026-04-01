# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
│                   https://assignment.koushikpanda.online        │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AWS EC2 (Ubuntu)                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    nginx (Port 80/443)                   │   │
│  │              SSL via Let's Encrypt (Certbot)             │   │
│  │                                                         │   │
│  │  assignment.koushikpanda.online  ──────►  :3000         │   │
│  │  assignmentbackend.koushikpanda.online  ──► :5001       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────┐   ┌──────────────────────────────┐   │
│  │  Frontend Container  │   │    Backend Container         │   │
│  │  nginx:alpine :3000  │   │    Node.js :5001             │   │
│  │  (React SPA / dist)  │   │    (Express + Socket.io)     │   │
│  └──────────────────────┘   └──────────────┬───────────────┘   │
│                                            │                    │
│                                            │ Volume Mount       │
│                                    /home/ubuntu/uploads         │
└─────────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌─────────────────┐             ┌──────────────────┐
│  MongoDB Atlas  │             │   Google OAuth   │
│  (Cloud DB)     │             │   (Passport.js)  │
└─────────────────┘             └──────────────────┘
```

---

## Backend Architecture

### Layered Architecture (Clean Separation of Concerns)

```
HTTP Request
     │
     ▼
┌─────────────┐
│   Routes    │  → Defines endpoints, applies middleware
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Middleware  │  → Auth (JWT verify), Role check, Multer (file upload)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Controllers │  → Handles request/response, input validation
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Services   │  → Business logic (processing pipeline, auth flow)
└──────┬──────┘
       │
       ▼
┌──────────────┐
│ Repositories │  → Data access layer (Mongoose queries)
└──────┬───────┘
       │
       ▼
┌─────────────┐
│   Models    │  → Mongoose schemas (User, Video, RefreshToken)
└─────────────┘
```

### Dependency Injection

Controllers, Services, and Repositories are wired together manually in each route file — no framework needed. This keeps the code testable and loosely coupled.

---

## Frontend Architecture

### State Management (Redux Toolkit)

```
┌─────────────────────────────────────────────────────┐
│                    Redux Store                      │
│                                                     │
│  ┌────────────────┐    ┌─────────────────────────┐  │
│  │   authSlice    │    │      videosSlice        │  │
│  │  - user        │    │  - videos[]             │  │
│  │  - token       │    │  - loading              │  │
│  │  - role        │    │  - filters              │  │
│  └────────────────┘    └─────────────────────────┘  │
└─────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
   authService.ts            videoService.ts
   (Axios calls)             (Axios calls)
         │                          │
         └──────────────────────────┘
                       │
                       ▼
         https://assignmentbackend.koushikpanda.online
```

### Real-Time Flow (Socket.io)

```
User uploads video
       │
       ▼
Backend saves file + creates DB record (status: pending)
       │
       ▼
Processing service starts FFmpeg analysis (status: processing)
       │
       ├──► Socket.io emits progress events to client
       │
       ▼
Analysis complete → status: safe or flagged
       │
       ├──► Socket.io emits final status to client
       │
       ▼
Frontend dashboard updates in real time (no page refresh needed)
```

---

## Video Processing Pipeline

```
1. UPLOAD
   Client → multipart/form-data → Multer middleware
   → Saved to /app/uploads/<uuid>.<ext>
   → Video document created in MongoDB (status: pending)

2. VALIDATE
   File type check (video/* only)
   File size check (max 100MB)

3. PROCESS
   FFmpeg reads video metadata (duration, resolution, codec)
   Sensitivity analysis runs on video frames/audio
   Status updated to: processing

4. CLASSIFY
   Result: safe or flagged
   MongoDB document updated
   Socket.io event emitted: { videoId, status, progress: 100 }

5. STREAM
   Client requests GET /api/videos/:id/stream
   Backend reads Range header
   Responds with 206 Partial Content
   Enables seek + progressive playback
```

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────┐
│                  Email / Password                   │
│                                                     │
│  POST /api/auth/login                               │
│       │                                             │
│       ▼                                             │
│  bcrypt.compare(password, hash)                     │
│       │                                             │
│       ▼                                             │
│  Issue: accessToken (7d) + refreshToken (7d)        │
│       │                                             │
│       ▼                                             │
│  Store refreshToken in MongoDB (RefreshToken model) │
│  Return both tokens in response body                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   Google OAuth 2.0                  │
│                                                     │
│  GET /api/auth/google → Google consent screen       │
│       │                                             │
│       ▼                                             │
│  GET /api/auth/google/callback                      │
│  Passport.js verifies Google token                  │
│       │                                             │
│       ▼                                             │
│  Find or create user in DB                          │
│  Issue accessToken + refreshToken                   │
│       │                                             │
│       ▼                                             │
│  Redirect to frontend with tokens in URL params     │
└─────────────────────────────────────────────────────┘
```

---

## Role-Based Access Control (RBAC)

| Permission        | Viewer | Editor | Admin |
| ----------------- | ------ | ------ | ----- |
| View own videos   | ✅     | ✅     | ✅    |
| Upload videos     | ❌     | ✅     | ✅    |
| Edit own videos   | ❌     | ✅     | ✅    |
| Delete own videos | ❌     | ✅     | ✅    |
| Delete any video  | ❌     | ❌     | ✅    |
| View all users    | ❌     | ❌     | ✅    |
| Change user roles | ❌     | ❌     | ✅    |
| Delete users      | ❌     | ❌     | ✅    |

---

## CI/CD Pipeline

```
Developer pushes to main
         │
         ▼
  GitHub Actions triggers
         │
    ┌────┴──────────────────────────┐
    │  1. npm ci --legacy-peer-deps │
    │  2. ESLint check              │
    │  3. Prettier check            │
    │  4. Jest / Vitest tests       │
    │  5. TypeScript build          │
    └────┬──────────────────────────┘
         │ (all pass)
         ▼
  Docker build (with build args for VITE vars)
         │
         ▼
  Push to Docker Hub
  panda747767328/vidsense-backend:latest
  panda747767328/vidsense-frontend:latest
         │
         ▼
  SSH into EC2
  docker pull → docker stop → docker run
         │
         ▼
  Live in production
```

---

## Infrastructure

| Component     | Technology              | Details                              |
| ------------- | ----------------------- | ------------------------------------ |
| Cloud         | AWS EC2                 | t2.micro, Ubuntu 22.04               |
| DNS           | Custom domain           | koushikpanda.online                  |
| SSL           | Let's Encrypt + Certbot | Auto-renewing certificates           |
| Reverse Proxy | nginx                   | Routes traffic, handles HTTPS        |
| Database      | MongoDB Atlas           | Free tier, M0 cluster                |
| Registry      | Docker Hub              | panda747767328/vidsense-\*           |
| CI/CD         | GitHub Actions          | Triggered on push to main            |
| Storage       | EC2 local volume        | /home/ubuntu/uploads (Docker volume) |
