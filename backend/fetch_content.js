/**
 * fetch_content.js
 * Scrapes full article text from the source URL using Readability,
 * updates content column in DB for all RSS articles.
 * Run: node fetch_content.js
 */

const axios = require('axios');
const mysql = require('mysql2/promise');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
require('dotenv').config();

const BATCH_SIZE = 8;
const TIMEOUT    = 12000;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
  'Accept-Language': 'hi-IN,hi;q=0.9,en;q=0.8',
};

function extractArticleUrl(content) {
  const m = content.match(/href="(https?:\/\/[^"]+)"/);
  return m ? m[1] : null;
}

function cleanContent(html) {
  // Remove scripts, styles, ads, nav, footer junk from readability output
  return (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '') // remove image figures (we have hero image)
    .replace(/\s{3,}/g, ' ')
    .trim();
}

async function scrapeContent(articleUrl) {
  const res = await axios.get(articleUrl, {
    timeout: TIMEOUT,
    headers: HEADERS,
    maxRedirects: 5,
  });

  const dom = new JSDOM(res.data, { url: articleUrl });
  const reader = new Readability(dom.window.document);
  const parsed = reader.parse();

  if (!parsed || !parsed.textContent || parsed.textContent.trim().length < 100) return null;

  return {
    content: cleanContent(parsed.content),
    text: parsed.textContent.replace(/\s+/g, ' ').trim(),
  };
}

async function processArticle(article, db) {
  const articleUrl = extractArticleUrl(article.content);
  if (!articleUrl) return 'no-url';

  try {
    const result = await scrapeContent(articleUrl);
    if (!result) return 'no-content';

    // Store full HTML content + keep source link at bottom
    const sourceName = article.source_name || 'Source';
    const fullContent = result.content +
      `\n<p style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e5e7eb;font-size:0.85rem;color:#6b7280;">` +
      `<a href="${articleUrl}" target="_blank" rel="noopener">Read original article at ${sourceName}</a></p>`;

    await db.execute(
      'UPDATE articles SET content = ? WHERE article_id = ?',
      [fullContent, article.article_id]
    );
    return 'ok';
  } catch (e) {
    const status = e.response?.status;
    if (status === 403 || status === 401) return 'blocked';
    if (status === 404) return 'not-found';
    return 'failed';
  }
}

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // Only articles that still have the old "Read full article" placeholder
  const [articles] = await db.execute(
    `SELECT article_id, content, source_name FROM articles
     WHERE status = 'published'
       AND content LIKE '%Read full article at%'
     ORDER BY created_at DESC`
  );

  console.log(`\nArticles to scrape: ${articles.length}\n`);

  const stats = { ok: 0, 'no-url': 0, 'no-content': 0, blocked: 0, 'not-found': 0, failed: 0 };

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    process.stdout.write(`[${i + 1}-${Math.min(i + BATCH_SIZE, articles.length)}/${articles.length}] `);

    const results = await Promise.all(batch.map(a => processArticle(a, db)));
    results.forEach(r => {
      stats[r] = (stats[r] || 0) + 1;
      process.stdout.write(r === 'ok' ? '✅' : r === 'blocked' ? '🚫' : r === 'not-found' ? '❌' : '·');
    });
    process.stdout.write('\n');
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Full content scraped: ${stats.ok}`);
  console.log(`🚫 Blocked (403):        ${stats.blocked}`);
  console.log(`❌ Not found (404):      ${stats['not-found']}`);
  console.log(`·  No content parsed:   ${stats['no-content']}`);
  console.log(`·  No URL:              ${stats['no-url']}`);
  console.log(`·  Other failures:      ${stats.failed}`);

  await db.end();
}

main().catch(console.error);
