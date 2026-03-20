import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import { NewsCard, NewsCardSkeleton } from '../components/news/NewsCard';
import { Input } from '../components/ui/input';
import { Search, ChevronLeft } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, isHindi } = useLanguage();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      searchArticles(q);
    }
  }, [searchParams]);

  const searchArticles = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${API}/public/articles`, {
        params: { search: searchQuery, limit: 50 }
      });
      setArticles(response.data);
    } catch (error) {
      console.error('Error searching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query });
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6]" data-testid="search-page">
      {/* Search Header */}
      <div className="bg-[#b91c1c] py-12">
        <div className="max-w-3xl mx-auto px-4">
          <Link 
            to="/"
            className="inline-flex items-center gap-1 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className={isHindi ? 'font-hindi' : ''}>{isHindi ? 'वापस' : 'Back'}</span>
          </Link>
          
          <h1 className={`text-3xl font-bold text-white mb-6 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
            {isHindi ? 'समाचार खोजें' : 'Search News'}
          </h1>
          
          <form onSubmit={handleSearch} className="relative">
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search')}
              className="w-full pl-12 pr-4 py-6 text-lg rounded-sm border-0 focus:ring-2 focus:ring-[#f4c430]"
              data-testid="search-input"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </form>
        </div>
      </div>

      {/* Search Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {searchParams.get('q') && (
          <p className={`text-gray-600 mb-6 ${isHindi ? 'font-hindi' : ''}`}>
            {isHindi 
              ? `"${searchParams.get('q')}" के लिए ${articles.length} परिणाम`
              : `${articles.length} results for "${searchParams.get('q')}"`
            }
          </p>
        )}

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
        ) : searchParams.get('q') ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className={`text-gray-500 text-lg ${isHindi ? 'font-hindi' : ''}`}>
              {isHindi 
                ? 'कोई परिणाम नहीं मिला'
                : 'No results found'
              }
            </p>
            <p className={`text-gray-400 mt-2 ${isHindi ? 'font-hindi' : ''}`}>
              {isHindi 
                ? 'कृपया अलग खोज शब्द आज़माएं'
                : 'Try different search terms'
              }
            </p>
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className={`text-gray-500 text-lg ${isHindi ? 'font-hindi' : ''}`}>
              {isHindi 
                ? 'समाचार खोजने के लिए ऊपर टाइप करें'
                : 'Type above to search for news'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
