const axios = require('axios');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

// Fetch a real article URL from each RSS feed
const rssFeeds = [
  { source: 'Amar Ujala',     url: 'https://www.amarujala.com/rss/breaking-news.xml?client=android&client_new=au_revamp' },
  { source: 'India TV',       url: 'https://www.indiatv.in/rssnews/topstory-uttar-pradesh.xml' },
  { source: 'Dainik Bhaskar', url: 'https://www.bhaskar.com/rss-v1--category-2052.xml' },
  { source: 'Live Hindustan', url: 'https://feed.livehindustan.com/rss/3127' },
  { source: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeeds/8021716.cms' },
  { source: 'Hindustan Times',url: 'https://www.hindustantimes.com/feeds/rss/cities/lucknow-news/rssfeed.xml' },
  { source: 'The Hindu',      url: 'https://www.thehindu.com/news/national/feeder/default.rss' },
];

function extractTag(tag, content) {
  const cdata = new RegExp('<' + tag + '[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/' + tag + '>', 'i');
  const normal = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  let m = content.match(cdata) || content.match(normal);
  return m ? m[1].trim() : null;
}

async function getRealArticleUrl(rssFeed) {
  const res = await axios.get(rssFeed, {
    timeout: 8000,
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
  });
  const items = res.data.match(/<item>([\s\S]*?)<\/item>/g) || [];
  const link = extractTag('link', items[2] || items[0]); // pick 3rd item to vary
  return link;
}

async function scrapeArticle(source, articleUrl) {
  const res = await axios.get(articleUrl, {
    timeout: 12000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'hi-IN,hi;q=0.9,en;q=0.8',
    },
    maxRedirects: 5,
  });

  const dom = new JSDOM(res.data, { url: articleUrl });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  return article;
}

(async () => {
  for (const feed of rssFeeds) {
    console.log(`\n${'='.repeat(65)}`);
    console.log(`SOURCE: ${feed.source}`);
    console.log('='.repeat(65));
    try {
      const articleUrl = await getRealArticleUrl(feed.url);
      console.log(`URL: ${articleUrl?.substring(0, 100)}`);

      if (!articleUrl) { console.log('❌ No URL found in RSS'); continue; }

      const article = await scrapeArticle(feed.source, articleUrl);

      if (!article) {
        console.log('❌ Readability could not parse article');
        continue;
      }

      const textContent = article.textContent?.replace(/\s+/g, ' ').trim();
      const imgMatch = article.content?.match(/src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);

      console.log(`✅ title:       ${article.title?.substring(0, 100)}`);
      console.log(`   byline:     ${article.byline || 'N/A'}`);
      console.log(`   siteName:   ${article.siteName || 'N/A'}`);
      console.log(`   excerpt:    ${article.excerpt?.substring(0, 120) || 'N/A'}`);
      console.log(`   text len:   ${textContent?.length || 0} chars`);
      console.log(`   text:       ${textContent?.substring(0, 250)}...`);
      console.log(`   image:      ${imgMatch ? imgMatch[1].substring(0, 120) : 'NOT FOUND'}`);

    } catch (e) {
      console.log(`❌ FAILED: ${e.response?.status || e.code || e.message.substring(0, 80)}`);
    }
  }
})();
