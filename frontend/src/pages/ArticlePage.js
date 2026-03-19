import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { cachedGet } from '../lib/apiCache';
import { useLanguage } from '../contexts/LanguageContext';
import { format } from 'date-fns';
import { Eye, Clock, User, ChevronLeft, Share2, Flame, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { NewsCard } from '../components/news/NewsCard';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ArticlePage() {
  const { articleId } = useParams();
  const { t, isHindi } = useLanguage();

  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [popularArticles, setPopularArticles] = useState([]);
  const [latestArticles, setLatestArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticle();
    fetchPopular();
  }, [articleId]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/articles/${articleId}`);
      setArticle(response.data);

      const [relatedRes, latestRes] = await Promise.all([
        cachedGet(axios, `${API}/public/articles`, { params: { category: response.data.category, limit: 5 } }, 60_000),
        cachedGet(axios, `${API}/public/articles`, { params: { limit: 4 } }, 60_000),
      ]);

      setRelatedArticles(relatedRes.data.filter(a => a.article_id !== articleId));
      setLatestArticles(latestRes.data.filter(a => a.article_id !== articleId));
    } catch (error) {
      console.error('Error fetching article:', error);
      toast.error(isHindi ? 'लेख लोड करने में त्रुटि' : 'Error loading article');
    } finally {
      setLoading(false);
    }
  };

  const fetchPopular = async () => {
    try {
      const res = await cachedGet(axios, `${API}/public/articles`, { params: { limit: 50 } }, 60_000);
      const sorted = [...res.data]
        .sort((a, b) => b.views - a.views)
        .slice(0, 6);
      setPopularArticles(sorted);
    } catch (_) { }
  };

  const formatDate = (dateStr) => {
    try { return format(new Date(dateStr), 'MMMM dd, yyyy'); }
    catch { return dateStr; }
  };

  const formatDateShort = (dateStr) => {
    try { return format(new Date(dateStr), 'MMM dd, yyyy'); }
    catch { return dateStr; }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = isHindi && article.title_hi ? article.title_hi : article.title;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch (_) { }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(isHindi ? 'लिंक कॉपी हो गया!' : 'Link copied to clipboard!');
    }
  };

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#2a5a5a] rounded-full flex items-center justify-center">
            <div className="w-8 h-8 bg-[#f4c430] rounded-full" />
          </div>
          <p className="text-gray-600">{isHindi ? 'लोड हो रहा है...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (!article) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <div className="text-center">
          <h2 className={`text-2xl font-bold text-gray-900 mb-4 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
            {isHindi ? 'लेख नहीं मिला' : 'Article not found'}
          </h2>
          <Link to="/">
            <Button className="bg-[#2a5a5a] hover:bg-[#1f4444] text-white">
              {isHindi ? 'होम पर जाएं' : 'Go to Home'}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const title = isHindi && article.title_hi ? article.title_hi : article.title;
  const content = isHindi && article.content_hi ? article.content_hi : article.content;
  const categoryName = t(article.category.toLowerCase());

  // Create a plain text summary for SEO description
  const plainTextContent = content ? content.replace(/<[^>]+>/g, '') : '';
  const seoDescription = plainTextContent.substring(0, 160) + (plainTextContent.length > 160 ? '...' : '');

  return (
    <div className="min-h-screen bg-[#faf9f6]" data-testid="article-page">
      <Helmet>
        <title>{`${title} | ${isHindi ? 'समाचार ग्रुप' : 'Samachar Group'}`}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="article" />
        {article.image_url && <meta property="og:image" content={article.image_url} />}
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* Hero Image */}
      {article.image_url && (
        <div className="relative h-[40vh] md:h-[55vh] overflow-hidden">
          <img src={article.image_url} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute top-4 left-4">
            <Link to="/">
              <Button variant="ghost" className="bg-white/90 hover:bg-white text-gray-900" data-testid="back-to-home">
                <ChevronLeft className="w-5 h-5 mr-1" />
                {isHindi ? 'वापस' : 'Back'}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* ── LEFT: Article ── */}
          <article className="flex-1 min-w-0">

            {/* Category & badge */}
            <div className="flex items-center gap-3 mb-4">
              <Link
                to={`/category/${article.category}`}
                className={`category-pill hover:bg-[#f4c430] hover:text-[#2a5a5a] ${isHindi ? 'font-hindi' : ''}`}
              >
                {categoryName}
              </Link>
              {article.is_featured && (
                <span className="featured-badge">{t('featured')}</span>
              )}
            </div>

            {/* Title */}
            <h1 className={`text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-6 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
              {title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-gray-600 pb-6 border-b border-gray-200 mb-8">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <Link to={`/author/${article.author_id}`} className={`hover:text-[#2a5a5a] transition-colors ${isHindi ? 'font-hindi' : ''}`}>
                  {t('by')} {article.author_name}
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{formatDate(article.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span>{article.views} {t('views')}</span>
              </div>
              <Button
                variant="ghost" size="sm"
                onClick={handleShare}
                className="ml-auto text-[#2a5a5a] hover:text-[#f4c430]"
                data-testid="share-btn"
              >
                <Share2 className="w-4 h-4 mr-2" />
                {isHindi ? 'शेयर करें' : 'Share'}
              </Button>
            </div>

            {/* Body */}
            <div
              className={`article-content ${isHindi ? 'font-hindi' : ''}`}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </article>

          {/* ── RIGHT: Popular Sidebar ── */}
          <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <div className="sticky top-6">

              {/* Header */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-[#2a5a5a]">
                <Flame className="w-5 h-5 text-orange-500" />
                <h2 className={`text-lg font-bold text-[#2a5a5a] ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
                  {isHindi ? 'लोकप्रिय खबरें' : 'Popular News'}
                </h2>
              </div>

              {/* Popular list */}
              <div className="space-y-4">
                {popularArticles
                  .filter(a => a.article_id !== articleId)
                  .slice(0, 6)
                  .map((pop, idx) => {
                    const popTitle = isHindi && pop.title_hi ? pop.title_hi : pop.title;
                    return (
                      <Link
                        key={pop.article_id}
                        to={`/article/${pop.article_id}`}
                        className="group flex gap-3 items-start p-3 bg-white border border-gray-100 hover:border-[#2a5a5a]/30 hover:shadow-sm transition-all rounded-sm"
                      >
                        {/* Thumb */}
                        {pop.image_url ? (
                          <div className="w-24 h-16 flex-shrink-0 overflow-hidden rounded-sm">
                            <img src={pop.image_url} alt={popTitle}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                        ) : (
                          <div className="w-24 h-16 flex-shrink-0 rounded-sm bg-gradient-to-br from-[#2a5a5a] to-[#1a3a3a]" />
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-[#2a5a5a] transition-colors mb-1 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
                            {popTitle}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1 text-orange-500 font-semibold">
                              <Eye className="w-3 h-3" />
                              {pop.views.toLocaleString()}
                            </span>
                            <span>•</span>
                            <span>{formatDateShort(pop.created_at)}</span>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-[#2a5a5a] mt-1 transition-colors" />
                      </Link>
                    );
                  })}
              </div>

              {/* CTA */}
              <Link to="/"
                className="mt-5 flex items-center justify-center gap-2 w-full py-2.5 border border-[#2a5a5a] text-[#2a5a5a] text-sm font-semibold hover:bg-[#2a5a5a] hover:text-white transition-colors rounded-sm">
                {isHindi ? 'सभी खबरें देखें' : 'View All News'}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </aside>

        </div>
      </div>



      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12 border-t border-gray-200">
          <h2 className={`text-2xl md:text-3xl font-bold text-[#2a5a5a] mb-8 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
            {isHindi ? 'संबंधित समाचार' : 'Related News'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedArticles.slice(0, 3).map((a) => (
              <NewsCard key={a.article_id} article={a} />
            ))}
          </div>
        </section>
      )}

      {/* Latest News */}
      {latestArticles.length > 0 && (
        <section className="bg-gray-50 border-t border-gray-200 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className={`text-2xl md:text-3xl font-bold text-[#2a5a5a] mb-8 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
              {isHindi ? 'ताज़ा खबरें' : 'Latest News'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {latestArticles.slice(0, 4).map((a) => (
                <NewsCard key={a.article_id} article={a} variant="default" />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
