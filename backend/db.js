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
  connectionLimit: 20,
  queueLimit: 0,
  timezone: '+00:00',
  dateStrings: false,
  // Keep TCP connections alive — critical for remote RDS to avoid
  // full TCP+TLS handshake on every request
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 20000,
});

async function initDB() {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
  console.log('[db] MySQL pool connected');
}

module.exports = { pool, initDB };
