const { pool } = require('./db');
require('dotenv').config();

async function migrate() {
  console.log('Running Gamification Migrations...');
  try {
    // Check if columns exist; if they fail, they don't exist, we add them.
    await pool.query('ALTER TABLE users ADD COLUMN score INT DEFAULT 0;');
    console.log('Added `score` column.');
  } catch(e) { console.log('Score column already exists, skipping.'); }

  try {
    await pool.query('ALTER TABLE users ADD COLUMN current_streak INT DEFAULT 0;');
    console.log('Added `current_streak` column.');
  } catch(e) { console.log('current_streak column already exists, skipping.'); }

  try {
    await pool.query('ALTER TABLE users ADD COLUMN longest_streak INT DEFAULT 0;');
    console.log('Added `longest_streak` column.');
  } catch(e) { console.log('longest_streak column already exists, skipping.'); }

  try {
    await pool.query('ALTER TABLE users ADD COLUMN last_publish_date DATE NULL;');
    console.log('Added `last_publish_date` column.');
  } catch(e) { console.log('last_publish_date column already exists, skipping.'); }

  console.log('Migrations complete.');
  process.exit(0);
}

migrate();
