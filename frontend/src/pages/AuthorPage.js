import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import { NewsCard, NewsCardSkeleton } from '../components/news/NewsCard';
import { ChevronLeft, User } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthorPage() {
  const { authorId } = useParams();
  const { t, isHindi } = useLanguage();
  
  const [author, setAuthor] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuthorDetails();
    fetchAuthorArticles();
  }, [authorId]);

  const fetchAuthorDetails = async () => {
    try {
      const response = await axios.get(`${API}/public/authors/${authorId}`);
      setAuthor(response.data);
    } catch (error) {
      console.error('Error fetching author details:', error);
    }
  };

  const fetchAuthorArticles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/public/articles`, {
        params: { author_id: authorId, limit: 50 }
      });
      setArticles(response.data);
    } catch (error) {
      console.error('Error fetching author articles:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6]" data-testid="author-page">
      {/* Hero Banner */}
      <div className="relative h-48 md:h-64 overflow-hidden bg-gradient-to-r from-[#2a5a5a] to-[#1a3a3a]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center flex flex-col items-center">
            {author?.picture ? (
              <img 
                src={author.picture} 
                alt={author?.name} 
                className="w-24 h-24 rounded-full border-4 border-white mb-4 object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-white mb-4 bg-gray-200 flex items-center justify-center text-gray-400">
                <User className="w-12 h-12" />
              </div>
            )}
            <h1 className="text-3xl md:text-5xl font-bold text-white font-heading">
              {author?.name || 'Reporter'}
            </h1>
            <p className="text-white/80 mt-2">
              {articles.length} {isHindi ? 'प्रकाशित समाचार' : 'Articles Published'}
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
        <h2 className={`text-2xl font-bold text-[#2a5a5a] mb-6 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
          {isHindi ? 'इनके द्वारा लिखे गए लेख' : 'Articles by'} {author?.name}
        </h2>
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
                ? 'अभी तक कोई लेख प्रकाशित नहीं हुआ है'
                : 'No articles published yet'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
