# Assumptions & Design Decisions

## Authentication

### Decision: JWT with Access + Refresh Token pair

**Assumption:** Users expect to stay logged in across sessions without re-entering credentials.
**Why:** A short-lived access token (7d) paired with a refresh token gives a good balance between security and usability. The refresh token is stored in MongoDB so it can be revoked on logout, preventing token reuse attacks.

### Decision: Google OAuth 2.0 alongside email/password

**Assumption:** Many users prefer social login over creating new credentials.
**Why:** Passport.js with `passport-google-oauth20` integrates cleanly with Express. On OAuth callback, the same token issuance flow runs as with email/password, keeping the frontend auth logic unified.

---

## Video Storage

### Decision: Local filesystem storage (not AWS S3 or cloud storage)

**Assumption:** The assignment is a demonstration project, not a production-scale system requiring CDN or distributed storage.
**Why:** Local storage with a Docker volume mount (`/home/ubuntu/uploads`) is simpler, has no cost, and is sufficient for demonstrating upload and streaming. Files persist across container restarts via the volume. Migrating to S3 in the future would only require changing the storage service layer.

### Decision: UUID-based filenames

**Assumption:** Original filenames from users are not reliable (duplicates, special characters, path traversal risks).
**Why:** Generating a UUID for each uploaded file prevents filename collisions, eliminates path traversal vulnerabilities, and decouples the stored file from the user-supplied name. The original filename is stored separately in MongoDB metadata.

---

## Video Processing

### Decision: FFmpeg for sensitivity analysis

**Assumption:** A simulated/lightweight sensitivity analysis is acceptable for this assignment scope.
**Why:** FFmpeg is the industry standard for video processing. It extracts metadata (duration, resolution, codec) reliably. The sensitivity classification (safe/flagged) is determined based on video characteristics — this demonstrates the pipeline architecture without requiring an ML model, which would be out of scope.

### Decision: Asynchronous processing with Socket.io progress updates

**Assumption:** Users will not wait on a synchronous HTTP request for video analysis to complete.
**Why:** Long-running operations should be non-blocking. The upload endpoint returns immediately after saving the file, then processing runs in the background. Socket.io pushes progress events (0% → 50% → 100%) to the connected client in real time, providing a responsive user experience.

---

## Streaming

### Decision: HTTP Range Request streaming (not HLS/DASH)

**Assumption:** The videos are relatively short and don't require adaptive bitrate streaming.
**Why:** Implementing HLS (HTTP Live Streaming) would require segmenting videos into chunks with FFmpeg and serving a manifest file — significant added complexity. HTTP range requests (RFC 7233) are natively supported by all browsers and the HTML5 `<video>` element, support seek operations, and are sufficient for this use case.

---

## Database

### Decision: MongoDB with Mongoose ODM

**Assumption:** The assignment specifies MongoDB. Document-based storage fits video metadata well — fields like tags, processing results, and owner info are naturally nested.
**Why:** Mongoose provides schema validation, middleware hooks (pre/post save), and a clean query API. The schema-on-write approach catches data issues early.

### Decision: Separate RefreshToken collection

**Assumption:** Tokens must be revocable (logout should invalidate the session).
**Why:** Storing refresh tokens in a dedicated MongoDB collection allows server-side invalidation on logout. Without this, a stolen refresh token could not be revoked until it naturally expires.

---

## Multi-Tenancy & Access Control

### Decision: User-scoped video access (not organisation-based)

**Assumption:** The assignment's "multi-tenant" requirement refers to per-user data isolation, not multi-organisation tenancy.
**Why:** Each video has an `owner` field referencing the uploading user's ID. All queries filter by the authenticated user's ID, ensuring users can only see their own content. Admins bypass this filter and can access all content.

### Decision: Three roles — Viewer, Editor, Admin

**Assumption:** These three roles cover the stated use cases: read-only access, content creation, and system management.
**Why:**

- **Viewer** — can browse and stream videos, cannot upload or modify
- **Editor** — full CRUD on their own videos, cannot manage users
- **Admin** — full access including user management and cross-user video access

---

## Frontend

### Decision: Redux Toolkit for state management

**Assumption:** The app has shared state (auth, video list) that needs to be accessed across multiple pages.
**Why:** Redux Toolkit reduces boilerplate significantly over plain Redux. The `createSlice` and `createAsyncThunk` APIs make async operations and state updates clean and predictable. Context API was considered but Redux is more appropriate for an app with multiple async data sources (auth + videos + socket events).

### Decision: VITE environment variables baked at build time

**Assumption:** The API URL does not change at runtime for a given deployment.
**Why:** Vite replaces `import.meta.env.VITE_*` variables at build time. This means the Docker image must be built with the correct URLs as `--build-arg`. There is no runtime configuration injection. This is a known Vite constraint and is handled in the CI/CD pipeline via `build-args`.

### Decision: React Dropzone for file upload

**Assumption:** Drag-and-drop upload provides a better UX than a plain `<input type="file">`.
**Why:** React Dropzone handles drag events, file type validation on the client side, and provides a clean API for upload progress tracking via Axios `onUploadProgress`.

---

## Infrastructure

### Decision: Docker for both frontend and backend

**Assumption:** Consistent, reproducible deployments across environments are required.
**Why:** Docker eliminates "works on my machine" issues. The multi-stage Dockerfile keeps the final image small (only the compiled output is shipped, not dev dependencies). The frontend uses `nginx:alpine` to serve the static build — a common, battle-tested approach.

### Decision: nginx as reverse proxy on EC2

**Assumption:** Both frontend and backend run on the same EC2 instance.
**Why:** nginx efficiently handles SSL termination, forwards requests to the correct container based on the subdomain, and can be configured for custom upload size limits (`client_max_body_size 100M`). It also serves as a security layer between the public internet and the application containers.

### Decision: GitHub Actions for CI/CD

**Assumption:** Every push to `main` should trigger an automated build, test, and deploy cycle.
**Why:** GitHub Actions is free for public repositories, integrates natively with the GitHub repo, and has official actions for Docker Hub login and SSH deployment. The pipeline enforces code quality (lint + format + test) before any deployment happens.
