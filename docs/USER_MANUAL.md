# User Manual

**Live App:** https://assignment.koushikpanda.online

---

## Getting Started

### Creating an Account

1. Open https://assignment.koushikpanda.online
2. Click **Sign Up**
3. Enter your name, email, and a password (min 8 characters)
4. Click **Register** — you will be logged in automatically

**Or sign in with Google:**

1. Click **Continue with Google**
2. Select your Google account
3. You will be redirected back and logged in automatically

New accounts are assigned the **Viewer** role by default. An Admin can upgrade your role.

---

### Logging In

1. Go to https://assignment.koushikpanda.online
2. Enter your email and password
3. Click **Login**

**Demo accounts for testing:**

| Role   | Email                  | Password      |
| ------ | ---------------------- | ------------- |
| Admin  | koushikpanda@gmail.com | Panda@1111111 |
| Editor | johndoe@gmail.com      | Panda@1111111 |
| Viewer | koushik@gmail.com      | Panda@1111111 |

---

## Dashboard

After login, you land on the **Dashboard** — your video library.

### What you see:

- All videos you have uploaded
- Each video card shows:
  - **Title** and description
  - **Status badge:** `pending` / `processing` / `safe` / `flagged`
  - Upload date and file size
  - Action buttons (Play, Delete)

### Status meanings:

| Status       | Meaning                                      |
| ------------ | -------------------------------------------- |
| `pending`    | Video uploaded, waiting to be processed      |
| `processing` | Sensitivity analysis is running              |
| `safe`       | Video passed content check — ready to stream |
| `flagged`    | Video flagged for sensitive content          |

### Real-time updates:

You do not need to refresh the page. When a video finishes processing, the status badge updates automatically via live connection.

### Filtering videos:

Use the filter buttons at the top of the dashboard to show only:

- All videos
- Safe videos
- Flagged videos
- Pending / Processing videos

---

## Uploading a Video (Editor & Admin only)

1. Click **Upload** in the navigation bar
2. Drag and drop a video file onto the upload area, **or** click to browse and select a file
3. Add a **title** and optional **description**
4. Click **Upload**
5. A progress bar shows the upload percentage
6. Once uploaded, you are redirected to the Dashboard
7. The video status starts as `pending` and updates in real time as processing completes

**Supported formats:** MP4, MOV, AVI, MKV, WebM
**Maximum file size:** 100MB

---

## Watching a Video

1. On the Dashboard, find the video you want to watch
2. Click the **Play** button on the video card
3. The video player opens — click play to start streaming
4. You can seek (jump to any position) and control volume

Only **safe** videos can be streamed. Flagged or pending videos are not playable.

---

## Deleting a Video (Editor & Admin only)

1. On the Dashboard, find the video you want to delete
2. Click the **Delete** button (trash icon) on the video card
3. Confirm deletion in the dialog
4. The video and its file are permanently removed

---

## Admin Panel (Admin only)

The Admin Panel lets you manage all users in the system.

### Accessing the Admin Panel:

- Click **Admin** in the navigation bar (only visible to Admins)

### What you can do:

#### View all users

- See a list of all registered users with their email, role, and join date

#### Change a user's role

1. Find the user in the list
2. Click the role dropdown next to their name
3. Select the new role: `viewer`, `editor`, or `admin`
4. The change takes effect immediately

#### Delete a user

1. Find the user in the list
2. Click the **Delete** button
3. Confirm deletion
4. The user account is permanently removed

---

## Role Capabilities Summary

| Action             | Viewer | Editor | Admin |
| ------------------ | ------ | ------ | ----- |
| View dashboard     | ✅     | ✅     | ✅    |
| Watch safe videos  | ✅     | ✅     | ✅    |
| Upload videos      | ❌     | ✅     | ✅    |
| Delete own videos  | ❌     | ✅     | ✅    |
| Access admin panel | ❌     | ❌     | ✅    |
| Change user roles  | ❌     | ❌     | ✅    |
| Delete any user    | ❌     | ❌     | ✅    |

---

## Logging Out

- Click your profile icon or name in the top navigation
- Click **Logout**
- You will be redirected to the login page

---

## Troubleshooting

**Video stuck on `processing`:**

- Wait up to 1-2 minutes for FFmpeg analysis to complete
- If it remains stuck, try refreshing the page

**Cannot upload:**

- Check your role — Viewers cannot upload. Ask an Admin to upgrade your role to Editor.
- Check the file size — maximum is 100MB
- Check the file format — only video files are accepted

**Cannot play video:**

- Only `safe` videos are playable. Flagged videos are restricted.
- Try a different browser if playback fails

**Google login not working:**

- Make sure pop-ups are not blocked in your browser
- Try clearing cookies and retrying
