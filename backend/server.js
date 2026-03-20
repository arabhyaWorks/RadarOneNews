require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');

const { pool, initDB } = require('./db');
const { cache, TTL } = require('./cache');

// ============== S3 / LOCAL UPLOAD SETUP ==============

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const useS3 = !!(process.env.S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

if (!useS3 && !fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

let upload;
if (useS3) {
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  upload = multer({
    storage: multerS3({
      s3,
      bucket: process.env.S3_BUCKET_NAME,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `articles/${uuidv4()}${ext}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files are allowed'));
    },
  });
} else {
  // Local disk fallback when AWS is not configured
  upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files are allowed'));
    },
  });
}

// ============== CONFIGURATION ==============

const JWT_SECRET = process.env.JWT_SECRET || 'samachar-group-secret-key-2024';
const JWT_EXPIRATION_HOURS = 24 * 7; // 7 days
const JWT_EXPIRATION_SECONDS = JWT_EXPIRATION_HOURS * 3600;

const app = express();
const PORT = process.env.PORT || 8001;

// ============== MIDDLEWARE ==============

// Basic security headers
app.use(helmet());
// Optional: If you serve images from external domains, you might need to tweak helmet's CSP like:
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // Allow external images (if any)

const allowedOrigins = (process.env.CORS_ORIGINS || '*').split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID'],
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// ============== AUTH HELPERS ==============

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hashed) {
  return bcrypt.compareSync(password, hashed);
}

function createJwtToken(userId, email, role) {
  return jwt.sign(
    { user_id: userId, email, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION_SECONDS }
  );
}

function decodeJwtToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const error = new Error('Token expired');
      error.status = 401;
      throw error;
    }
    const error = new Error('Invalid token');
    error.status = 401;
    throw error;
  }
}

/**
 * Middleware: authenticate the request via session cookie or Bearer JWT.
 * Attaches req.currentUser on success; sends 401 on failure.
 */
async function requireAuth(req, res, next) {
  try {
    let sessionToken = req.cookies && req.cookies.session_token;

    if (!sessionToken) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        sessionToken = authHeader.slice(7);
      }
    }

    if (!sessionToken) {
      return res.status(401).json({ detail: 'Not authenticated' });
    }

    // 1. Check user_sessions table (Google OAuth sessions)
    const [sessions] = await pool.query(
      'SELECT * FROM user_sessions WHERE session_token = ? LIMIT 1',
      [sessionToken]
    );

    if (sessions.length > 0) {
      const session = sessions[0];
      const expiresAt = new Date(session.expires_at);
      if (expiresAt < new Date()) {
        return res.status(401).json({ detail: 'Session expired' });
      }

      const [users] = await pool.query(
        'SELECT * FROM users WHERE user_id = ? LIMIT 1',
        [session.user_id]
      );

      if (users.length === 0) {
        return res.status(401).json({ detail: 'User not found' });
      }

      req.currentUser = users[0];
      return next();
    }

    // 2. Try JWT token
    let payload;
    try {
      payload = decodeJwtToken(sessionToken);
    } catch (err) {
      return res.status(401).json({ detail: err.message || 'Invalid authentication' });
    }

    const [users] = await pool.query(
      'SELECT * FROM users WHERE user_id = ? LIMIT 1',
      [payload.user_id]
    );

    if (users.length === 0) {
      return res.status(401).json({ detail: 'User not found' });
    }

    req.currentUser = users[0];
    return next();
  } catch (err) {
    console.error('[requireAuth] error:', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Middleware: require admin role.
 * Must be used after requireAuth.
 */
function requireAdmin(req, res, next) {
  if (!req.currentUser || req.currentUser.role !== 'admin') {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  return next();
}

// Columns for list queries — truncates LONGTEXT to avoid sending MBs of HTML
// just to render card previews (cards only show ~3 lines of plain text)
const LIST_COLS = `article_id, title, title_hi,
  LEFT(content, 600) AS content, LEFT(content_hi, 600) AS content_hi,
  category, image_url, source_name, is_featured, pinned, status,
  author_id, author_name, created_at, updated_at, views`;

// ============== GAMIFICATION ==============

async function rewardUserForPublish(user_id) {
  try {
    const query = `
      UPDATE users 
      SET 
        score = score + 50 + IF(DATEDIFF(CURDATE(), last_publish_date) = 1, 10, 0),
        current_streak = CASE 
          WHEN last_publish_date IS NULL THEN 1
          WHEN DATEDIFF(CURDATE(), last_publish_date) = 1 THEN current_streak + 1
          WHEN DATEDIFF(CURDATE(), last_publish_date) = 0 THEN current_streak
          ELSE 1 
        END,
        longest_streak = GREATEST(longest_streak, CASE
          WHEN last_publish_date IS NULL THEN 1
          WHEN DATEDIFF(CURDATE(), last_publish_date) = 1 THEN current_streak
          WHEN DATEDIFF(CURDATE(), last_publish_date) = 0 THEN current_streak
          ELSE 1
        END),
        last_publish_date = CURDATE()
      WHERE user_id = ?;
    `;
    await pool.query(query, [user_id]);
    cache.del('leaderboard');
  } catch (err) {
    console.error('[rewardUserForPublish]', err);
  }
}

// ============== ROUTER ==============

const api = express.Router();

// ---------- ROOT ----------

api.get('/', (req, res) => {
  res.json({ message: 'Samachar Group API', version: '1.0.0' });
});

// ============== UPLOAD ENDPOINT ==============

// POST /api/upload/image  — requires auth, returns { url }
api.post('/upload/image', requireAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ detail: err.message || 'Upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ detail: 'No file provided' });
    }
    return res.status(200).json({ url: req.file.location });
  });
});

// ============== AUTH ENDPOINTS ==============

// POST /api/auth/register
api.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(422).json({ detail: 'email, password, and name are required' });
    }

    const [existing] = await pool.query(
      'SELECT user_id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ detail: 'Email already registered' });
    }

    const userId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const hashedPassword = hashPassword(password);
    const now = new Date();

    await pool.query(
      `INSERT INTO users (user_id, email, name, password, role, status, picture, created_at)
       VALUES (?, ?, ?, ?, 'reporter', 'pending', NULL, ?)`,
      [userId, email, name, hashedPassword, now]
    );

    const token = createJwtToken(userId, email, 'reporter');

    return res.status(200).json({
      token,
      user: {
        user_id: userId,
        email,
        name,
        role: 'reporter',
        status: 'pending',
      },
    });
  } catch (err) {
    console.error('[POST /auth/register]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// POST /api/auth/login
api.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(422).json({ detail: 'email and password are required' });
    }

    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (users.length === 0 || !users[0].password) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    const user = users[0];

    if (!verifyPassword(password, user.password)) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    const token = createJwtToken(user.user_id, user.email, user.role);

    res.cookie('session_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: JWT_EXPIRATION_SECONDS * 1000, // ms
      path: '/',
    });

    return res.status(200).json({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        picture: user.picture || null,
      },
    });
  } catch (err) {
    console.error('[POST /auth/login]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// POST /api/auth/google-session
api.post('/auth/google-session', async (req, res) => {
  try {
    const { session_id: sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ detail: 'Session ID required' });
    }

    // Call Emergent Auth API
    let authData;
    try {
      const authResponse = await axios.get(
        'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
        {
          headers: { 'X-Session-ID': sessionId },
          timeout: 10000,
        }
      );
      authData = authResponse.data;
    } catch (err) {
      const status = err.response ? err.response.status : 500;
      if (status !== 200 || err.response) {
        return res.status(401).json({ detail: 'Invalid session' });
      }
      throw err;
    }

    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [authData.email]
    );

    let userId;
    let role;

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      userId = existingUser.user_id;
      role = existingUser.role;

      await pool.query(
        'UPDATE users SET name = ?, picture = ? WHERE user_id = ?',
        [authData.name, authData.picture || null, userId]
      );
    } else {
      userId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      role = 'reporter';
      const now = new Date();

      await pool.query(
        `INSERT INTO users (user_id, email, name, picture, role, status, password, created_at)
         VALUES (?, ?, ?, ?, 'reporter', 'pending', NULL, ?)`,
        [userId, authData.email, authData.name, authData.picture || null, now]
      );
    }

    // Store session
    const sessionToken = authData.session_token;
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const now = new Date();

    await pool.query(
      `INSERT INTO user_sessions (user_id, session_token, expires_at, created_at)
       VALUES (?, ?, ?, ?)`,
      [userId, sessionToken, expiresAt, now]
    );

    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 3600 * 1000, // ms
      path: '/',
    });

    return res.status(200).json({
      user: {
        user_id: userId,
        email: authData.email,
        name: authData.name,
        role,
        picture: authData.picture || null,
      },
    });
  } catch (err) {
    console.error('[POST /auth/google-session]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// GET /api/auth/me
api.get('/auth/me', requireAuth, (req, res) => {
  const user = req.currentUser;
  return res.status(200).json({
    user_id: user.user_id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    picture: user.picture || null,
    score: user.score || 0,
    current_streak: user.current_streak || 0,
    longest_streak: user.longest_streak || 0,
  });
});

// POST /api/auth/logout
api.post('/auth/logout', async (req, res) => {
  try {
    const sessionToken = req.cookies && req.cookies.session_token;

    if (sessionToken) {
      await pool.query(
        'DELETE FROM user_sessions WHERE session_token = ?',
        [sessionToken]
      );
    }

    res.clearCookie('session_token', { path: '/' });
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('[POST /auth/logout]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// ============== ARTICLE ENDPOINTS ==============

// POST /api/articles
api.post('/articles', requireAuth, async (req, res) => {
  try {
    const {
      title,
      title_hi = null,
      content,
      content_hi = null,
      category,
      image_url = null,
      is_featured = false,
      status = 'draft',
    } = req.body;

    if (!title || !content || !category) {
      return res.status(422).json({ detail: 'title, content, and category are required' });
    }

    const user = req.currentUser;

    // Only approved reporters (or admins) can publish
    if (status === 'published' && user.role !== 'admin' && user.status !== 'approved') {
      return res.status(403).json({ detail: 'Your account is pending admin approval. You can save drafts but cannot publish yet.' });
    }
    const articleId = `article_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date();

    await pool.query(
      `INSERT INTO articles
         (article_id, title, title_hi, content, content_hi, category, image_url,
          is_featured, status, author_id, author_name, created_at, updated_at, views)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        articleId,
        title,
        title_hi,
        content,
        content_hi,
        category,
        image_url,
        is_featured ? 1 : 0,
        status,
        user.user_id,
        user.name,
        now,
        now,
      ]
    );

    const [rows] = await pool.query(
      'SELECT * FROM articles WHERE article_id = ? LIMIT 1',
      [articleId]
    );

    if (status === 'published') {
      cache.delByPrefix('public_articles:');
      await rewardUserForPublish(user.user_id);
    }
    return res.status(200).json(formatArticle(rows[0]));
  } catch (err) {
    console.error('[POST /articles]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// GET /api/articles
api.get('/articles', async (req, res) => {
  try {
    const {
      category,
      status,
      search,
      featured,
      author_id,
      limit = '50',
      skip = '0',
    } = req.query;

    const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
    const skipNum = Math.max(0, parseInt(skip, 10) || 0);

    let whereClauses = [];
    let params = [];

    if (category) {
      whereClauses.push('category = ?');
      params.push(category);
    }
    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }
    if (featured !== undefined && featured !== '') {
      const featuredBool = featured === 'true' || featured === '1';
      whereClauses.push('is_featured = ?');
      params.push(featuredBool ? 1 : 0);
    }
    if (author_id) {
      whereClauses.push('author_id = ?');
      params.push(author_id);
    }
    if (search) {
      whereClauses.push(
        '(title LIKE ? OR title_hi LIKE ? OR content LIKE ?)'
      );
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const whereSQL =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT ${LIST_COLS} FROM articles ${whereSQL} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, skipNum]
    );

    return res.status(200).json(rows.map(formatArticle));
  } catch (err) {
    console.error('[GET /articles]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// GET /api/articles/:article_id
api.get('/articles/:article_id', async (req, res) => {
  try {
    const { article_id } = req.params;
    const incrementView =
      req.query.increment_view === undefined ||
      req.query.increment_view === 'true' ||
      req.query.increment_view === '1';

    const [rows] = await pool.query(
      'SELECT * FROM articles WHERE article_id = ? LIMIT 1',
      [article_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Article not found' });
    }

    let article = rows[0];

    if (incrementView) {
      await pool.query(
        'UPDATE articles SET views = views + 1 WHERE article_id = ?',
        [article_id]
      );
      article.views = (article.views || 0) + 1;
    }

    return res.status(200).json(formatArticle(article));
  } catch (err) {
    console.error('[GET /articles/:article_id]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// PUT /api/articles/:article_id
api.put('/articles/:article_id', requireAuth, async (req, res) => {
  try {
    const { article_id } = req.params;
    const user = req.currentUser;

    const [existing] = await pool.query(
      'SELECT * FROM articles WHERE article_id = ? LIMIT 1',
      [article_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ detail: 'Article not found' });
    }

    const article = existing[0];

    if (article.author_id !== user.user_id && user.role !== 'admin') {
      return res.status(403).json({ detail: 'Not authorized' });
    }

    // Only approved reporters (or admins) can publish
    if (req.body.status === 'published' && user.role !== 'admin' && user.status !== 'approved') {
      return res.status(403).json({ detail: 'Your account is pending admin approval. You cannot publish yet.' });
    }

    // Build update set from only the provided fields
    const allowedFields = [
      'title',
      'title_hi',
      'content',
      'content_hi',
      'category',
      'image_url',
      'is_featured',
      'status',
    ];

    const setClauses = [];
    const params = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        if (field === 'is_featured') {
          setClauses.push('is_featured = ?');
          params.push(req.body[field] ? 1 : 0);
        } else {
          setClauses.push(`${field} = ?`);
          params.push(req.body[field]);
        }
      }
    }

    if (setClauses.length === 0) {
      // Nothing to update; return the existing article
      return res.status(200).json(formatArticle(article));
    }

    setClauses.push('updated_at = ?');
    params.push(new Date());
    params.push(article_id);

    await pool.query(
      `UPDATE articles SET ${setClauses.join(', ')} WHERE article_id = ?`,
      params
    );

    const [updated] = await pool.query(
      'SELECT * FROM articles WHERE article_id = ? LIMIT 1',
      [article_id]
    );

    if (article.status !== 'published' && req.body.status === 'published') {
      await rewardUserForPublish(article.author_id);
    }

    cache.delByPrefix('public_articles:');
    return res.status(200).json(formatArticle(updated[0]));
  } catch (err) {
    console.error('[PUT /articles/:article_id]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// DELETE /api/articles/:article_id
api.delete('/articles/:article_id', requireAuth, async (req, res) => {
  try {
    const { article_id } = req.params;
    const user = req.currentUser;

    const [existing] = await pool.query(
      'SELECT * FROM articles WHERE article_id = ? LIMIT 1',
      [article_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ detail: 'Article not found' });
    }

    const article = existing[0];

    if (article.author_id !== user.user_id && user.role !== 'admin') {
      return res.status(403).json({ detail: 'Not authorized' });
    }

    await pool.query('DELETE FROM articles WHERE article_id = ?', [article_id]);
    await logAudit('delete', 'article', article_id, article.title, user.user_id, user.name);
    cache.delByPrefix('public_articles:');
    return res.status(200).json({ message: 'Article deleted' });
  } catch (err) {
    console.error('[DELETE /articles/:article_id]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// ============== ADMIN ENDPOINTS ==============

// GET /api/admin/articles
api.get('/admin/articles', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, limit = '100' } = req.query;
    const limitNum = Math.max(1, Math.min(1000, parseInt(limit, 10) || 100));

    let whereSQL = '';
    const params = [];

    if (status) {
      whereSQL = 'WHERE status = ?';
      params.push(status);
    }

    const [rows] = await pool.query(
      `SELECT ${LIST_COLS} FROM articles ${whereSQL} ORDER BY created_at DESC LIMIT ?`,
      [...params, limitNum]
    );

    return res.status(200).json(rows.map(formatArticle));
  } catch (err) {
    console.error('[GET /admin/articles]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// PUT /api/admin/articles/:article_id/revoke
api.put(
  '/admin/articles/:article_id/revoke',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { article_id } = req.params;

      const [existing] = await pool.query(
        'SELECT article_id, title FROM articles WHERE article_id = ? LIMIT 1',
        [article_id]
      );

      if (existing.length === 0) {
        return res.status(404).json({ detail: 'Article not found' });
      }

      await pool.query(
        "UPDATE articles SET status = 'revoked', updated_at = ? WHERE article_id = ?",
        [new Date(), article_id]
      );

      await logAudit('revoke', 'article', article_id, existing[0].title, req.currentUser.user_id, req.currentUser.name);
      cache.delByPrefix('public_articles:');
      return res.status(200).json({ message: 'Article revoked' });
    } catch (err) {
      console.error('[PUT /admin/articles/:article_id/revoke]', err);
      return res.status(500).json({ detail: 'Internal server error' });
    }
  }
);

// GET /api/admin/stats
api.get('/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [[{ total_articles }]] = await pool.query(
      'SELECT COUNT(*) AS total_articles FROM articles'
    );
    const [[{ published }]] = await pool.query(
      "SELECT COUNT(*) AS published FROM articles WHERE status = 'published'"
    );
    const [[{ drafts }]] = await pool.query(
      "SELECT COUNT(*) AS drafts FROM articles WHERE status = 'draft'"
    );
    const [[{ revoked }]] = await pool.query(
      "SELECT COUNT(*) AS revoked FROM articles WHERE status = 'revoked'"
    );
    const [[{ total_users }]] = await pool.query(
      'SELECT COUNT(*) AS total_users FROM users'
    );
    const [[{ reporters }]] = await pool.query(
      "SELECT COUNT(*) AS reporters FROM users WHERE role = 'reporter'"
    );
    const [[{ pending_reporters }]] = await pool.query(
      "SELECT COUNT(*) AS pending_reporters FROM users WHERE role = 'reporter' AND status = 'pending'"
    );

    return res.status(200).json({
      total_articles,
      published,
      drafts,
      revoked,
      total_users,
      reporters,
      pending_reporters,
    });
  } catch (err) {
    console.error('[GET /admin/stats]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// GET /api/admin/reporters
api.get('/admin/reporters', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let whereSQL = "WHERE role = 'reporter'";
    const params = [];
    if (status) {
      whereSQL += ' AND status = ?';
      params.push(status);
    }
    const [rows] = await pool.query(
      `SELECT user_id, email, name, role, status, picture, created_at FROM users ${whereSQL} ORDER BY created_at DESC`,
      params
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error('[GET /admin/reporters]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// PUT /api/admin/reporters/:user_id/approve
api.put('/admin/reporters/:user_id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user_id } = req.params;
    const [existing] = await pool.query('SELECT user_id, name FROM users WHERE user_id = ? AND role = ?', [user_id, 'reporter']);
    if (existing.length === 0) return res.status(404).json({ detail: 'Reporter not found' });
    await pool.query("UPDATE users SET status = 'approved' WHERE user_id = ?", [user_id]);
    await logAudit('approve_reporter', 'user', user_id, existing[0].name, req.currentUser.user_id, req.currentUser.name);
    return res.status(200).json({ message: 'Reporter approved' });
  } catch (err) {
    console.error('[PUT /admin/reporters/:user_id/approve]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// PUT /api/admin/reporters/:user_id/reject
api.put('/admin/reporters/:user_id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user_id } = req.params;
    const [existing] = await pool.query('SELECT user_id, name FROM users WHERE user_id = ? AND role = ?', [user_id, 'reporter']);
    if (existing.length === 0) return res.status(404).json({ detail: 'Reporter not found' });
    await pool.query("UPDATE users SET status = 'rejected' WHERE user_id = ?", [user_id]);
    await logAudit('reject_reporter', 'user', user_id, existing[0].name, req.currentUser.user_id, req.currentUser.name);
    return res.status(200).json({ message: 'Reporter rejected' });
  } catch (err) {
    console.error('[PUT /admin/reporters/:user_id/reject]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// ============== AUDIT LOG HELPER ==============

async function logAudit(action, entityType, entityId, entityLabel, userId, userName, details = null) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, entity_label, performed_by, performed_by_name, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [action, entityType, entityId, entityLabel, userId, userName, details]
    );
  } catch (err) {
    console.error('[audit]', err.message);
  }
}

// ============== ARTICLE EXTRA ACTIONS ==============

// PUT /api/admin/articles/:id/republish
api.put('/admin/articles/:id/republish', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT title, status FROM articles WHERE article_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ detail: 'Article not found' });
    if (rows[0].status !== 'revoked') return res.status(400).json({ detail: 'Only revoked articles can be republished' });
    await pool.query("UPDATE articles SET status = 'published' WHERE article_id = ?", [id]);
    await logAudit('republish', 'article', id, rows[0].title, req.currentUser.user_id, req.currentUser.name);
    cache.delByPrefix('public_articles:');
    return res.json({ message: 'Article republished' });
  } catch (err) {
    console.error('[PUT /admin/articles/:id/republish]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// PUT /api/admin/articles/:id/feature
api.put('/admin/articles/:id/feature', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT title, is_featured, author_id FROM articles WHERE article_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ detail: 'Article not found' });
    const newVal = rows[0].is_featured ? 0 : 1;
    await pool.query('UPDATE articles SET is_featured = ? WHERE article_id = ?', [newVal, id]);
    
    if (newVal === 1) {
      await pool.query('UPDATE users SET score = score + 20 WHERE user_id = ?', [rows[0].author_id]);
    }
    
    await logAudit(newVal ? 'feature' : 'unfeature', 'article', id, rows[0].title, req.currentUser.user_id, req.currentUser.name);
    cache.delByPrefix('public_articles:');
    return res.json({ is_featured: !!newVal });
  } catch (err) {
    console.error('[PUT /admin/articles/:id/feature]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// PUT /api/admin/articles/:id/pin
api.put('/admin/articles/:id/pin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT title, pinned FROM articles WHERE article_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ detail: 'Article not found' });
    const newVal = rows[0].pinned ? 0 : 1;
    await pool.query('UPDATE articles SET pinned = ? WHERE article_id = ?', [newVal, id]);
    await logAudit(newVal ? 'pin' : 'unpin', 'article', id, rows[0].title, req.currentUser.user_id, req.currentUser.name);
    cache.delByPrefix('public_articles:');
    return res.json({ pinned: !!newVal });
  } catch (err) {
    console.error('[PUT /admin/articles/:id/pin]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// POST /api/admin/articles/bulk
api.post('/admin/articles/bulk', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { ids, action } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ detail: 'ids array required' });
    const allowed = ['delete', 'revoke', 'republish', 'feature', 'unfeature'];
    if (!allowed.includes(action)) return res.status(400).json({ detail: `action must be one of: ${allowed.join(', ')}` });

    const placeholders = ids.map(() => '?').join(',');
    if (action === 'delete') {
      await pool.query(`DELETE FROM articles WHERE article_id IN (${placeholders})`, ids);
    } else if (action === 'revoke') {
      await pool.query(`UPDATE articles SET status = 'revoked' WHERE article_id IN (${placeholders})`, ids);
    } else if (action === 'republish') {
      await pool.query(`UPDATE articles SET status = 'published' WHERE article_id IN (${placeholders})`, ids);
    } else if (action === 'feature') {
      await pool.query(`UPDATE articles SET is_featured = 1 WHERE article_id IN (${placeholders})`, ids);
    } else if (action === 'unfeature') {
      await pool.query(`UPDATE articles SET is_featured = 0 WHERE article_id IN (${placeholders})`, ids);
    }
    await logAudit(`bulk_${action}`, 'article', ids.join(','), `${ids.length} articles`, req.currentUser.user_id, req.currentUser.name);
    cache.delByPrefix('public_articles:');
    return res.json({ message: `Bulk ${action} applied to ${ids.length} article(s)` });
  } catch (err) {
    console.error('[POST /admin/articles/bulk]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// GET /api/admin/articles/export  — returns CSV
api.get('/admin/articles/export', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT article_id, title, category, status, author_name, views, is_featured, pinned, created_at FROM articles ORDER BY created_at DESC'
    );
    const header = 'article_id,title,category,status,author_name,views,is_featured,pinned,created_at';
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [header, ...rows.map(r =>
      [r.article_id, r.title, r.category, r.status, r.author_name, r.views, r.is_featured ? 1 : 0, r.pinned ? 1 : 0, r.created_at].map(escape).join(',')
    )].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="articles.csv"');
    return res.send(csv);
  } catch (err) {
    console.error('[GET /admin/articles/export]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// ============== USER MANAGEMENT ENDPOINTS ==============

// GET /api/admin/users
api.get('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role, status } = req.query;
    const where = [];
    const params = [];
    if (role) { where.push('role = ?'); params.push(role); }
    if (status) { where.push('status = ?'); params.push(status); }
    const sql = `SELECT user_id, email, name, role, status, is_active, picture, created_at FROM users${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`;
    const [rows] = await pool.query(sql, params);
    return res.json(rows.map(r => ({ ...r, is_active: r.is_active === 1 })));
  } catch (err) {
    console.error('[GET /admin/users]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id/role
api.put('/admin/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['admin', 'reporter'].includes(role)) return res.status(400).json({ detail: 'role must be admin or reporter' });
    const [rows] = await pool.query('SELECT name FROM users WHERE user_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ detail: 'User not found' });
    await pool.query('UPDATE users SET role = ? WHERE user_id = ?', [role, id]);
    await logAudit('change_role', 'user', id, rows[0].name, req.currentUser.user_id, req.currentUser.name, `role → ${role}`);
    return res.json({ message: 'Role updated' });
  } catch (err) {
    console.error('[PUT /admin/users/:id/role]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id/activate
api.put('/admin/users/:id/activate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT name FROM users WHERE user_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ detail: 'User not found' });
    await pool.query('UPDATE users SET is_active = 1 WHERE user_id = ?', [id]);
    await logAudit('activate_user', 'user', id, rows[0].name, req.currentUser.user_id, req.currentUser.name);
    return res.json({ message: 'User activated' });
  } catch (err) {
    console.error('[PUT /admin/users/:id/activate]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id/deactivate
api.put('/admin/users/:id/deactivate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.currentUser.user_id) return res.status(400).json({ detail: 'Cannot deactivate yourself' });
    const [rows] = await pool.query('SELECT name FROM users WHERE user_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ detail: 'User not found' });
    await pool.query('UPDATE users SET is_active = 0 WHERE user_id = ?', [id]);
    await logAudit('deactivate_user', 'user', id, rows[0].name, req.currentUser.user_id, req.currentUser.name);
    return res.json({ message: 'User deactivated' });
  } catch (err) {
    console.error('[PUT /admin/users/:id/deactivate]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// ============== BREAKING NEWS ENDPOINTS ==============

// GET /api/public/breaking-news
api.get('/public/breaking-news', async (_req, res) => {
  try {
    const cached = cache.get('breaking_news');
    if (cached !== undefined) return res.json(cached);

    const [rows] = await pool.query("SELECT value, updated_at FROM settings WHERE `key` = 'breaking_news'");
    const result = (rows.length === 0 || !rows[0].value)
      ? { text: null }
      : { text: rows[0].value, updated_at: rows[0].updated_at };

    cache.set('breaking_news', result, TTL.BREAKING_NEWS);
    return res.json(result);
  } catch (err) {
    console.error('[GET /public/breaking-news]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// PUT /api/admin/breaking-news
api.put('/admin/breaking-news', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ detail: 'text is required' });
    await pool.query(
      "INSERT INTO settings (`key`, value, updated_by) VALUES ('breaking_news', ?, ?) ON DUPLICATE KEY UPDATE value = ?, updated_by = ?",
      [text.trim(), req.currentUser.user_id, text.trim(), req.currentUser.user_id]
    );
    await logAudit('set_breaking_news', 'setting', 'breaking_news', text.trim().slice(0, 60), req.currentUser.user_id, req.currentUser.name);
    cache.del('breaking_news');
    return res.json({ message: 'Breaking news updated', text: text.trim() });
  } catch (err) {
    console.error('[PUT /admin/breaking-news]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// DELETE /api/admin/breaking-news
api.delete('/admin/breaking-news', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query("UPDATE settings SET value = NULL WHERE `key` = 'breaking_news'");
    await logAudit('clear_breaking_news', 'setting', 'breaking_news', null, req.currentUser.user_id, req.currentUser.name);
    cache.del('breaking_news');
    return res.json({ message: 'Breaking news cleared' });
  } catch (err) {
    console.error('[DELETE /admin/breaking-news]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// ============== ANALYTICS ENDPOINT ==============

// GET /api/admin/analytics
api.get('/admin/analytics', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [[{ total_views }]] = await pool.query("SELECT COALESCE(SUM(views),0) AS total_views FROM articles WHERE status = 'published'");
    const [topArticles] = await pool.query(
      "SELECT article_id, title, views, category, author_name FROM articles WHERE status = 'published' ORDER BY views DESC LIMIT 10"
    );
    const [viewsByCategory] = await pool.query(
      "SELECT category, COUNT(*) AS article_count, COALESCE(SUM(views),0) AS total_views FROM articles WHERE status = 'published' GROUP BY category ORDER BY total_views DESC"
    );
    const [reporterLeaderboard] = await pool.query(
      "SELECT author_id, author_name, COUNT(*) AS article_count, COALESCE(SUM(views),0) AS total_views FROM articles WHERE status = 'published' GROUP BY author_id, author_name ORDER BY total_views DESC LIMIT 10"
    );
    const [articlesOverTime] = await pool.query(
      "SELECT DATE(created_at) AS date, COUNT(*) AS count FROM articles WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(created_at) ORDER BY date ASC"
    );
    return res.json({ total_views, topArticles, viewsByCategory, reporterLeaderboard, articlesOverTime });
  } catch (err) {
    console.error('[GET /admin/analytics]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// ============== AUDIT LOG ENDPOINT ==============

// GET /api/admin/audit-logs
api.get('/admin/audit-logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit || '100', 10));
    const [rows] = await pool.query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?', [limit]
    );
    return res.json(rows);
  } catch (err) {
    console.error('[GET /admin/audit-logs]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// ============== CATEGORY ENDPOINTS ==============

// GET /api/categories  (public)
api.get('/categories', async (_req, res) => {
  try {
    const cached = cache.get('categories');
    if (cached !== undefined) return res.json(cached);

    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    cache.set('categories', rows, TTL.CATEGORIES);
    return res.json(rows);
  } catch (err) {
    console.error('[GET /categories]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// POST /api/admin/categories  (admin only)
api.post('/admin/categories', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id, name, name_hi } = req.body;
    if (!id || !name || !name_hi) return res.status(400).json({ detail: 'id, name and name_hi are required' });
    const slug = id.trim().toLowerCase().replace(/\s+/g, '_');
    const [existing] = await pool.query('SELECT id FROM categories WHERE id = ?', [slug]);
    if (existing.length > 0) return res.status(409).json({ detail: 'Category ID already exists' });
    await pool.query('INSERT INTO categories (id, name, name_hi) VALUES (?, ?, ?)', [slug, name.trim(), name_hi.trim()]);
    cache.del('categories');
    return res.status(201).json({ id: slug, name: name.trim(), name_hi: name_hi.trim() });
  } catch (err) {
    console.error('[POST /admin/categories]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// PUT /api/admin/categories/:id  (admin only)
api.put('/admin/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_hi } = req.body;
    if (!name || !name_hi) return res.status(400).json({ detail: 'name and name_hi are required' });
    const [existing] = await pool.query('SELECT id FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ detail: 'Category not found' });
    await pool.query('UPDATE categories SET name = ?, name_hi = ? WHERE id = ?', [name.trim(), name_hi.trim(), id]);
    cache.del('categories');
    return res.json({ id, name: name.trim(), name_hi: name_hi.trim() });
  } catch (err) {
    console.error('[PUT /admin/categories/:id]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// DELETE /api/admin/categories/:id  (admin only)
api.delete('/admin/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [[{ cnt }]] = await pool.query("SELECT COUNT(*) AS cnt FROM articles WHERE category = ?", [id]);
    if (cnt > 0) return res.status(409).json({ detail: `Cannot delete — ${cnt} article(s) use this category` });
    const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ detail: 'Category not found' });
    cache.del('categories');
    return res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error('[DELETE /admin/categories/:id]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// ============== PUBLIC ENDPOINTS ==============

// GET /api/public/authors/:id
api.get('/public/authors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [users] = await pool.query(
      'SELECT user_id, name, role, picture, score, current_streak, longest_streak FROM users WHERE user_id = ? AND status = "approved" LIMIT 1',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ detail: 'Author not found' });
    }

    return res.status(200).json(users[0]);
  } catch (err) {
    console.error('[GET /public/authors/:id]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// GET /api/public/articles
api.get('/public/articles', async (req, res) => {
  try {
    const {
      category,
      search,
      featured,
      author_id,
      limit = '50',
      skip = '0',
    } = req.query;

    // Skip cache for search queries — results change with every keystroke
    const cacheKey = !search
      ? `public_articles:${JSON.stringify({ category, featured, author_id, limit, skip })}`
      : null;

    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached !== undefined) return res.status(200).json(cached);
    }

    const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
    const skipNum = Math.max(0, parseInt(skip, 10) || 0);

    const whereClauses = ["status = 'published'"];
    const params = [];

    if (category) {
      whereClauses.push('category = ?');
      params.push(category);
    }
    if (featured !== undefined && featured !== '') {
      const featuredBool = featured === 'true' || featured === '1';
      whereClauses.push('is_featured = ?');
      params.push(featuredBool ? 1 : 0);
    }
    if (search) {
      whereClauses.push(
        '(title LIKE ? OR title_hi LIKE ? OR content LIKE ?)'
      );
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (author_id) {
      whereClauses.push('author_id = ?');
      params.push(author_id);
    }

    const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

    const [rows] = await pool.query(
      `SELECT ${LIST_COLS} FROM articles ${whereSQL} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, skipNum]
    );

    const result = rows.map(formatArticle);
    if (cacheKey) cache.set(cacheKey, result, TTL.PUBLIC_ARTICLES);

    return res.status(200).json(result);
  } catch (err) {
    console.error('[GET /public/articles]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// GET /api/public/leaderboard
api.get('/public/leaderboard', async (_req, res) => {
  try {
    const cached = cache.get('leaderboard');
    if (cached !== undefined) return res.status(200).json(cached);

    const [rows] = await pool.query(`
      SELECT user_id, name, picture, score, current_streak, longest_streak 
      FROM users 
      WHERE role IN ('reporter', 'admin') AND is_active = 1
      ORDER BY score DESC, current_streak DESC, name ASC
      LIMIT 100
    `);

    const leaderboard = rows.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    cache.set('leaderboard', leaderboard, TTL.CATEGORIES || 60000); // 60s cache
    return res.status(200).json(leaderboard);
  } catch (err) {
    console.error('[GET /public/leaderboard]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// GET /api/public/categories
api.get('/public/categories', async (_req, res) => {
  try {
    const cached = cache.get('categories');
    if (cached !== undefined) return res.status(200).json({ categories: cached });

    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    cache.set('categories', rows, TTL.CATEGORIES);
    return res.status(200).json({ categories: rows });
  } catch (err) {
    console.error('[GET /public/categories]', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// ============== MOUNT ROUTER ==============

app.use('/api', api);

// ============== UTILITY ==============

/**
 * Normalise a raw MySQL article row for JSON responses.
 * Converts TINYINT is_featured to boolean and ensures consistent field types.
 */
function formatArticle(row) {
  if (!row) return null;
  return {
    article_id: row.article_id,
    title: row.title,
    title_hi: row.title_hi || null,
    content: row.content,
    content_hi: row.content_hi || null,
    category: row.category,
    image_url: row.image_url || null,
    source_name: row.source_name || null,
    is_featured: row.is_featured === 1 || row.is_featured === true,
    pinned: row.pinned === 1 || row.pinned === true,
    status: row.status,
    author_id: row.author_id,
    author_name: row.author_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
    views: row.views || 0,
  };
}

// ============== FRONTEND SERVING & SEO INJECTION ==============

app.use(express.static(path.join(__dirname, '../frontend/build'), { index: false }));

app.get('*', async (req, res) => {
  const indexPath = path.join(__dirname, '../frontend/build', 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    return res.status(404).send('Frontend build not found. Please run "npm run build" in the frontend directory.');
  }

  let htmlData = fs.readFileSync(indexPath, 'utf8');

  try {
    if (req.path.startsWith('/article/')) {
      const articleId = req.path.split('/')[2];
      if (articleId) {
        const [rows] = await pool.query('SELECT * FROM articles WHERE article_id = ?', [articleId]);
        if (rows.length > 0) {
          const article = rows[0];
          const isHindi = req.headers['accept-language']?.includes('hi') || false; // Approximation
          const title = (isHindi && article.title_hi ? article.title_hi : article.title) || '';
          const content = (isHindi && article.content_hi ? article.content_hi : article.content) || '';
          
          const plainTextContent = content.replace(/<[^>]+>/g, '');
          const seoDesc = plainTextContent.substring(0, 160) + (plainTextContent.length > 160 ? '...' : '');
          const seoImage = article.image_url || '';
          const fullUrl = `https://samachar.group${req.path}`;
          
          let metaTags = `
        <title>${title} | Samachar Group</title>
        <meta name="description" content="${seoDesc}" />
        <meta property="og:title" content="${title} | Samachar Group" />
        <meta property="og:description" content="${seoDesc}" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="${fullUrl}" />
        <meta name="twitter:card" content="summary_large_image" />
          `.trim();

          if (seoImage) {
            metaTags += `\n        <meta property="og:image" content="${seoImage}" />`;
          }

          // Inject into the HTML <head> string
          htmlData = htmlData.replace('<title>Emergent | Fullstack App</title>', metaTags);
        }
      }
    } else {
      // General SEO tags for root and other pages
      const generalMetaTags = `
        <title>Samachar Group | India's Trusted News Platform</title>
        <meta name="description" content="Samachar Group - Breaking news, politics, sports, business, and entertainment." />
        <meta property="og:title" content="Samachar Group | India's Trusted News Platform" />
        <meta property="og:description" content="Latest breaking news and updates across sports, politics, entertainment, business, and technology." />
        <meta property="og:type" content="website" />
      `.trim();
      
      htmlData = htmlData.replace('<title>Emergent | Fullstack App</title>', generalMetaTags);
    }
  } catch (err) {
    console.error('[SEO Injection Error]', err);
  }

  res.send(htmlData);
});

// ============== STARTUP ==============

async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`[server] Samachar Group API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  }
}

start();
