# Samachar Group - News Portal

A bilingual (English + Hindi) news portal built with **React**, **Node.js/Express**, and **MySQL**.

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 19, Tailwind CSS, Radix UI, React Router v7 |
| Backend  | Node.js, Express.js                 |
| Database | MySQL 9.x                           |
| Auth     | JWT (jsonwebtoken) + bcryptjs, Google OAuth (session-based) |

---

## Prerequisites

- Node.js v18+ & npm
- MySQL 9.x (installed via Homebrew)
- Git

---

## Local Setup

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd Samachar
```

### 2. Start MySQL

```bash
brew services start mysql
# OR run manually:
/opt/homebrew/opt/mysql/bin/mysqld_safe --datadir=/opt/homebrew/var/mysql &
```

### 3. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=samachar
JWT_SECRET=samachar-secret-key-2024
CORS_ORIGINS=http://localhost:3000
PORT=8001
```

Create the database schema:
```bash
mysql -u root < setup.sql
```

Seed users and sample articles:
```bash
node seed.js
```

Start the server:
```bash
node server.js
```

Backend runs at **http://localhost:8001**

### 4. Frontend Setup

```bash
cd frontend
npm install --legacy-peer-deps
```

Create `frontend/.env`:
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

Start the app:
```bash
npm start
```

Frontend runs at **http://localhost:3000**

---

## Default Login Credentials

| Role     | Email                    | Password      |
|----------|--------------------------|---------------|
| Admin    | admin@samachar.com       | admin123      |
| Reporter | reporter@samachar.com    | reporter123   |

---

## Project Structure

```
Samachar/
├── backend/
│   ├── server.js        # Express app — all API routes
│   ├── db.js            # MySQL connection pool + table creation
│   ├── seed.js          # Seeds users and sample articles
│   ├── setup.sql        # DDL — creates samachar DB and all tables
│   ├── package.json
│   └── .env             # DB credentials, JWT secret, CORS origins
│
└── frontend/
    ├── src/
    │   ├── pages/       # HomePage, ArticlePage, CategoryPage, DashboardPage, AdminPage, EditorPage
    │   ├── components/  # Shared UI components (QuillEditor, etc.)
    │   └── ...
    ├── package.json
    └── .env             # REACT_APP_BACKEND_URL
```

---

## Database Schema

Database name: **`samachar`**
Charset: `utf8mb4` / `utf8mb4_unicode_ci`

### Table: `users`

| Column     | Type         | Constraints                  | Description                   |
|------------|--------------|------------------------------|-------------------------------|
| user_id    | VARCHAR(50)  | PRIMARY KEY                  | e.g. `user_a1b2c3d4e5f6`      |
| email      | VARCHAR(255) | UNIQUE, NOT NULL             | Login email                   |
| name       | VARCHAR(255) | NOT NULL                     | Display name                  |
| password   | VARCHAR(255) | NULL                         | bcrypt hash (NULL for OAuth)  |
| role       | VARCHAR(50)  | NOT NULL, DEFAULT 'reporter' | `admin` or `reporter`         |
| picture    | TEXT         | NULL                         | Profile photo URL             |
| created_at | DATETIME     | NOT NULL                     | UTC timestamp                 |

Indexes: `uq_email` (unique), `idx_role`

---

### Table: `user_sessions`

Stores Google OAuth sessions (not used for JWT logins).

| Column        | Type         | Constraints    | Description              |
|---------------|--------------|----------------|--------------------------|
| id            | INT          | PK, AUTO_INC   | Internal row ID          |
| user_id       | VARCHAR(50)  | NOT NULL       | References users.user_id |
| session_token | VARCHAR(500) | NOT NULL       | Token from Google OAuth  |
| expires_at    | DATETIME     | NOT NULL       | 7-day expiry             |
| created_at    | DATETIME     | NOT NULL       | UTC timestamp            |

Indexes: `idx_session_token`, `idx_user_id`

---

### Table: `articles`

| Column      | Type         | Constraints                 | Description                                |
|-------------|--------------|-----------------------------|--------------------------------------------|
| article_id  | VARCHAR(50)  | PRIMARY KEY                 | e.g. `article_a1b2c3d4e5f6`               |
| title       | TEXT         | NOT NULL                    | English title                              |
| title_hi    | TEXT         | NULL                        | Hindi title                                |
| content     | LONGTEXT     | NOT NULL                    | English content (HTML from rich editor)    |
| content_hi  | LONGTEXT     | NULL                        | Hindi content                              |
| category    | VARCHAR(100) | NOT NULL                    | sports / crime / politics / entertainment / business / technology |
| image_url   | TEXT         | NULL                        | Cover image URL                            |
| is_featured | TINYINT(1)   | NOT NULL, DEFAULT 0         | 1 = featured on homepage                  |
| status      | VARCHAR(50)  | NOT NULL, DEFAULT 'draft'   | `draft` / `published` / `revoked`         |
| author_id   | VARCHAR(50)  | NOT NULL                    | References users.user_id                   |
| author_name | VARCHAR(255) | NOT NULL                    | Denormalised author name                   |
| created_at  | DATETIME     | NOT NULL                    | UTC timestamp                              |
| updated_at  | DATETIME     | NOT NULL, ON UPDATE         | Auto-updated on change                     |
| views       | INT          | NOT NULL, DEFAULT 0         | View count                                 |

Indexes: `idx_status`, `idx_category`, `idx_author_id`, `idx_is_featured`, `idx_created_at`

---

## API Reference

Base URL: `http://localhost:8001/api`

All protected routes accept auth via:
- Cookie: `session_token`
- Header: `Authorization: Bearer <token>`

### Auth

| Method | Path                   | Auth     | Description                        |
|--------|------------------------|----------|------------------------------------|
| POST   | /auth/register         | Public   | Register new reporter account      |
| POST   | /auth/login            | Public   | Login, returns JWT + sets cookie   |
| POST   | /auth/google-session   | Public   | Google OAuth via session ID        |
| GET    | /auth/me               | Required | Get current user info              |
| POST   | /auth/logout           | Public   | Clear cookie + delete session      |

### Articles

| Method | Path                              | Auth          | Description                          |
|--------|-----------------------------------|---------------|--------------------------------------|
| POST   | /articles                         | Required      | Create article (reporter or admin)   |
| GET    | /articles                         | Public        | List articles (filterable)           |
| GET    | /articles/:article_id             | Public        | Get single article (increments views)|
| PUT    | /articles/:article_id             | Required      | Update (author or admin only)        |
| DELETE | /articles/:article_id             | Required      | Delete (author or admin only)        |

Query params for GET /articles: `category`, `status`, `search`, `featured`, `author_id`, `limit` (default 50), `skip` (default 0)

### Admin (admin role required)

| Method | Path                                    | Description              |
|--------|-----------------------------------------|--------------------------|
| GET    | /admin/articles                         | All articles (any status)|
| PUT    | /admin/articles/:article_id/revoke      | Set status to revoked    |
| GET    | /admin/stats                            | Counts: articles, users  |

### Public

| Method | Path                  | Description                              |
|--------|-----------------------|------------------------------------------|
| GET    | /public/articles      | Published articles only (filterable)     |
| GET    | /public/categories    | Hardcoded list of 6 categories           |

---

## Article Status Flow

```
draft → published → revoked
```

- Reporters create articles as `draft` or `published`
- Admins can `revoke` any published article
- Only `published` articles appear in `/public/articles`

---

## Categories

| ID            | English       | Hindi         |
|---------------|---------------|---------------|
| sports        | Sports        | खेल           |
| crime         | Crime         | अपराध         |
| politics      | Politics      | राजनीति       |
| entertainment | Entertainment | मनोरंजन       |
| business      | Business      | व्यापार       |
| technology    | Technology    | प्रौद्योगिकी  |

---

## Deployment

| Component | Recommended Free Options         |
|-----------|----------------------------------|
| Frontend  | Vercel, Netlify                  |
| Backend   | Railway, Render, Fly.io          |
| Database  | PlanetScale, Railway MySQL, Aiven|

### Backend env vars for production:
```
DB_HOST=<your-mysql-host>
DB_PORT=3306
DB_USER=<user>
DB_PASSWORD=<password>
DB_NAME=samachar
JWT_SECRET=<strong-random-secret>
CORS_ORIGINS=https://your-frontend.vercel.app
PORT=8001
```
