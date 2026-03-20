import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { format } from 'date-fns';
import { Eye, Clock } from 'lucide-react';

export const NewsCard = ({ article, variant = 'default' }) => {
  const { t, isHindi, language } = useLanguage();

  const title = isHindi && article.title_hi ? article.title_hi : article.title;
  const categoryName = t(article.category.toLowerCase());

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  // Strip HTML tags for preview
  const getPlainText = (html) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const content = isHindi && article.content_hi ? article.content_hi : article.content;
  const plainContent = getPlainText(content);

  if (variant === 'hero') {
    return (
      <Link 
        to={`/article/${article.article_id}`}
        className="bento-hero relative overflow-hidden group"
        data-testid={`news-card-hero-${article.article_id}`}
      >
        <div className="absolute inset-0">
          {article.image_url ? (
            <img 
              src={article.image_url} 
              alt={title}
              className="w-full h-full object-cover news-card-image"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#b91c1c] to-[#7f1d1d]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          {article.is_featured && (
            <span className="featured-badge inline-block mb-3" data-testid="featured-badge">
              {t('featured')}
            </span>
          )}
          <span className={`category-pill mb-3 inline-block ml-2 ${isHindi ? 'font-hindi' : ''}`}>
            {categoryName}
          </span>
          <h2 className={`text-2xl md:text-4xl font-bold text-white leading-tight mb-4 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
            {title}
          </h2>
          <p className="text-white/80 text-sm md:text-base line-clamp-2 mb-4 max-w-2xl">
            {plainContent}
          </p>
          <div className="flex items-center gap-4 text-white/60 text-sm">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDate(article.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {article.views} {t('views')}
            </span>
            <span>{t('by')} {article.author_name}</span>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'sub') {
    return (
      <Link 
        to={`/article/${article.article_id}`}
        className="bento-sub relative overflow-hidden group"
        data-testid={`news-card-sub-${article.article_id}`}
      >
        <div className="absolute inset-0">
          {article.image_url ? (
            <img 
              src={article.image_url} 
              alt={title}
              className="w-full h-full object-cover news-card-image"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#b91c1c] to-[#7f1d1d]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <span className={`category-pill mb-2 inline-block ${isHindi ? 'font-hindi' : ''}`}>
            {categoryName}
          </span>
          <h3 className={`text-lg font-bold text-white leading-tight line-clamp-2 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
            {title}
          </h3>
          <p className="text-white/60 text-xs mt-2">
            {formatDate(article.created_at)}
          </p>
        </div>
      </Link>
    );
  }

  // Default card
  return (
    <Link 
      to={`/article/${article.article_id}`}
      className="news-card block bg-white border border-gray-200 overflow-hidden group hover-lift"
      data-testid={`news-card-${article.article_id}`}
    >
      {article.image_url && (
        <div className="aspect-video overflow-hidden">
          <img 
            src={article.image_url} 
            alt={title}
            className="w-full h-full object-cover news-card-image"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className={`category-pill ${isHindi ? 'font-hindi' : ''}`}>
            {categoryName}
          </span>
          {article.is_featured && (
            <span className="featured-badge" data-testid="featured-badge">
              {t('featured')}
            </span>
          )}
        </div>
        <h3 className={`text-xl font-bold text-gray-900 leading-tight line-clamp-2 mb-2 group-hover:text-[#b91c1c] transition-colors ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
          {title}
        </h3>
        <p className={`text-gray-600 text-sm line-clamp-3 mb-4 ${isHindi ? 'font-hindi' : ''}`}>
          {plainContent}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{t('by')} {article.author_name}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {article.views}
            </span>
            <span>{formatDate(article.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export const NewsCardSkeleton = () => {
  return (
    <div className="bg-white border border-gray-200 overflow-hidden animate-pulse">
      <div className="aspect-video bg-gray-200" />
      <div className="p-4">
        <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
        <div className="h-6 bg-gray-200 rounded mb-2" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
        <div className="flex justify-between">
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  );
};
