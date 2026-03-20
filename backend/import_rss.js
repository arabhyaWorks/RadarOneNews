const axios = require('axios');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
require('dotenv').config();

const sources = require('./sources.json');

const AUTHOR_ID   = 'user_6a63efc5fe6b';
const AUTHOR_NAME = 'ANIMESH';
const MAX_AGE_DAYS = 3;

// Map RSS source/feedCategory/rssCategory → DB category id
function mapCategory(feedCategory, rssCategory, source) {
  const combined = ((rssCategory || '') + ' ' + (feedCategory || '') + ' ' + (source || '')).toLowerCase();

  if (/crime|अपराध/.test(combined))              return 'crime';
  if (/politic|राजनीति|election|चुनाव/.test(combined)) return 'politics';
  if (/sport|खेल|cricket|football/.test(combined)) return 'sports';
  if (/business|economy|market|व्यापार/.test(combined)) return 'business';
  if (/tech|technology|प्रौद्योगिकी/.test(combined)) return 'technology';
  if (/entertainment|bollywood|मनोरंजन/.test(combined)) return 'entertainment';
  if (/health|स्वास्थ्य|medical/.test(combined))   return 'health';
  if (/world|international|विश्व|विदेश/.test(combined)) return 'world';
  if (/national|india|राष्ट्रीय|देश/.test(combined)) return 'national';
  if (/uttar.?pradesh|uttar-pradesh|up news|यूपी|उत्तर प्रदेश/.test(combined)) return 'uttar-pradesh';
  // district feeds fall here as local
  return 'local';
}

function extractTag(tag, content) {
  const cdata  = new RegExp('<' + tag + '[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/' + tag + '>', 'i');
  const normal = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  const m = content.match(cdata) || content.match(normal);
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : null;
}

function extractAttr(tag, attr, content) {
  const m = content.match(new RegExp('<' + tag + '[^>]*\\s' + attr + '=["\']([^"\']+)["\']', 'i'));
  return m ? m[1] : null;
}

function getImage(item) {
  return extractAttr('media:content', 'url', item)
    || extractAttr('media:thumbnail', 'url', item)
    || extractAttr('enclosure', 'url', item)
    || null;
}

function urlToId(url) {
  return 'rss_' + crypto.createHash('md5').update(url).digest('hex').substring(0, 16);
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchFeed(feed) {
  const res = await axios.get(feed.url, {
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': '*/*' }
  });
  return res.data.toString();
}

async function scrapeFullContent(url, fallbackDescription, sourceName) {
  try {
    const res = await axios.get(url, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'hi-IN,hi;q=0.9,en;q=0.8',
      },
      maxRedirects: 5,
    });
    const dom = new JSDOM(res.data, { url });
    const parsed = new Readability(dom.window.document).parse();
    if (parsed && parsed.textContent && parsed.textContent.trim().length > 100) {
      const cleaned = parsed.content
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
        .trim();
      return cleaned + `\n<p style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e5e7eb;font-size:0.85rem;color:#6b7280;"><a href="${url}" target="_blank" rel="noopener">Read original at ${sourceName}</a></p>`;
    }
  } catch (_) {}
  // Fallback to description
  return fallbackDescription.length > 50
    ? `<p>${fallbackDescription}</p><p><a href="${url}" target="_blank" rel="noopener">Read original at ${sourceName}</a></p>`
    : `<p><a href="${url}" target="_blank" rel="noopener">Read original at ${sourceName}</a></p>`;
}

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  console.log(`\nImporting RSS articles (max age: ${MAX_AGE_DAYS} days, cutoff: ${cutoff.toISOString()})`);
  console.log(`Author: ${AUTHOR_NAME} (${AUTHOR_ID})\n`);

  // Load existing article IDs to skip duplicates
  const [existing] = await db.execute('SELECT article_id FROM articles');
  const existingIds = new Set(existing.map(r => r.article_id));
  console.log(`Existing articles in DB: ${existingIds.size}`);

  let inserted = 0, skippedOld = 0, skippedDup = 0, skippedNoTitle = 0, feedErrors = 0;
  const seenUrls = new Set(); // dedup across feeds in this run

  for (let i = 0; i < sources.feeds.length; i++) {
    const feed = sources.feeds[i];
    process.stdout.write(`[${i+1}/${sources.feeds.length}] ${feed.source}/${feed.category}... `);

    try {
      const xml = await fetchFeed(feed);
      const rawItems = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
      let feedInserted = 0;

      for (const item of rawItems) {
        const title = extractTag('title', item);
        if (!title || title.length < 5) { skippedNoTitle++; continue; }

        const link = extractTag('link', item);
        if (!link || !link.startsWith('http')) { skippedNoTitle++; continue; }

        // Dedup by URL
        const articleId = urlToId(link);
        if (existingIds.has(articleId) || seenUrls.has(link)) { skippedDup++; continue; }
        seenUrls.add(link);

        // Date filter
        const pubDateStr = extractTag('pubDate', item) || extractTag('pubdate', item);
        let pubDate = pubDateStr ? new Date(pubDateStr) : null;
        if (!pubDate || isNaN(pubDate)) pubDate = new Date(); // fallback to now
        if (pubDate < cutoff) { skippedOld++; continue; }

        const description = stripHtml(extractTag('description', item) || '');
        const rssCategory = extractTag('category', item);
        const author      = extractTag('dc:creator', item) || extractTag('author', item) || feed.source;
        const image       = getImage(item);
        const category    = mapCategory(feed.category, rssCategory, feed.source);

        // Scrape full content
        const content = await scrapeFullContent(link, description, feed.source);

        await db.execute(
          `INSERT IGNORE INTO articles
           (article_id, title, content, category, image_url, source_name, status, author_id, author_name, created_at, updated_at, views)
           VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, 0)`,
          [articleId, title, content, category, image, feed.source, AUTHOR_ID, AUTHOR_NAME, pubDate, pubDate]
        );

        existingIds.add(articleId);
        inserted++;
        feedInserted++;
      }

      process.stdout.write(`${feedInserted} inserted\n`);
    } catch (e) {
      feedErrors++;
      process.stdout.write(`FAILED (${e.message.substring(0, 40)})\n`);
    }
  }

  console.log('\n' + '='.repeat(55));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(55));
  console.log(`✅ Inserted:       ${inserted}`);
  console.log(`⏩ Skipped old:    ${skippedOld} (> ${MAX_AGE_DAYS} days)`);
  console.log(`⏩ Skipped dup:    ${skippedDup}`);
  console.log(`⏩ Skipped no URL: ${skippedNoTitle}`);
  console.log(`❌ Feed errors:    ${feedErrors}`);

  // Final count
  const [total] = await db.execute('SELECT COUNT(*) as c FROM articles WHERE status="published"');
  const [bycat]  = await db.execute('SELECT category, COUNT(*) as c FROM articles WHERE status="published" GROUP BY category ORDER BY c DESC');
  console.log(`\nTotal published articles in DB: ${total[0].c}`);
  console.log('\nBy category:');
  bycat.forEach(r => console.log(`  ${r.category.padEnd(20)} ${r.c}`));

  await db.end();
}

main().catch(console.error);
