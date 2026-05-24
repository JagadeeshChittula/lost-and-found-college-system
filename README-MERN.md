# Campus Lost & Found MERN Version

This repo now contains the cleaned MERN version of Campus Lost & Found:

- `backend/`: Express, MongoDB, Socket.IO, sessions, Cloudinary uploads, email, admin APIs
- `frontend/`: React + Vite UI matching the existing Flask pages and CSS

## Project Structure

```text
AI2/
  backend/
    src/
      app.js              # Express app, middleware, routes, Socket.IO
      server.js           # MongoDB connect, seed admin, start server
      config/
      middleware/
      models/
      routes/
      sockets/
      utils/
    package.json
  frontend/
    src/
      api/
        client.js         # fetch wrapper for REST API
      components/
        common/           # InfoCard, Feature, Summary
        layout/           # Layout (header, nav, footer)
      hooks/
        useTheme.js
      pages/
        admin/Admin.jsx
        AuthForm.jsx
        Home.jsx
        ItemForm.jsx
        ItemsPage.jsx
      routes/
        AppRoutes.jsx
      styles/
        styles.css
      App.jsx
      main.jsx
    index.html
    vite.config.js
  package.json
```

## Deploy

See **[DEPLOY.md](./DEPLOY.md)** for deploying to Render (free tier, single URL for frontend + API + chat).

## Run Locally

1. Start MongoDB locally.
2. Create a Cloudinary account and copy your cloud name, API key, and API secret.
3. Copy `backend/.env.example` to `backend/.env` and fill in the values:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/campus_lost_found
SESSION_SECRET=change-this-secret
CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret
```

Uploaded item images are sent to Cloudinary (folder `campus-lost-found`). MongoDB stores only the HTTPS link in `imageUrl` (for example `https://res.cloudinary.com/...`). Local `backend/uploads/` is not used by the MERN API.

4. Install dependencies:

```bash
npm run install-all
```

5. Start both apps:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:5000`

## Default Admin

The backend creates this admin automatically if it does not exist:

- Email: `admin@college.edu`
- Password: `admin123`

## Preserved Features

- Login, signup, logout
- Lost item and found item posting
- Cloudinary image uploads
- Item search and type filtering
- Claim flow
- Realtime chat with Socket.IO
- Profanity and spam checks
- Message reports
- Admin dashboard, users, items, claims, reports
- Optional email notifications via SMTP environment variables
