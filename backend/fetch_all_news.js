const axios = require('axios');
const sources = require('./sources.json');

function extractTag(tag, content) {
  const cdata = new RegExp('<' + tag + '[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/' + tag + '>', 'i');
  const normal = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  let m = content.match(cdata) || content.match(normal);
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : null;
}

function extractAttr(tag, attr, content) {
  const pattern = new RegExp('<' + tag + '[^>]*\\s' + attr + '=["\']([^"\']+)["\']', 'i');
  const m = content.match(pattern);
  return m ? m[1] : null;
}

function getImage(item) {
  return extractAttr('media:content', 'url', item)
    || extractAttr('media:thumbnail', 'url', item)
    || extractAttr('enclosure', 'url', item)
    || null;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  try { return new Date(dateStr); } catch { return null; }
}

function ageLabel(date) {
  if (!date || isNaN(date)) return 'unknown date';
  const diffMs = Date.now() - date.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  const diffD = diffH / 24;
  if (diffH < 1) return `${Math.round(diffH * 60)}m ago`;
  if (diffH < 24) return `${Math.round(diffH)}h ago`;
  if (diffD < 7) return `${Math.round(diffD)}d ago`;
  if (diffD < 30) return `${Math.round(diffD / 7)}w ago`;
  return `${Math.round(diffD / 30)}mo ago`;
}

async function fetchFeed(feed) {
  try {
    const res = await axios.get(feed.url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });
    const xml = res.data.toString();
    const rawItems = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

    return rawItems.map(item => {
      const title       = extractTag('title', item);
      const link        = extractTag('link', item);
      const pubDate     = extractTag('pubDate', item) || extractTag('pubdate', item);
      const description = extractTag('description', item);
      const category    = extractTag('category', item);
      const author      = extractTag('dc:creator', item) || extractTag('author', item);
      const image       = getImage(item);
      const date        = parseDate(pubDate);

      return { title, link, pubDate, date, description, category, author, image, source: feed.source, feedCategory: feed.category };
    });
  } catch (e) {
    return [];
  }
}

(async () => {
  console.log(`Fetching ${sources.feeds.length} feeds...\n`);

  const allArticles = [];
  let feedSuccess = 0, feedFail = 0;

  for (const feed of sources.feeds) {
    process.stdout.write(`  [${sources.feeds.indexOf(feed) + 1}/${sources.feeds.length}] ${feed.source} / ${feed.category}... `);
    const articles = await fetchFeed(feed);
    if (articles.length) {
      feedSuccess++;
      process.stdout.write(`${articles.length} items\n`);
      allArticles.push(...articles);
    } else {
      feedFail++;
      process.stdout.write(`FAILED\n`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('TOTAL STATS');
  console.log('='.repeat(70));
  console.log(`Feeds succeeded:  ${feedSuccess} / ${sources.feeds.length}`);
  console.log(`Feeds failed:     ${feedFail}`);
  console.log(`Total articles:   ${allArticles.length}`);

  // Age breakdown
  const now = Date.now();
  const buckets = { '< 1h': 0, '1-6h': 0, '6-24h': 0, '1-3d': 0, '3-7d': 0, '> 7d': 0, 'no date': 0 };
  for (const a of allArticles) {
    if (!a.date || isNaN(a.date)) { buckets['no date']++; continue; }
    const h = (now - a.date.getTime()) / 3600000;
    if (h < 1)       buckets['< 1h']++;
    else if (h < 6)  buckets['1-6h']++;
    else if (h < 24) buckets['6-24h']++;
    else if (h < 72) buckets['1-3d']++;
    else if (h < 168) buckets['3-7d']++;
    else              buckets['> 7d']++;
  }

  console.log('\n--- Publish Date Age Breakdown ---');
  for (const [k, v] of Object.entries(buckets)) {
    const bar = '█'.repeat(Math.round(v / allArticles.length * 40));
    console.log(`  ${k.padEnd(8)}: ${String(v).padStart(5)}  ${bar}`);
  }

  // Field coverage
  const withTitle   = allArticles.filter(a => a.title).length;
  const withDesc    = allArticles.filter(a => a.description && a.description.length > 20).length;
  const withImage   = allArticles.filter(a => a.image).length;
  const withAuthor  = allArticles.filter(a => a.author).length;
  const withCat     = allArticles.filter(a => a.category).length;
  const withDate    = allArticles.filter(a => a.date && !isNaN(a.date)).length;

  console.log('\n--- Field Coverage ---');
  const pct = n => (n / allArticles.length * 100).toFixed(1) + '%';
  console.log(`  title:       ${withTitle} (${pct(withTitle)})`);
  console.log(`  description: ${withDesc} (${pct(withDesc)})`);
  console.log(`  image:       ${withImage} (${pct(withImage)})`);
  console.log(`  author:      ${withAuthor} (${pct(withAuthor)})`);
  console.log(`  category:    ${withCat} (${pct(withCat)})`);
  console.log(`  pubDate:     ${withDate} (${pct(withDate)})`);

  // Per-source breakdown
  const bySource = {};
  for (const a of allArticles) {
    if (!bySource[a.source]) bySource[a.source] = [];
    bySource[a.source].push(a);
  }

  console.log('\n--- Per Source Breakdown ---');
  for (const [src, arts] of Object.entries(bySource)) {
    const withImg = arts.filter(a => a.image).length;
    const withDsc = arts.filter(a => a.description && a.description.length > 20).length;
    const oldest  = arts.filter(a => a.date && !isNaN(a.date)).sort((a, b) => a.date - b.date)[0];
    const newest  = arts.filter(a => a.date && !isNaN(a.date)).sort((a, b) => b.date - a.date)[0];
    console.log(`\n  ${src} (${arts.length} articles)`);
    console.log(`    images: ${withImg}/${arts.length}  |  descriptions: ${withDsc}/${arts.length}`);
    console.log(`    newest: ${newest ? ageLabel(newest.date) + ' — ' + newest.title?.substring(0, 60) : 'N/A'}`);
    console.log(`    oldest: ${oldest ? ageLabel(oldest.date) + ' — ' + oldest.title?.substring(0, 60) : 'N/A'}`);
  }

  // Sample 3 recent articles across all sources
  const sorted = allArticles
    .filter(a => a.date && !isNaN(a.date) && a.title)
    .sort((a, b) => b.date - a.date)
    .slice(0, 5);

  console.log('\n--- 5 Most Recent Articles (all sources) ---');
  for (const a of sorted) {
    console.log(`\n  [${ageLabel(a.date)}] ${a.source}`);
    console.log(`  Title:  ${a.title?.substring(0, 100)}`);
    console.log(`  Desc:   ${a.description ? a.description.replace(/<[^>]+>/g, '').substring(0, 100) : 'NO DESC'}`);
    console.log(`  Image:  ${a.image ? a.image.substring(0, 90) : 'NO IMAGE'}`);
    console.log(`  Author: ${a.author || 'N/A'}  |  Category: ${a.category || a.feedCategory}`);
  }

  // Oldest articles (stale data check)
  const stale = allArticles
    .filter(a => a.date && !isNaN(a.date))
    .sort((a, b) => a.date - b.date)
    .slice(0, 5);

  console.log('\n--- 5 Oldest Articles (stale check) ---');
  for (const a of stale) {
    console.log(`  [${ageLabel(a.date)}] ${a.source} — ${a.title?.substring(0, 80)}`);
  }

})();
