import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';

import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import AuthCallback from './pages/AuthCallback';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';
import ArticlePage from './pages/ArticlePage';
import CategoryPage from './pages/CategoryPage';
import SearchPage from './pages/SearchPage';
import AdminPage from './pages/AdminPage';
import AuthorPage from './pages/AuthorPage';
import LeaderboardPage from './pages/LeaderboardPage';
import GoogleAnalytics from './components/GoogleAnalytics';

import './App.css';

function AppContent() {
  const location = useLocation();
  
  // Check URL fragment for session_id - handle OAuth callback synchronously
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  // Pages without header/footer
  const noLayoutPages = ['/login', '/signup', '/auth/callback'];
  const showLayout = !noLayoutPages.includes(location.pathname);

  return (
    <>
      <GoogleAnalytics />
      {showLayout && <Header />}
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/article/:articleId" element={<ArticlePage />} />
          <Route path="/category/:category" element={<CategoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/leaderboard" element={
            <ProtectedRoute reporterOnly>
              <LeaderboardPage />
            </ProtectedRoute>
          } />
          <Route path="/author/:authorId" element={<AuthorPage />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/editor" element={
            <ProtectedRoute>
              <EditorPage />
            </ProtectedRoute>
          } />
          <Route path="/editor/:articleId" element={
            <ProtectedRoute>
              <EditorPage />
            </ProtectedRoute>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <AdminPage />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
      {showLayout && <Footer />}
      <Toaster position="top-right" richColors />
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
