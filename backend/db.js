require('dotenv').config();
const mysql = require('mysql2/promise');

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'samachar',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
  dateStrings: false,
});

/**
 * Initialize the database by creating tables if they do not exist.
 * Called once on server startup.
 */
async function initDB() {
  const conn = await pool.getConnection();
  try {
    // users table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id     VARCHAR(50)  NOT NULL PRIMARY KEY,
        email       VARCHAR(255) NOT NULL UNIQUE,
        name        VARCHAR(255) NOT NULL,
        password    VARCHAR(255) NULL,
        role        VARCHAR(50)  NOT NULL DEFAULT 'reporter',
        status      VARCHAR(20)  NOT NULL DEFAULT 'pending',
        is_active   TINYINT(1)   NOT NULL DEFAULT 1,
        picture     TEXT         NULL,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // user_sessions table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id             INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id        VARCHAR(50)  NOT NULL,
        session_token  VARCHAR(500) NOT NULL,
        expires_at     DATETIME     NOT NULL,
        created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_session_token (session_token(255)),
        INDEX idx_user_id       (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // articles table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS articles (
        article_id   VARCHAR(50)  NOT NULL PRIMARY KEY,
        title        TEXT         NOT NULL,
        title_hi     TEXT         NULL,
        content      LONGTEXT     NOT NULL,
        content_hi   LONGTEXT     NULL,
        category     VARCHAR(100) NOT NULL,
        image_url    TEXT         NULL,
        is_featured  TINYINT(1)   NOT NULL DEFAULT 0,
        pinned       TINYINT(1)   NOT NULL DEFAULT 0,
        status       VARCHAR(50)  NOT NULL DEFAULT 'draft',
        author_id    VARCHAR(50)  NOT NULL,
        author_name  VARCHAR(255) NOT NULL,
        created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        views        INT          NOT NULL DEFAULT 0,
        INDEX idx_status      (status),
        INDEX idx_category    (category),
        INDEX idx_author_id   (author_id),
        INDEX idx_is_featured (is_featured),
        INDEX idx_created_at  (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // settings table (key-value store for site config like breaking news)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\`       VARCHAR(100) NOT NULL PRIMARY KEY,
        value        TEXT         NULL,
        updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by   VARCHAR(50)  NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // audit_logs table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id               INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
        action           VARCHAR(100) NOT NULL,
        entity_type      VARCHAR(50)  NOT NULL,
        entity_id        VARCHAR(100) NULL,
        entity_label     VARCHAR(255) NULL,
        performed_by     VARCHAR(50)  NOT NULL,
        performed_by_name VARCHAR(255) NOT NULL,
        details          TEXT         NULL,
        created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at),
        INDEX idx_performed_by (performed_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // categories table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id         VARCHAR(100) NOT NULL PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        name_hi    VARCHAR(255) NOT NULL,
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed default categories if table is empty
    const [[{ cnt }]] = await conn.query('SELECT COUNT(*) AS cnt FROM categories');
    if (cnt === 0) {
      const defaults = [
        ['sports',        'Sports',        'खेल'],
        ['crime',         'Crime',         'अपराध'],
        ['politics',      'Politics',      'राजनीति'],
        ['entertainment', 'Entertainment', 'मनोरंजन'],
        ['business',      'Business',      'व्यापार'],
        ['technology',    'Technology',    'प्रौद्योगिकी'],
      ];
      for (const [id, name, name_hi] of defaults) {
        await conn.query(
          'INSERT INTO categories (id, name, name_hi) VALUES (?, ?, ?)',
          [id, name, name_hi]
        );
      }
    }

    console.log('[db] Tables ensured (users, user_sessions, articles, categories)');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDB };
