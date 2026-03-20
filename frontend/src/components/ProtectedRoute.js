import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, adminOnly = false, reporterOnly = false }) => {
  const { isAuthenticated, isAdmin, isReporter, loading } = useAuth();
  const location = useLocation();

  // If user data was passed from AuthCallback, skip loading state
  if (location.state?.user) {
    return children;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#2a5a5a] rounded-full flex items-center justify-center animate-pulse">
            <div className="w-8 h-8 bg-[#f4c430] rounded-full" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (reporterOnly && !isReporter) {
    return <Navigate to="/" replace />;
  }

  return children;
};
