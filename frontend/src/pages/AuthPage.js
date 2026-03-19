import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

export default function AuthPage({ mode = 'login' }) {
  const { login, register, loginWithGoogle } = useAuth();
  const { t, isHindi } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const userData = await login(formData.email, formData.password);
        toast.success(isHindi ? 'सफलतापूर्वक लॉगिन हुआ!' : 'Successfully logged in!');
        navigate(userData.role === 'admin' ? '/admin' : from, { replace: true });
      } else {
        await register(formData.email, formData.password, formData.name);
        toast.success(isHindi ? 'अकाउंट बनाया गया!' : 'Account created successfully!');
        navigate(from, { replace: true });
      }
    } catch (err) {
      const message = err.response?.data?.detail || (isHindi ? 'कुछ गलत हो गया' : 'Something went wrong');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    loginWithGoogle();
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] flex" data-testid={mode === 'login' ? 'login-page' : 'signup-page'}>
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-[#2a5a5a] rounded-full flex items-center justify-center border-2 border-red-600">
              <div className="w-6 h-6 bg-[#f4c430] rounded-full" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold text-[#2a5a5a] ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
                {isHindi ? 'समाचार ग्रुप' : 'Samachar Group'}
              </h1>
            </div>
          </div>

          {/* Title */}
          <h2 className={`text-3xl font-bold text-gray-900 mb-2 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
            {mode === 'login' 
              ? (isHindi ? 'वापस स्वागत है' : 'Welcome Back')
              : (isHindi ? 'अकाउंट बनाएं' : 'Create Account')
            }
          </h2>
          <p className={`text-gray-600 mb-8 ${isHindi ? 'font-hindi' : ''}`}>
            {mode === 'login'
              ? (isHindi ? 'अपने अकाउंट में लॉगिन करें' : 'Login to your account')
              : t('joinCommunity')
            }
          </p>

          {/* Google Login */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            className="w-full mb-6 py-6 border-gray-300 hover:border-[#2a5a5a] hover:bg-gray-50"
            data-testid="google-login-btn"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('loginWithGoogle')}
          </Button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`bg-[#faf9f6] px-4 text-gray-500 ${isHindi ? 'font-hindi' : ''}`}>
                {t('orContinueWith')}
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div>
                <Label htmlFor="name" className={`text-gray-700 ${isHindi ? 'font-hindi' : ''}`}>
                  {t('name')}
                </Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={isHindi ? 'अपना नाम दर्ज करें' : 'Enter your name'}
                    className="pl-10 py-6 rounded-sm border-gray-300 focus:border-[#2a5a5a] focus:ring-[#2a5a5a]"
                    required
                    data-testid="name-input"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="email" className={`text-gray-700 ${isHindi ? 'font-hindi' : ''}`}>
                {t('email')}
              </Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={isHindi ? 'अपना ईमेल दर्ज करें' : 'Enter your email'}
                  className="pl-10 py-6 rounded-sm border-gray-300 focus:border-[#2a5a5a] focus:ring-[#2a5a5a]"
                  required
                  data-testid="email-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className={`text-gray-700 ${isHindi ? 'font-hindi' : ''}`}>
                {t('password')}
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={isHindi ? 'अपना पासवर्ड दर्ज करें' : 'Enter your password'}
                  className="pl-10 pr-10 py-6 rounded-sm border-gray-300 focus:border-[#2a5a5a] focus:ring-[#2a5a5a]"
                  required
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm" data-testid="auth-error">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-6 bg-[#2a5a5a] hover:bg-[#1f4444] text-white font-bold uppercase tracking-wider rounded-sm"
              data-testid="submit-btn"
            >
              {loading 
                ? (isHindi ? 'कृपया प्रतीक्षा करें...' : 'Please wait...')
                : mode === 'login' ? t('login') : t('signup')
              }
            </Button>
          </form>

          {/* Switch Mode */}
          <p className={`mt-6 text-center text-gray-600 ${isHindi ? 'font-hindi' : ''}`}>
            {mode === 'login' ? t('noAccount') : t('hasAccount')}{' '}
            <Link 
              to={mode === 'login' ? '/signup' : '/login'}
              className="text-[#2a5a5a] font-semibold hover:text-[#f4c430] transition-colors"
              data-testid="switch-mode-link"
            >
              {mode === 'login' ? t('signup') : t('login')}
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2a5a5a] to-[#1a3a3a]">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
        <div className="relative h-full flex items-center justify-center p-12">
          <div className="text-center text-white">
            <div className="w-24 h-24 mx-auto mb-8 bg-white rounded-full flex items-center justify-center border-4 border-red-600">
              <div className="w-12 h-12 bg-[#f4c430] rounded-full" />
            </div>
            <h2 className={`text-4xl font-bold mb-4 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
              {isHindi ? 'समाचार ग्रुप' : 'Samachar Group'}
            </h2>
            <p className={`text-xl text-white/80 max-w-md mx-auto ${isHindi ? 'font-hindi' : ''}`}>
              {isHindi 
                ? 'रिपोर्टर समुदाय में शामिल हों और अपनी खबरें साझा करें'
                : 'Join the reporter community and share your stories with the world'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
