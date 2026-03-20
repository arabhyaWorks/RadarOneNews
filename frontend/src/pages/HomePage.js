import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { cachedGet } from '../lib/apiCache';
import { useLanguage } from '../contexts/LanguageContext';
import { NewsCard, NewsCardSkeleton } from '../components/news/NewsCard';
import { ChevronRight, Flame, Eye } from 'lucide-react';
import branding from '../config/branding';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const categoryImages = {
  sports: 'https://images.unsplash.com/photo-1730739463889-34c7279277a9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2ODh8MHwxfHNlYXJjaHwzfHxjcmlja2V0JTIwbWF0Y2glMjBpbmRpYSUyMHN0YWRpdW18ZW58MHx8fHwxNzczOTEzMTcyfDA&ixlib=rb-4.1.0&q=85',
  politics: 'https://images.unsplash.com/photo-1760872645826-ff7a32cd59bf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwzfHxpbmRpYW4lMjBwYXJsaWFtZW50JTIwYnVpbGRpbmd8ZW58MHx8fHwxNzczOTEzMTczfDA&ixlib=rb-4.1.0&q=85',
  entertainment: 'https://images.unsplash.com/photo-1614115866447-c9a299154650?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNDR8MHwxfHNlYXJjaHwxfHxib2xseXdvb2QlMjByZWQlMjBjYXJwZXQlMjBldmVudHxlbnwwfHx8fDE3NzM5MTMxODd8MA&ixlib=rb-4.1.0&q=85',
  business: 'https://images.unsplash.com/photo-1761818645943-a3689c34ca03?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHw0fHxtb2Rlcm4lMjBvZmZpY2UlMjBidXNpbmVzcyUyMG1lZXRpbmclMjBpbmRpYXxlbnwwfHx8fDE3NzM5MTMxODh8MA&ixlib=rb-4.1.0&q=85',
  technology: 'https://images.unsplash.com/photo-1680992044138-ce4864c2b962?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzZ8MHwxfHNlYXJjaHwzfHx0ZWNobm9sb2d5JTIwYWJzdHJhY3QlMjBzZXJ2ZXIlMjByb29tfGVufDB8fHx8MTc3MzkxMzE4OXww&ixlib=rb-4.1.0&q=85',
  crime: 'https://images.unsplash.com/photo-1758354973067-9c8811edcfd7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA4MTJ8MHwxfHNlYXJjaHwyfHxjcmltZSUyMHNjZW5lJTIwaW52ZXN0aWdhdGlvbiUyMHRhcGV8ZW58MHx8fHwxNzczOTEzMTkwfDA&ixlib=rb-4.1.0&q=85'
};

export default function HomePage() {
  const { t, isHindi } = useLanguage();
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const [latestArticles, setLatestArticles] = useState([]);
  const [latestSkip, setLatestSkip] = useState(0);
  const [latestHasMore, setLatestHasMore] = useState(true);
  const [latestLoadingMore, setLatestLoadingMore] = useState(false);
  const [popularArticles, setPopularArticles] = useState([]);
  const [categoryArticles, setCategoryArticles] = useState({});
  const [loading, setLoading] = useState(true);

  const categories = ['sports', 'crime', 'politics', 'entertainment', 'business', 'technology'];

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);

      const TTL = 60_000; // 60s — matches backend TTL

      // Fetch featured articles
      const featuredRes = await cachedGet(axios, `${API}/public/articles`, { params: { featured: 'true', limit: 4 } }, TTL);
      setFeaturedArticles(featuredRes.data);

      // Fetch latest articles
      const latestRes = await cachedGet(axios, `${API}/public/articles`, { params: { limit: 12 } }, TTL);
      const latestData = latestRes.data.data || latestRes.data;
      setLatestArticles(latestData);
      setLatestSkip(latestData.length);
      setLatestHasMore(latestData.length === 12);

      // Fetch popular articles (top by views)
      const popularRes = await cachedGet(axios, `${API}/public/articles`, { params: { limit: 50 } }, TTL);
      const sorted = [...popularRes.data]
        .filter(a => a.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);
      setPopularArticles(sorted);

      // Fetch articles by category
      const categoryPromises = categories.map(cat =>
        cachedGet(axios, `${API}/public/articles`, { params: { category: cat, limit: 4 } }, TTL)
      );
      const categoryResults = await Promise.all(categoryPromises);
      
      const catArticles = {};
      categories.forEach((cat, index) => {
        catArticles[cat] = categoryResults[index].data;
      });
      setCategoryArticles(catArticles);

    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreLatest = async () => {
    try {
      setLatestLoadingMore(true);
      const res = await axios.get(`${API}/public/articles`, { params: { limit: 12, skip: latestSkip } });
      const newData = res.data.data || res.data;
      setLatestArticles(prev => [...prev, ...newData]);
      setLatestSkip(prev => prev + newData.length);
      setLatestHasMore(newData.length === 12);
    } catch (e) {
      console.error(e);
    } finally {
      setLatestLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6]" data-testid="home-page">
      <Helmet>
        <title>{isHindi ? `${branding.nameHi} | ${branding.taglineHi}` : `${branding.name} | ${branding.tagline}`}</title>
        <meta name="description" content={isHindi ? `${branding.nameHi} - ${branding.descriptionHi}` : `${branding.name} - ${branding.description}`} />
        <meta property="og:title" content={`${branding.name} | ${branding.tagline}`} />
        <meta property="og:description" content="Latest breaking news and updates across sports, politics, entertainment, business, and technology." />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Featured Section - Bento Grid */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="section-divider mb-8">
          <h2 className={`text-3xl md:text-4xl font-bold text-[#b91c1c] ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
            {t('featured')}
          </h2>
        </div>

        {loading ? (
          <div className="bento-grid">
            <div className="bento-hero bg-gray-200 animate-pulse rounded" />
            <div className="bento-sub bg-gray-200 animate-pulse rounded" />
            <div className="bento-sub bg-gray-200 animate-pulse rounded" />
          </div>
        ) : featuredArticles.length > 0 ? (
          <div className="bento-grid">
            {featuredArticles[0] && (
              <NewsCard article={featuredArticles[0]} variant="hero" />
            )}
            {featuredArticles.slice(1, 3).map((article) => (
              <NewsCard key={article.article_id} article={article} variant="sub" />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <p className={isHindi ? 'font-hindi' : ''}>
              {isHindi ? 'अभी कोई फीचर्ड समाचार नहीं है' : 'No featured news yet'}
            </p>
          </div>
        )}
      </section>

      {/* Latest News Section */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="section-divider mb-8">
          <h2 className={`text-3xl md:text-4xl font-bold text-[#b91c1c] ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
            {t('latest')}
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <NewsCardSkeleton key={i} />
            ))}
          </div>
        ) : latestArticles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestArticles.map((article) => (
                <NewsCard key={article.article_id} article={article} />
              ))}
            </div>
            {latestHasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={loadMoreLatest}
                  disabled={latestLoadingMore}
                  className="px-8 py-3 bg-[#b91c1c] text-white font-semibold rounded hover:bg-[#991b1b] transition-colors disabled:opacity-50"
                >
                  {latestLoadingMore
                    ? (isHindi ? 'लोड हो रहा है...' : 'Loading...')
                    : (isHindi ? 'और समाचार देखें' : 'Load More')}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <p className={isHindi ? 'font-hindi' : ''}>
              {isHindi ? 'अभी कोई समाचार नहीं है' : 'No news yet'}
            </p>
          </div>
        )}
      </section>

      {/* Popular News Section */}
      {(loading || popularArticles.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="section-divider mb-8 flex items-center gap-3">
            {/* <Flame className="w-7 h-7 text-orange-500" /> */}
            <h2 className={`text-3xl md:text-4xl font-bold text-[#b91c1c] ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
              {t('popular')}
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 bg-white border border-gray-200 p-4 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top article — large card on left spanning full height on desktop */}
              {popularArticles[0] && (
                <Link
                  to={`/article/${popularArticles[0].article_id}`}
                  className="group relative overflow-hidden bg-white border border-gray-200 hover-lift row-span-1 lg:row-span-3 flex flex-col"
                  style={{ gridRow: 'span 3' }}
                >
                  {popularArticles[0].image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={popularArticles[0].image_url}
                        alt={isHindi && popularArticles[0].title_hi ? popularArticles[0].title_hi : popularArticles[0].title}
                        className="w-full h-full object-cover news-card-image"
                      />
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white text-sm font-bold shrink-0">#1</span>
                      <span className={`category-pill ${isHindi ? 'font-hindi' : ''}`}>{t(popularArticles[0].category.toLowerCase())}</span>
                    </div>
                    <h3 className={`text-xl font-bold text-gray-900 leading-tight line-clamp-3 mb-3 group-hover:text-[#b91c1c] transition-colors ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
                      {isHindi && popularArticles[0].title_hi ? popularArticles[0].title_hi : popularArticles[0].title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-auto">
                      <span className="flex items-center gap-1 font-semibold text-orange-500">
                        <Eye className="w-3.5 h-3.5" />
                        {popularArticles[0].views.toLocaleString()} {t('views')}
                      </span>
                      <span>{t('by')} {popularArticles[0].author_name}</span>
                      <span>{format(new Date(popularArticles[0].created_at), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                </Link>
              )}

              {/* Ranks 2–5 — compact horizontal list */}
              <div className="flex flex-col gap-4">
                {popularArticles.slice(1).map((article, idx) => {
                  const artTitle = isHindi && article.title_hi ? article.title_hi : article.title;
                  return (
                    <Link
                      key={article.article_id}
                      to={`/article/${article.article_id}`}
                      className="group flex items-start gap-4 bg-white border border-gray-200 p-4 hover-lift transition-shadow"
                    >
                      {/* Thumbnail */}
                      {article.image_url ? (
                        <div className="w-32 h-20 overflow-hidden rounded shrink-0">
                          <img src={article.image_url} alt={artTitle} className="w-full h-full object-cover news-card-image" />
                        </div>
                      ) : (
                        <div className="w-32 h-20 rounded shrink-0 bg-gradient-to-br from-[#b91c1c] to-[#7f1d1d]" />
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <span className={`category-pill text-xs mb-1 inline-block ${isHindi ? 'font-hindi' : ''}`}>
                          {t(article.category.toLowerCase())}
                        </span>
                        <h4 className={`text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-[#b91c1c] transition-colors ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
                          {artTitle}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1 text-orange-500 font-semibold">
                            <Eye className="w-3 h-3" />
                            {article.views.toLocaleString()}
                          </span>
                          <span>•</span>
                          <span>{format(new Date(article.created_at), 'MMM dd')}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Category Sections */}
      {categories.map((category) => (
        <section key={category} className="max-w-7xl mx-auto px-4 py-8">
          <div className="section-divider mb-8 flex items-center justify-between">
            <h2 className={`text-2xl md:text-3xl font-bold text-[#b91c1c] ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
              {t(category)}
            </h2>
            <Link 
              to={`/category/${category}`}
              className="flex items-center gap-1 text-[#b91c1c] hover:text-[#f4c430] font-semibold text-sm uppercase tracking-wider transition-colors"
              data-testid={`view-all-${category}`}
            >
              {isHindi ? 'सभी देखें' : 'View All'}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <NewsCardSkeleton key={i} />
              ))}
            </div>
          ) : (categoryArticles[category] || []).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(categoryArticles[category] || []).map((article) => (
                <NewsCard key={article.article_id} article={article} />
              ))}
            </div>
          ) : (
            <div className="relative h-48 rounded overflow-hidden group">
              <img 
                src={categoryImages[category]} 
                alt={t(category)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <p className={`text-white text-lg ${isHindi ? 'font-hindi' : ''}`}>
                  {isHindi ? `${t(category)} में कोई समाचार नहीं` : `No ${t(category)} news yet`}
                </p>
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
