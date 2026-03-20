const axios = require('axios');

const testFeeds = [
  { url: 'https://www.amarujala.com/rss/breaking-news.xml?client=android&client_new=au_revamp', source: 'Amar Ujala' },
  { url: 'https://hindi.news18.com/commonfeeds/v1/hin/rss/uttar-pradesh/uttar-pradesh.xml', source: 'News18 Hindi' },
  { url: 'https://www.indiatv.in/rssnews/topstory-uttar-pradesh.xml', source: 'India TV' },
  { url: 'https://www.bhaskar.com/rss-v1--category-2052.xml', source: 'Dainik Bhaskar' },
  { url: 'https://www.tv9hindi.com/feed', source: 'TV9 Hindi' },
  { url: 'https://feed.livehindustan.com/rss/3127', source: 'Live Hindustan' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/8021716.cms', source: 'Times of India' },
  { url: 'https://www.hindustantimes.com/feeds/rss/cities/lucknow-news/rssfeed.xml', source: 'Hindustan Times' },
  { url: 'https://www.thehindu.com/news/national/feeder/default.rss', source: 'The Hindu' },
];

function extract(tag, content) {
  const cdataPattern = new RegExp('<' + tag + '[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/' + tag + '>', 'i');
  const normalPattern = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  let m = content.match(cdataPattern);
  if (m) return m[1].trim();
  m = content.match(normalPattern);
  if (m) return m[1].trim();
  return null;
}

function extractAttr(tag, attr, content) {
  const pattern = new RegExp('<' + tag + '[^>]*\\s' + attr + '=["\']([^"\']+)["\']', 'i');
  const m = content.match(pattern);
  return m ? m[1] : null;
}

function extractImg(content) {
  const m = content.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/i);
  return m ? m[0] : null;
}

async function inspectFeed(feed) {
  try {
    const res = await axios.get(feed.url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': '*/*' }
    });
    const xml = res.data.toString();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    if (!items.length) {
      console.log('\n' + '='.repeat(60));
      console.log('SOURCE:', feed.source, '— NO ITEMS FOUND');
      return;
    }

    const item = items[0];

    const title       = extract('title', item);
    const link        = extract('link', item);
    const pubDate     = extract('pubDate', item);
    const description = extract('description', item);
    const content     = extract('content:encoded', item);
    const creator     = extract('dc:creator', item);
    const category    = extract('category', item);

    const enclosureUrl    = extractAttr('enclosure', 'url', item);
    const mediaContent    = extractAttr('media:content', 'url', item);
    const mediaThumbnail  = extractAttr('media:thumbnail', 'url', item);
    const imgInDesc       = description ? extractImg(description) : null;
    const imgInContent    = content ? extractImg(content) : null;

    // All XML tags present in this item
    const tags = [...new Set([...item.matchAll(/<([a-zA-Z][a-zA-Z0-9:]*)/g)].map(m => m[1]))];

    console.log('\n' + '='.repeat(60));
    console.log('SOURCE:', feed.source);
    console.log('='.repeat(60));
    console.log('title:            ', title ? title.substring(0, 100) : 'MISSING');
    console.log('link:             ', link ? link.substring(0, 100) : 'MISSING');
    console.log('pubDate:          ', pubDate || 'MISSING');
    console.log('description:      ', description ? description.replace(/<[^>]+>/g, '').substring(0, 120) : 'MISSING');
    console.log('content:encoded:  ', content ? 'YES (' + content.length + ' chars)' : 'NO');
    console.log('dc:creator:       ', creator || 'MISSING');
    console.log('category:         ', category || 'MISSING');
    console.log('--- IMAGES ---');
    console.log('enclosure url:    ', enclosureUrl || 'NO');
    console.log('media:content:    ', mediaContent || 'NO');
    console.log('media:thumbnail:  ', mediaThumbnail || 'NO');
    console.log('img in desc:      ', imgInDesc || 'NO');
    console.log('img in content:   ', imgInContent || 'NO');
    console.log('--- ALL TAGS:     ', tags.join(', '));

  } catch (e) {
    console.log('\nFAIL:', feed.source, '-', e.message);
  }
}

(async () => {
  for (const f of testFeeds) await inspectFeed(f);
})();
