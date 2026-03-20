const fs = require('fs');
const path = require('path');

const BOT_AGENTS = /whatsapp|facebookexternalhit|twitterbot|telegrambot|slackbot|linkedinbot|discordbot|googlebot|bingbot|applebot|pinterest|vkshare/i;
const BACKEND = process.env.REACT_APP_API_URL || 'https://backend.radarone.in';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const articleId = req.query.id;

  // For bots: return static HTML with OG meta tags
  if (BOT_AGENTS.test(ua)) {
    try {
      const apiRes = await fetch(`${BACKEND}/api/public/articles/${articleId}`);
      const json = await apiRes.json();
      const article = json.data || json;

      const title = escapeHtml(article.title || 'RadarOne News');
      const description = escapeHtml(
        (article.content || '').replace(/<[^>]+>/g, '').slice(0, 200)
      );
      const image = escapeHtml(article.image_url || '');
      const url = escapeHtml(`https://radarone.in/article/${articleId}`);

      return res.setHeader('Content-Type', 'text/html').send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <meta name="description" content="${description}"/>
  <meta property="og:type" content="article"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${description}"/>
  <meta property="og:url" content="${url}"/>
  ${image ? `<meta property="og:image" content="${image}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>` : ''}
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${title}"/>
  <meta name="twitter:description" content="${description}"/>
  ${image ? `<meta name="twitter:image" content="${image}"/>` : ''}
</head>
<body><p><a href="${url}">${title}</a></p></body>
</html>`);
    } catch (e) {
      // fall through to serve index.html
    }
  }

  // For regular users: serve the React app
  const indexPath = path.join(process.cwd(), 'build', 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
};
