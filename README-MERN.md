# Campus Lost & Found MERN Version

This repo now contains the cleaned MERN version of Campus Lost & Found:

- `backend/`: Express, MongoDB, Socket.IO, sessions, Cloudinary uploads, email, admin APIs
- `frontend/`: React + Vite UI matching the existing Flask pages and CSS

## Project Structure

```text
AI2/
  backend/
    src/
      config/
      middleware/
      models/
      routes/
      sockets/
      utils/
      server.js
    package.json
  frontend/
    src/
      App.jsx
      main.jsx
      styles.css
    index.html
    vite.config.js
  package.json
```

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

Uploaded item images are stored in the Cloudinary folder `campus-lost-found`. MongoDB stores only the resulting `imageUrl`.

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
