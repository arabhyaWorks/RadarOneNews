/**
 * fetch_images.js
 * Scrapes og:image from articles with no image_url,
 * stores the original image URL directly in DB (no S3).
 * Run: node fetch_images.js
 */

const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

const BATCH_SIZE = 15;
const TIMEOUT    = 10000;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
  'Accept-Language': 'hi-IN,hi;q=0.9,en;q=0.8',
};

function extractOgImage(html) {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1] && m[1].startsWith('http') && !m[1].includes('logo') && !m[1].includes('icon')) {
      return m[1];
    }
  }
  return null;
}

function extractArticleUrl(content) {
  const m = content.match(/href="(https?:\/\/[^"]+)"/);
  return m ? m[1] : null;
}

async function processArticle(article, db) {
  const articleUrl = extractArticleUrl(article.content);
  if (!articleUrl) return 'no-url';

  try {
    const res = await axios.get(articleUrl, { timeout: TIMEOUT, headers: HEADERS });
    const imageUrl = extractOgImage(res.data);
    if (!imageUrl) return 'no-image';

    await db.execute('UPDATE articles SET image_url = ? WHERE article_id = ?', [imageUrl, article.article_id]);
    return 'ok';
  } catch (e) {
    return 'failed';
  }
}

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [articles] = await db.execute(
    `SELECT article_id, content FROM articles
     WHERE image_url IS NULL AND status = 'published' AND content LIKE '%http%'
     ORDER BY created_at DESC`
  );

  console.log(`Found ${articles.length} articles without images\n`);

  const stats = { ok: 0, 'no-url': 0, 'no-image': 0, failed: 0 };

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    process.stdout.write(`[${i + 1}-${Math.min(i + BATCH_SIZE, articles.length)}/${articles.length}] `);

    const results = await Promise.all(batch.map(a => processArticle(a, db)));
    results.forEach(r => {
      stats[r] = (stats[r] || 0) + 1;
      process.stdout.write(r === 'ok' ? '✅' : '·');
    });
    process.stdout.write('\n');
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Images found & saved: ${stats.ok}`);
  console.log(`·  No og:image on page:  ${stats['no-image']}`);
  console.log(`·  No URL in content:    ${stats['no-url']}`);
  console.log(`·  Request failed:       ${stats.failed}`);

  const [withImg] = await db.execute("SELECT COUNT(*) as c FROM articles WHERE image_url IS NOT NULL AND status='published'");
  const [total]   = await db.execute("SELECT COUNT(*) as c FROM articles WHERE status='published'");
  console.log(`\nDB: ${withImg[0].c} / ${total[0].c} published articles now have images`);

  await db.end();
}

main().catch(console.error);
