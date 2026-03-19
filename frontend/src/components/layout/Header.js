import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Menu, X, Search, LogOut, FileText, Settings, Globe, Radio } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Header = () => {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const { t, language, toggleLanguage, isHindi } = useLanguage();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [breakingNews, setBreakingNews] = useState(null);

  useEffect(() => {
    axios.get(`${API}/public/breaking-news`)
      .then(res => setBreakingNews(res.data.text || null))
      .catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    axios.get(`${API}/categories`)
      .then(res => setCategories(res.data))
      .catch(() => {});
  }, []);

  return (
    <>
    <header className="sticky-header border-b border-gray-200 shadow-sm relative">
      {/* Top Bar */}
      <div className="bg-[#2a5a5a] text-white py-2">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center text-sm">
          <span className={isHindi ? 'font-hindi' : ''}>
            {new Date().toLocaleDateString(isHindi ? 'hi-IN' : 'en-IN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 hover:text-[#f4c430] transition-colors"
            data-testid="language-toggle"
          >
            <Globe className="w-4 h-4" />
            <span>{language === 'en' ? 'हिंदी' : 'English'}</span>
          </button>
        </div>
      </div>

      {/* Breaking News Ticker */}
      {breakingNews && (
        <div className="bg-red-600 text-white py-1.5 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shrink-0 bg-white text-red-600 px-2 py-0.5 rounded">
              <Radio className="w-3 h-3" />{isHindi ? 'ब्रेकिंग' : 'Breaking'}
            </span>
            <div className="overflow-hidden flex-1">
              <p className={`animate-marquee whitespace-nowrap text-sm font-semibold ${isHindi ? 'font-hindi' : ''}`}>
                {breakingNews}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="bg-white py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
              <div className="w-12 h-12 bg-[#2a5a5a] rounded-full flex items-center justify-center border-2 border-red-600">
                <div className="w-6 h-6 bg-[#f4c430] rounded-full" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold text-[#2a5a5a] ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
                  {isHindi ? 'समाचार ग्रुप' : 'Samachar Group'}
                </h1>
                <p className={`text-xs text-gray-500 ${isHindi ? 'font-hindi' : ''}`}>
                  {t('tagline')}
                </p>
              </div>
            </Link>

            {/* Search Bar - Desktop */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-sm focus:border-[#2a5a5a] focus:ring-1 focus:ring-[#2a5a5a] outline-none transition-all"
                  data-testid="search-input"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </form>

            {/* Auth Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu-trigger">
                      {user?.picture ? (
                        <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 bg-[#2a5a5a] rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {user?.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium">{user?.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center gap-2" data-testid="dashboard-link">
                        <FileText className="w-4 h-4" />
                        {t('dashboard')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/editor" className="flex items-center gap-2" data-testid="write-article-link">
                        <FileText className="w-4 h-4" />
                        {t('writeArticle')}
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="flex items-center gap-2" data-testid="admin-link">
                            <Settings className="w-4 h-4" />
                            {t('admin')}
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600" data-testid="logout-btn">
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="outline" className="border-[#2a5a5a] text-[#2a5a5a] hover:bg-[#2a5a5a] hover:text-white" data-testid="login-btn">
                      {t('login')}
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="bg-[#f4c430] text-[#2a5a5a] hover:bg-[#e0b020] font-bold" data-testid="signup-btn">
                      {t('signup')}
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <nav className="bg-[#faf9f6] border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="hidden md:flex items-center gap-1 py-2 overflow-x-auto">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.id}`}
                className={`category-pill whitespace-nowrap ${isHindi ? 'font-hindi' : ''}`}
                data-testid={`category-${cat.id}`}
              >
                {isHindi ? cat.name_hi : cat.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

    </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu md:hidden animate-fade-in fixed inset-0 z-[100] bg-white p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xl font-bold ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
              {isHindi ? 'मेनू' : 'Menu'}
            </h2>
            <button onClick={() => setMobileMenuOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search')}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </form>

          {/* Mobile Categories */}
          <div className="space-y-2 mb-6">
            <h3 className="font-semibold text-gray-500 uppercase text-xs tracking-wider mb-3">
              {isHindi ? 'श्रेणियां' : 'Categories'}
            </h3>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 px-3 hover:bg-gray-100 rounded ${isHindi ? 'font-hindi' : ''}`}
              >
                {isHindi ? cat.name_hi : cat.name}
              </Link>
            ))}
          </div>

          {/* Mobile Auth */}
          <div className="border-t pt-6">
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 bg-[#2a5a5a] rounded-full flex items-center justify-center text-white font-bold">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{user?.name}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 px-3 hover:bg-gray-100 rounded"
                >
                  {t('dashboard')}
                </Link>
                <Link
                  to="/editor"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 px-3 hover:bg-gray-100 rounded"
                >
                  {t('writeArticle')}
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 px-3 hover:bg-gray-100 rounded"
                  >
                    {t('admin')}
                  </Link>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-2 px-3 text-red-600 hover:bg-red-50 rounded"
                >
                  {t('logout')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block"
                >
                  <Button variant="outline" className="w-full border-[#2a5a5a] text-[#2a5a5a]">
                    {t('login')}
                  </Button>
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block"
                >
                  <Button className="w-full bg-[#f4c430] text-[#2a5a5a] hover:bg-[#e0b020] font-bold">
                    {t('signup')}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
