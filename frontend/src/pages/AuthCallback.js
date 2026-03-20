import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function AuthCallback() {
  const { handleGoogleCallback } = useAuth();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use useRef to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processCallback = async () => {
      // Extract session_id from URL fragment
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const sessionId = params.get('session_id');

      if (!sessionId) {
        toast.error('Authentication failed - no session ID');
        navigate('/login');
        return;
      }

      try {
        const user = await handleGoogleCallback(sessionId);
        toast.success(`Welcome, ${user.name}!`);
        navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true, state: { user } });
      } catch (error) {
        console.error('Google auth error:', error);
        toast.error('Authentication failed');
        navigate('/login');
      }
    };

    processCallback();
  }, [handleGoogleCallback, navigate]);

  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-[#b91c1c] rounded-full flex items-center justify-center animate-pulse">
          <div className="w-8 h-8 bg-[#f4c430] rounded-full" />
        </div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
