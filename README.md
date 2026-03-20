# News Portal — Powered by Samachar Engine

A bilingual (English + Hindi) news portal built with **React**, **Node.js/Express**, and **MySQL**. Fully white-label ready — rebrand for any client by setting environment variables.

---

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 19, Tailwind CSS, Radix UI, React Router v7 |
| Backend  | Node.js, Express.js |
| Database | MySQL (local or AWS RDS) |
| Storage  | AWS S3 (image uploads) — falls back to local disk if not configured |
| Auth     | JWT + bcryptjs, Google OAuth |

---

## Features

- **Bilingual** — English + Hindi toggle throughout
- **Role-based access** — Admin, Reporter, Reader
- **Reporter approval workflow** — New reporters start as `pending`; admin must approve before they can publish
- **Admin panel** with 7 tabs:
  - Articles (bulk actions, feature/pin/revoke/republish, CSV export)
  - Reporters (approve / reject pending accounts)
  - Users (role change, activate / deactivate)
  - Categories (add / edit / delete — DB-driven, no hardcoding)
  - Breaking News ticker (set / clear)
  - Analytics (views, top articles, reporter leaderboard, charts)
  - Audit Log
- **Gamification** — reporters earn points and streaks on publish; leaderboard visible to reporters & admins only
- **Dynamic branding** — name, tagline, contact details all set via `.env` (no code changes needed per client)
- **S3 image upload** with local-disk fallback
- **API response caching** for performance

---

## Quick Start

### 1. Clone

```bash
git clone <repo-url>
cd <project>
```

### 2. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
# Database (local or RDS)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=samachar_group
JWT_SECRET=your-secret-key
CORS_ORIGINS=http://localhost:3000
PORT=8001

# AWS S3 (optional — omit to use local disk storage)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
S3_BUCKET_NAME=
```

Run the schema:

```bash
mysql -u root < setup.sql
```

Start:

```bash
node server.js
```

Backend runs at **http://localhost:8001**

---

### 3. Frontend

```bash
cd frontend
npm install --legacy-peer-deps
```

Create `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001

# Branding — change these per client deployment
REACT_APP_BRAND_NAME=Samachar Group
REACT_APP_BRAND_NAME_HI=समाचार ग्रुप
REACT_APP_BRAND_TAGLINE=India's Trusted News Platform
REACT_APP_BRAND_TAGLINE_HI=भारत का विश्वसनीय न्यूज़ प्लेटफ़ॉर्म
REACT_APP_BRAND_DESCRIPTION=Breaking news, politics, sports, business, and entertainment.
REACT_APP_BRAND_DESCRIPTION_HI=ताज़ा खबरें, राजनीति, खेल, व्यापार और मनोरंजन।
REACT_APP_BRAND_EMAIL=news@example.in
REACT_APP_BRAND_PHONE=+91 98765 43210
REACT_APP_BRAND_ADDRESS=Lucknow, Uttar Pradesh, India
REACT_APP_BRAND_ADDRESS_HI=लखनऊ, उत्तर प्रदेश, भारत
```

Start:

```bash
npm start
```

Frontend runs at **http://localhost:3000**

---

## Default Login Credentials

| Role     | Email                 | Password    |
|----------|-----------------------|-------------|
| Admin    | admin@samachar.com    | admin123    |
| Reporter | reporter@samachar.com | reporter123 |

> Admin login automatically redirects to `/admin`.

---

## White-Label / Client Deployment

To deploy for a new client, only change the `frontend/.env` branding variables and `backend/.env` database/S3 credentials — **no code changes required**.

```env
REACT_APP_BRAND_NAME=AmitNews
REACT_APP_BRAND_NAME_HI=अमित न्यूज़
REACT_APP_BRAND_TAGLINE=UP ki Buland Awaaz
REACT_APP_BRAND_TAGLINE_HI=यूपी की बुलंद आवाज़
REACT_APP_BRAND_EMAIL=hello@amitnews.in
...
```

---

## Project Structure

```
project/
├── backend/
│   ├── server.js               # All API routes, auth, gamification, admin
│   ├── db.js                   # MySQL connection pool
│   ├── cache.js                # In-memory API cache
│   ├── setup.sql               # Full DB schema
│   ├── migrate_gamification.js # Adds score/streak columns to existing DB
│   ├── seed_scores.js          # Seeds gamification scores for existing users
│   └── .env                    # DB, JWT, AWS credentials
│
└── frontend/
    └── src/
        ├── config/
        │   └── branding.js     # All brand text — reads from REACT_APP_* env vars
        ├── pages/
        │   ├── HomePage.js
        │   ├── ArticlePage.js
        │   ├── CategoryPage.js
        │   ├── AdminPage.js    # Full admin panel (7 tabs)
        │   ├── DashboardPage.js
        │   ├── EditorPage.js   # Rich text editor + S3 image upload
        │   ├── LeaderboardPage.js
        │   └── AuthPage.js
        ├── components/
        │   └── layout/
        │       ├── Header.js   # Breaking news ticker, category nav
        │       └── Footer.js
        └── .env                # Backend URL + branding vars
```

---

## Database Schema (key tables)

### `users`
| Column            | Type        | Description |
|-------------------|-------------|-------------|
| user_id           | VARCHAR(50) | Primary key |
| email             | VARCHAR(255)| Unique login email |
| name              | VARCHAR(255)| Display name |
| password          | VARCHAR(255)| bcrypt hash (NULL for OAuth) |
| role              | VARCHAR(50) | `admin` / `reporter` / `reader` |
| reporter_status   | VARCHAR(50) | `pending` / `approved` / `rejected` |
| is_active         | TINYINT(1)  | 1 = active, 0 = deactivated |
| score             | INT         | Gamification score |
| current_streak    | INT         | Consecutive publish days |
| longest_streak    | INT         | All-time best streak |
| last_publish_date | DATE        | Used to compute streaks |

### `articles`
| Column      | Type         | Description |
|-------------|--------------|-------------|
| article_id  | VARCHAR(50)  | Primary key |
| title       | TEXT         | English title |
| content     | LONGTEXT     | HTML from rich editor |
| category    | VARCHAR(100) | DB-driven category |
| image_url   | TEXT         | S3 or external URL |
| is_featured | TINYINT(1)   | Featured on homepage |
| pinned      | TINYINT(1)   | Pinned to top |
| status      | VARCHAR(50)  | `draft` / `published` / `revoked` |
| views       | INT          | View counter |

### Other tables
- `categories` — admin-managed category list
- `settings` — key-value store (breaking news ticker etc.)
- `audit_logs` — admin action history

---

## Article Status Flow

```
draft → published → revoked → published (republish)
```

---

## Gamification

- +50 points per published article
- +10 bonus points for publishing on consecutive days (streak)
- Leaderboard visible to reporters and admins only

---

## API Overview

Base URL: `http://localhost:8001/api`

Auth via cookie `session_token` or header `Authorization: Bearer <token>`.

| Group      | Examples |
|------------|---------|
| Auth       | `POST /auth/login`, `POST /auth/register`, `GET /auth/me` |
| Public     | `GET /public/articles`, `GET /public/breaking-news`, `GET /public/leaderboard` |
| Articles   | `POST /articles`, `GET /articles/:id`, `PUT /articles/:id` |
| Admin      | `GET /admin/articles`, `PUT /admin/articles/:id/revoke`, `PUT /admin/articles/:id/feature`, `PUT /admin/articles/:id/pin`, `POST /admin/articles/bulk`, `GET /admin/articles/export` |
| Admin      | `GET /admin/reporters`, `PUT /admin/reporters/:id/approve`, `PUT /admin/reporters/:id/reject` |
| Admin      | `GET /admin/users`, `PUT /admin/users/:id/role`, `PUT /admin/users/:id/activate` |
| Admin      | `GET /admin/analytics`, `GET /admin/audit-logs` |
| Admin      | `PUT /admin/breaking-news`, `DELETE /admin/breaking-news` |
| Categories | `GET /api/categories`, `POST /api/categories`, `PUT /api/categories/:id`, `DELETE /api/categories/:id` |

---

## Deployment

| Component | Recommended |
|-----------|-------------|
| Frontend  | Vercel, Netlify |
| Backend   | Railway, Render, Fly.io |
| Database  | AWS RDS, PlanetScale, Railway MySQL |
| Storage   | AWS S3 |
