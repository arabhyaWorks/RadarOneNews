import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { cachedGet } from '../lib/apiCache';
import { useLanguage } from '../contexts/LanguageContext';
import { NewsCard, NewsCardSkeleton } from '../components/news/NewsCard';
import { ChevronLeft } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const categoryImages = {
  sports: 'https://images.unsplash.com/photo-1730739463889-34c7279277a9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2ODh8MHwxfHNlYXJjaHwzfHxjcmlja2V0JTIwbWF0Y2glMjBpbmRpYSUyMHN0YWRpdW18ZW58MHx8fHwxNzczOTEzMTcyfDA&ixlib=rb-4.1.0&q=85',
  politics: 'https://images.unsplash.com/photo-1760872645826-ff7a32cd59bf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwzfHxpbmRpYW4lMjBwYXJsaWFtZW50JTIwYnVpbGRpbmd8ZW58MHx8fHwxNzczOTEzMTczfDA&ixlib=rb-4.1.0&q=85',
  entertainment: 'https://images.unsplash.com/photo-1614115866447-c9a299154650?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNDR8MHwxfHNlYXJjaHwxfHxib2xseXdvb2QlMjByZWQlMjBjYXJwZXQlMjBldmVudHxlbnwwfHx8fDE3NzM5MTMxODd8MA&ixlib=rb-4.1.0&q=85',
  business: 'https://images.unsplash.com/photo-1761818645943-a3689c34ca03?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHw0fHxtb2Rlcm4lMjBvZmZpY2UlMjBidXNpbmVzcyUyMG1lZXRpbmclMjBpbmRpYXxlbnwwfHx8fDE3NzM5MTMxODh8MA&ixlib=rb-4.1.0&q=85',
  technology: 'https://images.unsplash.com/photo-1680992044138-ce4864c2b962?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzZ8MHwxfHNlYXJjaHwzfHx0ZWNobm9sb2d5JTIwYWJzdHJhY3QlMjBzZXJ2ZXIlMjByb29tfGVufDB8fHx8MTc3MzkxMzE4OXww&ixlib=rb-4.1.0&q=85',
  crime: 'https://images.unsplash.com/photo-1758354973067-9c8811edcfd7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA4MTJ8MHwxfHNlYXJjaHwyfHxjcmltZSUyMHNjZW5lJTIwaW52ZXN0aWdhdGlvbiUyMHRhcGV8ZW58MHx8fHwxNzczOTEzMTkwfDA&ixlib=rb-4.1.0&q=85'
};

export default function CategoryPage() {
  const { category } = useParams();
  const { t, isHindi } = useLanguage();
  
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, [category]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await cachedGet(axios, `${API}/public/articles`, { params: { category, limit: 50 } }, 60_000);
      setArticles(response.data);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryName = t(category?.toLowerCase() || '');
  const categoryImage = categoryImages[category] || categoryImages.sports;

  return (
    <div className="min-h-screen bg-[#faf9f6]" data-testid="category-page">
      <Helmet>
        <title>{`${categoryName} ${isHindi ? 'समाचार' : 'News'} | Samachar Group`}</title>
        <meta name="description" content={isHindi ? `${categoryName} की नवीनतम खबरें और अपडेट।` : `Read the latest ${categoryName} news, updates, and analysis.`} />
        <meta property="og:title" content={`${categoryName} News | Samachar Group`} />
        {categoryImage && <meta property="og:image" content={categoryImage} />}
      </Helmet>

      {/* Hero Banner */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <img 
          src={categoryImage} 
          alt={categoryName}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/30" />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className={`text-4xl md:text-6xl font-bold text-white ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
              {categoryName}
            </h1>
            <p className="text-white/80 mt-2">
              {articles.length} {isHindi ? 'समाचार' : 'articles'}
            </p>
          </div>
        </div>

        {/* Back Link */}
        <Link 
          to="/"
          className="absolute top-4 left-4 flex items-center gap-1 text-white/80 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className={isHindi ? 'font-hindi' : ''}>{isHindi ? 'वापस' : 'Back'}</span>
        </Link>
      </div>

      {/* Articles Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <NewsCardSkeleton key={i} />
            ))}
          </div>
        ) : articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <NewsCard key={article.article_id} article={article} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className={`text-gray-500 text-lg ${isHindi ? 'font-hindi' : ''}`}>
              {isHindi 
                ? `${categoryName} में कोई समाचार नहीं है`
                : `No articles in ${categoryName} yet`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
