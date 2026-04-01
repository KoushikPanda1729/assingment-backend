# VidSense Backend

> Robust RESTful API powering the VidSense video upload, sensitivity analysis, and streaming platform.

**Live API:** `https://assignmentbackend.koushikpanda.online`
**Frontend:** [https://assignment.koushikpanda.online](https://assignment.koushikpanda.online)
**Frontend Repo:** [assingment-frontend](https://github.com/KoushikPanda1729/assingment-frontend)

---

## Demo Credentials

| Role   | Email                  | Password      |
| ------ | ---------------------- | ------------- |
| Admin  | koushikpanda@gmail.com | Panda@1111111 |
| Editor | johndoe@gmail.com      | Panda@1111111 |
| Viewer | koushik@gmail.com      | Panda@1111111 |

---

## Tech Stack

| Layer            | Technology                        |
| ---------------- | --------------------------------- |
| Runtime          | Node.js 24 (LTS)                  |
| Framework        | Express.js v5                     |
| Language         | TypeScript 6                      |
| Database         | MongoDB + Mongoose                |
| Real-Time        | Socket.io                         |
| Auth             | JWT (access + refresh tokens)     |
| OAuth            | Google OAuth 2.0 via Passport.js  |
| File Uploads     | Multer                            |
| Video Processing | FFmpeg via fluent-ffmpeg          |
| Validation       | express-validator                 |
| Security         | Helmet, bcryptjs, CORS            |
| Testing          | Jest + Supertest                  |
| Linting          | ESLint + Prettier + Husky         |
| Containerization | Docker                            |
| CI/CD            | GitHub Actions → Docker Hub → EC2 |

---

## Features

- **JWT Authentication** — Access + refresh token flow with secure HTTP-only cookies
- **Google OAuth 2.0** — One-click sign-in with Google
- **Role-Based Access Control** — Admin, Editor, and Viewer roles with isolated permissions
- **Multi-Tenant Architecture** — Users access only their own content
- **Video Upload** — Multer-based upload with file type and size validation (up to 100MB)
- **Sensitivity Analysis** — Automated content screening pipeline classifying videos as `safe` or `flagged`
- **Real-Time Progress** — Socket.io broadcasts live processing status to the frontend
- **HTTP Range Streaming** — Efficient video delivery supporting seek and partial content (206)
- **Persistent Storage** — Docker volume mount for uploaded files across deployments

---

## Project Structure

```
src/
├── config/          # DB connection, passport, environment config
├── controllers/     # Route handlers (auth, video, user)
├── middleware/      # Auth guard, role checks, error handler, multer
├── models/          # Mongoose schemas (User, Video, RefreshToken)
├── repositories/    # Data access layer
├── routes/          # Express routers
├── services/        # Business logic (video processing, socket events)
├── types/           # TypeScript interfaces and enums
├── utils/           # Helpers (jwt, response formatter)
├── app.ts           # Express app setup
└── index.ts         # Server entry point
```

---

## API Endpoints

### Auth

| Method | Endpoint                    | Description                 | Access  |
| ------ | --------------------------- | --------------------------- | ------- |
| POST   | `/api/auth/register`        | Register new user           | Public  |
| POST   | `/api/auth/login`           | Login with email + password | Public  |
| POST   | `/api/auth/logout`          | Logout and clear tokens     | Private |
| POST   | `/api/auth/refresh`         | Refresh access token        | Public  |
| GET    | `/api/auth/me`              | Get current user profile    | Private |
| GET    | `/api/auth/google`          | Initiate Google OAuth       | Public  |
| GET    | `/api/auth/google/callback` | Google OAuth callback       | Public  |

### Videos

| Method | Endpoint                 | Description                   | Access        |
| ------ | ------------------------ | ----------------------------- | ------------- |
| POST   | `/api/videos/upload`     | Upload a video                | Editor, Admin |
| GET    | `/api/videos`            | List videos (with filters)    | Private       |
| GET    | `/api/videos/:id`        | Get video metadata            | Private       |
| GET    | `/api/videos/:id/stream` | Stream video (range requests) | Private       |
| DELETE | `/api/videos/:id`        | Delete a video                | Editor, Admin |

### Users (Admin Only)

| Method | Endpoint              | Description      | Access |
| ------ | --------------------- | ---------------- | ------ |
| GET    | `/api/users`          | List all users   | Admin  |
| PATCH  | `/api/users/:id/role` | Update user role | Admin  |
| DELETE | `/api/users/:id`      | Delete a user    | Admin  |

### Health

| Method | Endpoint  | Description  |
| ------ | --------- | ------------ |
| GET    | `/health` | Health check |

---

## Video Processing Pipeline

```
Upload → Validate (type/size) → Save to disk → Queue processing
  → FFmpeg analysis → Sensitivity classification (safe/flagged)
  → Update DB status → Emit Socket.io event → Ready to stream
```

Processing statuses: `pending` → `processing` → `completed` / `failed`

---

## Local Setup

### Prerequisites

- Node.js 24+
- MongoDB (local or Atlas)
- FFmpeg installed on the system

### Steps

```bash
# Clone the repo
git clone https://github.com/KoushikPanda1729/assingment-backend.git
cd assingment-backend

# Install dependencies
npm install --legacy-peer-deps

# Create environment file
cp .env.example .env
```

### Environment Variables

```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/vidsense
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback
```

### Run

```bash
# Development (hot reload)
npm run dev

# Production build
npm run build
node dist/index.js
```

---

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## Docker

```bash
# Build image
docker build -t vidsense-backend .

# Run container
docker run -d \
  --name backend \
  -p 5001:5001 \
  -v $(pwd)/uploads:/app/uploads \
  -e NODE_ENV=production \
  -e PORT=5001 \
  -e MONGO_URI=your_mongo_uri \
  -e JWT_SECRET=your_secret \
  -e JWT_REFRESH_SECRET=your_refresh_secret \
  -e CLIENT_URL=https://your-frontend.com \
  vidsense-backend
```

---

## CI/CD Pipeline

Every push to `main` triggers:

1. **Lint** — ESLint code quality check
2. **Format** — Prettier formatting check
3. **Test** — Jest test suite
4. **Build** — TypeScript compilation
5. **Docker Build & Push** — Image pushed to Docker Hub (`panda747767328/vidsense-backend`)
6. **Deploy** — SSH into EC2, pull latest image, restart container

---

## Deployment Architecture

```
GitHub → GitHub Actions → Docker Hub
                                ↓
                           AWS EC2
                         (ubuntu host)
                                ↓
                    nginx (reverse proxy + SSL)
                                ↓
                    Docker container :5001
                                ↓
                    /home/ubuntu/uploads (volume)
```

SSL certificates managed by Let's Encrypt via Certbot.

---

## Code Quality

- **ESLint** — TypeScript-aware linting
- **Prettier** — Consistent code formatting
- **Husky** — Pre-commit hooks enforce lint + format
- **lint-staged** — Only lint changed files
- **Jest + Supertest** — Unit and integration tests

---

## Security

- Passwords hashed with bcryptjs (salt rounds: 12)
- JWT tokens with short-lived access tokens + refresh rotation
- Helmet sets secure HTTP headers
- CORS restricted to frontend origin
- Input validation via express-validator on all endpoints
- File type whitelist on upload (video/\* only)
