import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { FileText, Eye, Edit, Trash2, Plus, Send, Clock, XCircle, Star, Flame, Trophy } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DashboardPage() {
  const { user, token, refreshUser } = useAuth();
  const { t, isHindi } = useLanguage();
  const navigate = useNavigate();
  
  const [articles, setArticles] = useState([]);
  const [stats, setStats] = useState({ total: 0, published: 0, drafts: 0, views: 0 });
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    refreshUser();
    fetchArticles();
  }, [filter]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = { author_id: user?.user_id };
      if (filter !== 'all') {
        params.status = filter;
      }
      
      const response = await axios.get(`${API}/articles`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      
      setArticles(response.data);
      
      // Calculate stats
      const allArticles = await axios.get(`${API}/articles`, {
        params: { author_id: user?.user_id },
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      
      const total = allArticles.data.length;
      const published = allArticles.data.filter(a => a.status === 'published').length;
      const drafts = allArticles.data.filter(a => a.status === 'draft').length;
      const views = allArticles.data.reduce((sum, a) => sum + (a.views || 0), 0);
      
      setStats({ total, published, drafts, views });
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast.error(isHindi ? 'लेख लोड करने में त्रुटि' : 'Error loading articles');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await axios.delete(`${API}/articles/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      toast.success(t('articleDeleted'));
      fetchArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error(isHindi ? 'हटाने में त्रुटि' : 'Error deleting article');
    } finally {
      setDeleteId(null);
    }
  };

  const formatDate = (dateStr) => {
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return <span className="status-published">{isHindi ? 'प्रकाशित' : 'Published'}</span>;
      case 'draft':
        return <span className="status-draft">{isHindi ? 'ड्राफ्ट' : 'Draft'}</span>;
      case 'revoked':
        return <span className="status-revoked">{isHindi ? 'रद्द' : 'Revoked'}</span>;
      default:
        return <span className="status-draft">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6]" data-testid="dashboard-page">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold text-[#2a5a5a] ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
              {t('dashboard')}
            </h1>
            <p className={`text-sm md:text-base text-gray-600 mt-0.5 md:mt-1 ${isHindi ? 'font-hindi' : ''}`}>
              {isHindi ? `स्वागत है, ${user?.name}` : `Welcome, ${user?.name}`}
            </p>
          </div>
          <Link to="/editor">
            <Button className="bg-[#f4c430] text-[#2a5a5a] hover:bg-[#e0b020] font-bold" data-testid="new-article-btn">
              <Plus className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{t('writeArticle')}</span>
              <span className="sm:hidden">{isHindi ? 'लिखें' : 'Write'}</span>
            </Button>
          </Link>
        </div>

        {/* Pending Approval Banner */}
        {user?.status === 'pending' && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-300 rounded p-4">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className={`font-semibold text-amber-800 ${isHindi ? 'font-hindi' : ''}`}>
                {isHindi ? 'अनुमोदन की प्रतीक्षा है' : 'Pending Admin Approval'}
              </p>
              <p className={`text-sm text-amber-700 mt-0.5 ${isHindi ? 'font-hindi' : ''}`}>
                {isHindi
                  ? 'आपका खाता अभी तक स्वीकृत नहीं हुआ है। आप ड्राफ्ट सहेज सकते हैं लेकिन प्रकाशित नहीं कर सकते।'
                  : 'Your account has not been approved yet. You can save drafts but cannot publish articles until an admin approves you.'}
              </p>
            </div>
          </div>
        )}

        {/* Rejected Banner */}
        {user?.status === 'rejected' && (
          <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-300 rounded p-4">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className={`font-semibold text-red-800 ${isHindi ? 'font-hindi' : ''}`}>
                {isHindi ? 'खाता अस्वीकृत' : 'Account Rejected'}
              </p>
              <p className={`text-sm text-red-700 mt-0.5 ${isHindi ? 'font-hindi' : ''}`}>
                {isHindi
                  ? 'आपका खाता एडमिन द्वारा अस्वीकृत किया गया है। कृपया एडमिन से संपर्क करें।'
                  : 'Your account has been rejected by the admin. Please contact the admin for assistance.'}
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="stat-card !p-3 md:!p-6 border-b-4 border-yellow-400">
            <div className="flex flex-col items-center justify-center text-center">
              <Star className="w-5 h-5 md:w-6 md:h-6 text-yellow-500 mb-1" />
              <p className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-wider">{isHindi ? 'स्कोर' : 'Score'}</p>
              <p className="text-xl md:text-2xl font-black text-gray-900">{user?.score || 0}</p>
            </div>
          </div>

          <div className="stat-card !p-3 md:!p-6 border-b-4 border-orange-500">
            <div className="flex flex-col items-center justify-center text-center">
              <Flame className={`w-5 h-5 md:w-6 md:h-6 mb-1 ${(user?.current_streak || 0) > 0 ? 'text-orange-500 animate-pulse' : 'text-gray-300'}`} />
              <p className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-wider">{isHindi ? 'स्ट्रीक' : 'Streak'}</p>
              <p className="text-xl md:text-2xl font-black text-gray-900">{user?.current_streak || 0}</p>
            </div>
          </div>

          <div className="stat-card !p-3 md:!p-6">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="w-8 h-8 md:w-12 md:h-12 bg-[#2a5a5a]/10 rounded flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 md:w-6 md:h-6 text-[#2a5a5a]" />
              </div>
              <div className="min-w-0">
                <p className={`text-xs md:text-sm text-gray-500 leading-tight md:leading-normal truncate ${isHindi ? 'font-hindi' : ''}`}>{t('totalArticles')}</p>
                <p className="text-xl md:text-2xl font-bold text-[#2a5a5a] leading-none mt-0.5 md:mt-0">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="stat-card !p-3 md:!p-6" data-testid="stat-published">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="w-8 h-8 md:w-12 md:h-12 bg-green-100 rounded flex items-center justify-center shrink-0">
                <Send className="w-4 h-4 md:w-6 md:h-6 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className={`text-xs md:text-sm text-gray-500 leading-tight md:leading-normal truncate ${isHindi ? 'font-hindi' : ''}`}>{t('published')}</p>
                <p className="text-xl md:text-2xl font-bold text-green-600 leading-none mt-0.5 md:mt-0">{stats.published}</p>
              </div>
            </div>
          </div>
          
          <div className="stat-card !p-3 md:!p-6" data-testid="stat-drafts">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="w-8 h-8 md:w-12 md:h-12 bg-amber-100 rounded flex items-center justify-center shrink-0">
                <Edit className="w-4 h-4 md:w-6 md:h-6 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className={`text-xs md:text-sm text-gray-500 leading-tight md:leading-normal truncate ${isHindi ? 'font-hindi' : ''}`}>{t('drafts')}</p>
                <p className="text-xl md:text-2xl font-bold text-amber-600 leading-none mt-0.5 md:mt-0">{stats.drafts}</p>
              </div>
            </div>
          </div>
          
          <div className="stat-card !p-3 md:!p-6" data-testid="stat-views">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="w-8 h-8 md:w-12 md:h-12 bg-[#f4c430]/20 rounded flex items-center justify-center shrink-0">
                <Eye className="w-4 h-4 md:w-6 md:h-6 text-[#f4c430]" />
              </div>
              <div className="min-w-0">
                <p className={`text-xs md:text-sm text-gray-500 leading-tight md:leading-normal truncate ${isHindi ? 'font-hindi' : ''}`}>{t('totalViews')}</p>
                <p className="text-xl md:text-2xl font-bold text-[#f4c430] leading-none mt-0.5 md:mt-0">{stats.views}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {['all', 'published', 'draft'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors ${
                filter === f 
                  ? 'text-[#2a5a5a] border-b-2 border-[#2a5a5a]' 
                  : 'text-gray-500 hover:text-[#2a5a5a]'
              }`}
              data-testid={`filter-${f}`}
            >
              {f === 'all' ? (isHindi ? 'सभी' : 'All') : t(f === 'published' ? 'published' : 'drafts')}
            </button>
          ))}
        </div>

        {/* Articles List */}
        <div className="bg-white border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
              </div>
            </div>
          ) : articles.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className={`text-gray-500 ${isHindi ? 'font-hindi' : ''}`}>
                {isHindi ? 'कोई लेख नहीं मिला' : 'No articles found'}
              </p>
              <Link to="/editor">
                <Button className="mt-4 bg-[#2a5a5a] hover:bg-[#1f4444] text-white">
                  {t('writeArticle')}
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className={isHindi ? 'font-hindi' : ''}>{t('title')}</th>
                      <th className={isHindi ? 'font-hindi' : ''}>{t('category')}</th>
                      <th className={isHindi ? 'font-hindi' : ''}>{t('status')}</th>
                      <th className={isHindi ? 'font-hindi' : ''}>{t('views')}</th>
                      <th className={isHindi ? 'font-hindi' : ''}>{isHindi ? 'तारीख' : 'Date'}</th>
                      <th className={isHindi ? 'font-hindi' : ''}>{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((article) => (
                      <tr key={article.article_id} data-testid={`article-row-${article.article_id}`}>
                        <td>
                          <div className="max-w-xs">
                            <p className={`font-semibold text-gray-900 line-clamp-1 ${isHindi ? 'font-hindi' : ''}`}>
                              {isHindi && article.title_hi ? article.title_hi : article.title}
                            </p>
                          </div>
                        </td>
                        <td>
                          <span className={`category-pill ${isHindi ? 'font-hindi' : ''}`}>
                            {t(article.category.toLowerCase())}
                          </span>
                        </td>
                        <td>{getStatusBadge(article.status)}</td>
                        <td>{article.views || 0}</td>
                        <td className="text-sm text-gray-500 whitespace-nowrap">{formatDate(article.created_at)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Link to={`/article/${article.article_id}`}>
                              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-[#2a5a5a]">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Link to={`/editor/${article.article_id}`}>
                              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-[#2a5a5a]">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-gray-500 hover:text-red-600"
                              onClick={() => setDeleteId(article.article_id)}
                              data-testid={`delete-btn-${article.article_id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-100">
                {articles.map((article) => (
                  <div key={article.article_id} className="p-4 bg-white hover:bg-gray-50 flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-4">
                      <p className={`font-semibold text-gray-900 line-clamp-2 ${isHindi ? 'font-hindi' : ''}`}>
                        {isHindi && article.title_hi ? article.title_hi : article.title}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                      <div className="shrink-0">{getStatusBadge(article.status)}</div>
                      <span className={`category-pill text-[10px] py-0.5 px-2 bg-gray-100 ${isHindi ? 'font-hindi' : ''}`}>
                        {t(article.category.toLowerCase())}
                      </span>
                      <span className="flex items-center gap-1 ml-auto">
                        <Eye className="w-3.5 h-3.5" />{article.views || 0}
                      </span>
                      <span>•</span>
                      <span>{formatDate(article.created_at)}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 pt-3 border-t border-gray-50">
                      <Link to={`/article/${article.article_id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-gray-600 h-8">
                          <Eye className="w-3.5 h-3.5 mr-2" /> {isHindi ? 'देखें' : 'View'}
                        </Button>
                      </Link>
                      <Link to={`/editor/${article.article_id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-gray-600 h-8">
                          <Edit className="w-3.5 h-3.5 mr-2" /> {isHindi ? 'संपादन' : 'Edit'}
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" size="sm" 
                        className="text-red-500 hover:text-red-600 border-gray-200 shrink-0 h-8 px-2"
                        onClick={() => setDeleteId(article.article_id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={isHindi ? 'font-hindi-heading' : 'font-heading'}>
              {isHindi ? 'लेख हटाएं?' : 'Delete Article?'}
            </AlertDialogTitle>
            <AlertDialogDescription className={isHindi ? 'font-hindi' : ''}>
              {isHindi 
                ? 'यह क्रिया पूर्ववत नहीं की जा सकती। लेख स्थायी रूप से हटा दिया जाएगा।'
                : 'This action cannot be undone. The article will be permanently deleted.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isHindi ? 'font-hindi' : ''}>
              {isHindi ? 'रद्द करें' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-btn"
            >
              {isHindi ? 'हटाएं' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
