const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306')
};

async function seedGamification() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);

    console.log('Resetting scores for a fresh start (optional, setting to 0)...');
    await connection.query('UPDATE users SET score = 0, current_streak = 0, longest_streak = 0');

    console.log('Fetching all published articles...');
    const [articles] = await connection.query('SELECT author_id, is_featured FROM articles WHERE status = "published"');

    console.log(`Found ${articles.length} published articles. Awarding points...`);
    
    for (const article of articles) {
      // Award 50 points per article
      // Award 20 extra if featured
      const points = 50 + (article.is_featured ? 20 : 0);
      await connection.query('UPDATE users SET score = score + ? WHERE user_id = ?', [points, article.author_id]);
    }

    console.log('Setting fallback streak for active users (1 day if any article exists)...');
    await connection.query(`
      UPDATE users 
      SET current_streak = 1, longest_streak = 1 
      WHERE user_id IN (SELECT DISTINCT author_id FROM articles WHERE status = "published")
    `);

    console.log('Gamification seeding complete! Leaderboard should now be populated.');
  } catch (err) {
    console.error('Error seeding gamification:', err);
  } finally {
    if (connection) await connection.end();
  }
}

seedGamification();
