/**
 * seed.js — Populate the database with initial users and sample articles.
 *
 * Users created:
 *   admin@samachar.com   / admin123    (role: admin)
 *   reporter@samachar.com / reporter123 (role: reporter)
 *
 * Articles created: 6 sample articles across different categories.
 *
 * Usage:
 *   node seed.js
 */

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool, initDB } = require('./db');

// ============== HELPERS ==============

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function makeUserId() {
  return `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
}

function makeArticleId() {
  return `article_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
}

// ============== SEED DATA ==============

const USERS = [
  {
    email: 'admin@samachar.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
  },
  {
    email: 'reporter@samachar.com',
    password: 'reporter123',
    name: 'Reporter User',
    role: 'reporter',
  },
];

// Articles are seeded after users so we can reference their IDs.
function buildArticles(adminId, adminName, reporterId, reporterName) {
  const now = new Date();

  const daysAgo = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d;
  };

  return [
    {
      article_id: makeArticleId(),
      title: 'India Wins Historic Cricket Series Against Australia',
      title_hi: 'भारत ने ऑस्ट्रेलिया के खिलाफ ऐतिहासिक क्रिकेट श्रृंखला जीती',
      content:
        'In a thrilling final match held at the Melbourne Cricket Ground, the Indian cricket team clinched a historic series victory against Australia. Captain Rohit Sharma led from the front with a brilliant century, while Jasprit Bumrah took five wickets in the deciding game. The win marks India\'s first series victory in Australia in over two decades, sending fans across the country into celebration. The team\'s performance throughout the tour was exceptional, with consistent batting and disciplined bowling on Australian pitches known for their pace and bounce.',
      content_hi:
        'मेलबर्न क्रिकेट ग्राउंड में खेले गए रोमांचक अंतिम मैच में भारतीय क्रिकेट टीम ने ऑस्ट्रेलिया के खिलाफ ऐतिहासिक श्रृंखला जीत हासिल की। कप्तान रोहित शर्मा ने शानदार शतक लगाकर टीम का नेतृत्व किया, जबकि जसप्रीत बुमराह ने निर्णायक मैच में पांच विकेट लिए।',
      category: 'sports',
      image_url:
        'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800',
      is_featured: true,
      status: 'published',
      author_id: adminId,
      author_name: adminName,
      created_at: daysAgo(1),
      updated_at: daysAgo(1),
      views: 1245,
    },
    {
      article_id: makeArticleId(),
      title: 'Major Drug Trafficking Ring Busted in Mumbai',
      title_hi: 'मुंबई में बड़े ड्रग तस्करी गिरोह का भंडाफोड़',
      content:
        'Mumbai Police, in a joint operation with the Narcotics Control Bureau, dismantled one of the largest drug trafficking networks operating in Maharashtra. The operation, codenamed "Operation Clean Sweep", resulted in the arrest of 23 individuals including the alleged mastermind. Authorities seized drugs worth an estimated ₹450 crore from various locations across the city. The investigation revealed the network had international connections, with drugs being smuggled through sea routes from neighboring countries. Police say this is one of the biggest drug busts in the city\'s history.',
      content_hi:
        'मुंबई पुलिस ने नारकोटिक्स कंट्रोल ब्यूरो के साथ संयुक्त अभियान में महाराष्ट्र में संचालित सबसे बड़े ड्रग तस्करी नेटवर्क को ध्वस्त कर दिया। "ऑपरेशन क्लीन स्वीप" नाम के इस अभियान में कथित मास्टरमाइंड सहित 23 व्यक्तियों को गिरफ्तार किया गया।',
      category: 'crime',
      image_url:
        'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800',
      is_featured: false,
      status: 'published',
      author_id: reporterId,
      author_name: reporterName,
      created_at: daysAgo(2),
      updated_at: daysAgo(2),
      views: 892,
    },
    {
      article_id: makeArticleId(),
      title: 'Parliament Passes Landmark Digital Privacy Bill',
      title_hi: 'संसद ने ऐतिहासिक डिजिटल गोपनीयता विधेयक पास किया',
      content:
        'After months of debate and deliberation, Parliament today passed the landmark Digital Personal Data Protection Bill with a majority vote. The bill introduces comprehensive regulations for how companies collect, store, and use personal data of Indian citizens. Key provisions include mandatory consent requirements, strict penalties for data breaches, and the establishment of a Data Protection Board to oversee compliance. Technology companies will now have 18 months to comply with the new regulations. Opposition parties have raised concerns about certain provisions they say could enable government surveillance, while the ruling party maintains the bill strikes the right balance between privacy and security.',
      content_hi:
        'महीनों की बहस और विचार-विमर्श के बाद, संसद ने आज बहुमत से ऐतिहासिक डिजिटल व्यक्तिगत डेटा संरक्षण विधेयक पारित किया। इस विधेयक में कंपनियों द्वारा भारतीय नागरिकों के व्यक्तिगत डेटा को एकत्र करने, संग्रहीत करने और उपयोग करने के तरीके के लिए व्यापक नियम पेश किए गए हैं।',
      category: 'politics',
      image_url:
        'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800',
      is_featured: true,
      status: 'published',
      author_id: adminId,
      author_name: adminName,
      created_at: daysAgo(3),
      updated_at: daysAgo(3),
      views: 2100,
    },
    {
      article_id: makeArticleId(),
      title: 'Bollywood Blockbuster Breaks All Box Office Records',
      title_hi: 'बॉलीवुड ब्लॉकबस्टर ने सभी बॉक्स ऑफिस रिकॉर्ड तोड़े',
      content:
        'The much-anticipated action thriller "Bharat Ki Shan" has shattered every box office record in its opening weekend, collecting ₹350 crore domestically and over ₹200 crore internationally. Directed by acclaimed filmmaker Rajkumar Hirani and starring Ranveer Singh alongside newcomer Kiara Sharma, the film has received overwhelming praise from both critics and audiences. The film\'s spectacular action sequences and emotional storyline set against the backdrop of the Indian independence movement have resonated deeply with viewers across all age groups. Trade analysts are predicting it will become the highest-grossing Bollywood film of all time within the next two weeks.',
      content_hi:
        'बहुप्रतीक्षित एक्शन थ्रिलर "भारत की शान" ने अपने उद्घाटन सप्ताहांत में हर बॉक्स ऑफिस रिकॉर्ड तोड़ दिया है, जिसमें घरेलू स्तर पर ₹350 करोड़ और अंतरराष्ट्रीय स्तर पर ₹200 करोड़ से अधिक की कमाई हुई।',
      category: 'entertainment',
      image_url:
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
      is_featured: false,
      status: 'published',
      author_id: reporterId,
      author_name: reporterName,
      created_at: daysAgo(4),
      updated_at: daysAgo(4),
      views: 3450,
    },
    {
      article_id: makeArticleId(),
      title: 'Sensex Crosses 80,000 Mark for First Time in History',
      title_hi: 'सेंसेक्स पहली बार ऐतिहासिक 80,000 अंक के पार',
      content:
        'In a landmark moment for Indian financial markets, the BSE Sensex crossed the 80,000 mark for the first time in history on Thursday. The milestone was driven by strong buying in IT, banking, and pharmaceutical sectors, along with positive global cues. Foreign institutional investors pumped in ₹8,500 crore into Indian equities on the day, reflecting growing confidence in the country\'s economic trajectory. Market experts attribute the rally to India\'s robust GDP growth, political stability, and the government\'s infrastructure push. The Nifty 50 index also hit a record high of 24,200. Analysts caution that while the fundamentals remain strong, investors should be prepared for short-term volatility.',
      content_hi:
        'भारतीय वित्तीय बाजारों के लिए एक ऐतिहासिक क्षण में, बीएसई सेंसेक्स गुरुवार को पहली बार इतिहास में 80,000 अंक के पार चला गया। यह मील का पत्थर आईटी, बैंकिंग और फार्मास्युटिकल क्षेत्रों में मजबूत खरीदारी और सकारात्मक वैश्विक संकेतों से प्रेरित था।',
      category: 'business',
      image_url:
        'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
      is_featured: true,
      status: 'published',
      author_id: adminId,
      author_name: adminName,
      created_at: daysAgo(5),
      updated_at: daysAgo(5),
      views: 1876,
    },
    {
      article_id: makeArticleId(),
      title: 'ISRO Successfully Launches Next-Gen Communication Satellite',
      title_hi: 'इसरो ने अगली पीढ़ी के संचार उपग्रह का सफल प्रक्षेपण किया',
      content:
        'The Indian Space Research Organisation (ISRO) successfully launched its next-generation communication satellite, GSAT-30, from the Satish Dhawan Space Centre in Sriharikota. The satellite, weighing 3,357 kg, was placed precisely in its intended geostationary orbit after a flawless launch. GSAT-30 will provide high-quality telecommunications services, broadcasting, and broadband connectivity to the Indian subcontinent and surrounding regions. The mission is particularly significant as it demonstrates ISRO\'s capability in launching heavy satellites using the indigenous GSLV Mark III rocket. The satellite has a design life of 15 years and will enhance India\'s self-reliance in the communication satellite domain. Scientists and engineers at ISRO celebrated the successful mission, which marks another milestone in India\'s ambitious space program.',
      content_hi:
        'भारतीय अंतरिक्ष अनुसंधान संगठन (इसरो) ने श्रीहरिकोटा के सतीश धवन अंतरिक्ष केंद्र से अपने अगली पीढ़ी के संचार उपग्रह जीसैट-30 का सफलतापूर्वक प्रक्षेपण किया।',
      category: 'technology',
      image_url:
        'https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=800',
      is_featured: false,
      status: 'published',
      author_id: reporterId,
      author_name: reporterName,
      created_at: daysAgo(6),
      updated_at: daysAgo(6),
      views: 987,
    },
  ];
}

// ============== SEED FUNCTION ==============

async function seed() {
  try {
    console.log('[seed] Initialising database...');
    await initDB();

    // ---- USERS ----
    const createdUsers = {};

    for (const userData of USERS) {
      const [existing] = await pool.query(
        'SELECT user_id, name, role FROM users WHERE email = ? LIMIT 1',
        [userData.email]
      );

      if (existing.length > 0) {
        console.log(
          `[seed] User already exists: ${userData.email} (${existing[0].user_id})`
        );
        createdUsers[userData.role] = {
          user_id: existing[0].user_id,
          name: existing[0].name,
        };
      } else {
        const userId = makeUserId();
        const hashedPassword = hashPassword(userData.password);
        const now = new Date();

        await pool.query(
          `INSERT INTO users (user_id, email, name, password, role, status, picture, created_at)
           VALUES (?, ?, ?, ?, ?, 'approved', NULL, ?)`,
          [userId, userData.email, userData.name, hashedPassword, userData.role, now]
        );

        console.log(
          `[seed] Created user: ${userData.email} (${userId}) role=${userData.role}`
        );
        createdUsers[userData.role] = { user_id: userId, name: userData.name };
      }
    }

    const adminUser = createdUsers['admin'];
    const reporterUser = createdUsers['reporter'];

    // ---- ARTICLES ----
    const articles = buildArticles(
      adminUser.user_id,
      adminUser.name,
      reporterUser.user_id,
      reporterUser.name
    );

    let articlesInserted = 0;

    for (const article of articles) {
      const [existingArticle] = await pool.query(
        'SELECT article_id FROM articles WHERE title = ? LIMIT 1',
        [article.title]
      );

      if (existingArticle.length > 0) {
        console.log(`[seed] Article already exists: "${article.title}"`);
        continue;
      }

      await pool.query(
        `INSERT INTO articles
           (article_id, title, title_hi, content, content_hi, category, image_url,
            is_featured, status, author_id, author_name, created_at, updated_at, views)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          article.article_id,
          article.title,
          article.title_hi,
          article.content,
          article.content_hi,
          article.category,
          article.image_url,
          article.is_featured ? 1 : 0,
          article.status,
          article.author_id,
          article.author_name,
          article.created_at,
          article.updated_at,
          article.views,
        ]
      );

      console.log(
        `[seed] Created article: "${article.title}" (${article.article_id})`
      );
      articlesInserted++;
    }

    console.log(
      `\n[seed] Done. ${articlesInserted} article(s) inserted (${articles.length - articlesInserted} skipped as duplicates).`
    );
    console.log('\nCredentials:');
    console.log('  admin@samachar.com    / admin123');
    console.log('  reporter@samachar.com / reporter123');
  } catch (err) {
    console.error('[seed] Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
