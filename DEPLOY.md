# Deploy Campus Lost & Found (Render)

This guide deploys the **full app** (React + Express + Socket.IO) as one service on [Render](https://render.com). The API and UI share the same URL, so sessions and chat work without extra CORS setup.

## Before you deploy

1. **MongoDB Atlas** – cluster running; connection string ready (`MONGO_URI`).
2. **Cloudinary** – `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET` from the [Cloudinary dashboard](https://cloudinary.com/console).
3. **GitHub** – code pushed to GitHub (this repo).

### MongoDB Atlas network access

In Atlas → **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) so Render can connect.

---

## Option A: Deploy with Blueprint (`render.yaml`)

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect your GitHub repo (`lost-and-found-college-system`).
3. Render reads `render.yaml` and creates a web service.
4. When prompted, set these **environment variables** (copy from your local `backend/.env`):

| Variable | Example / notes |
|----------|-----------------|
| `CLIENT_URL` | `https://campus-lost-found-xxxx.onrender.com` (use your real Render URL **after** first deploy, then update and redeploy) |
| `MONGO_URI` | Your Atlas connection string |
| `CLOUD_NAME` | Cloudinary cloud name |
| `CLOUD_API_KEY` | Cloudinary API key |
| `CLOUD_API_SECRET` | Cloudinary API secret |
| `SESSION_SECRET` | Long random string (Render can auto-generate one) |

5. Click **Apply** and wait for the build (about 3–5 minutes).

---

## Option B: Manual Web Service

1. **New** → **Web Service** → connect GitHub repo.
2. Settings:

| Field | Value |
|-------|--------|
| **Root directory** | *(leave empty)* |
| **Build command** | `npm run build` |
| **Start command** | `npm start` |
| **Instance type** | Free |

3. **Environment** → add:

```env
NODE_ENV=production
CLIENT_URL=https://YOUR-SERVICE-NAME.onrender.com
MONGO_URI=your_atlas_uri
SESSION_SECRET=long-random-secret
CLOUD_NAME=your_cloud_name
CLOUD_API_KEY=your_api_key
CLOUD_API_SECRET=your_api_secret
```

4. **Create Web Service**.

---

## After the first deploy

1. Open your Render URL (e.g. `https://campus-lost-found.onrender.com`).
2. Set **`CLIENT_URL`** in Render to that exact URL (with `https://`, no trailing slash).
3. **Save** and trigger **Manual Deploy** so cookies and CORS match.

## Login as admin

- Email: `admin@college.edu`
- Password: `admin123`

Change the admin password after going live.

---

## Local production test

```bash
npm run build
set NODE_ENV=production
set CLIENT_URL=http://localhost:5000
npm start
```

Open `http://localhost:5000` (not 5173).

---

## Free tier notes

- Render free services **sleep** after ~15 minutes of no traffic; the first visit may take 30–60 seconds to wake up.
- For a hackathon demo, wake the app once before presenting.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| MongoDB connection failed | Check `MONGO_URI`; allow `0.0.0.0/0` in Atlas Network Access |
| Login does not stick | Set `CLIENT_URL` to your exact Render HTTPS URL and redeploy |
| Image upload fails | Verify all three `CLOUD_*` variables on Render |
| Blank page | Check build logs; ensure `frontend/dist` was created |

**Never commit `backend/.env`** — only set secrets in the Render dashboard.
