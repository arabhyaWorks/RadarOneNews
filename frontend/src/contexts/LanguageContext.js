import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

const translations = {
  en: {
    // Navigation
    home: 'Home',
    login: 'Login',
    signup: 'Sign Up',
    logout: 'Logout',
    dashboard: 'Dashboard',
    admin: 'Admin',
    writeArticle: 'Write Article',
    myArticles: 'My Articles',
    
    // Categories
    sports: 'Sports',
    crime: 'Crime',
    politics: 'Politics',
    entertainment: 'Entertainment',
    business: 'Business',
    technology: 'Technology',
    
    // Common
    featured: 'Featured',
    latest: 'Latest News',
    popular: 'Popular News',
    search: 'Search news...',
    readMore: 'Read More',
    publishedOn: 'Published on',
    by: 'By',
    views: 'views',
    
    // Auth
    email: 'Email',
    password: 'Password',
    name: 'Full Name',
    loginWithGoogle: 'Continue with Google',
    orContinueWith: 'Or continue with',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    joinCommunity: 'Join the Reporter Community',
    
    // Dashboard
    totalArticles: 'Total Articles',
    published: 'Published',
    drafts: 'Drafts',
    totalViews: 'Total Views',
    
    // Editor
    title: 'Title',
    titleHindi: 'Title (Hindi)',
    content: 'Content',
    contentHindi: 'Content (Hindi)',
    category: 'Category',
    imageUrl: 'Image URL',
    markFeatured: 'Mark as Featured',
    saveAsDraft: 'Save as Draft',
    publish: 'Publish',
    update: 'Update',
    
    // Admin
    manageArticles: 'Manage Articles',
    revoke: 'Revoke',
    delete: 'Delete',
    status: 'Status',
    author: 'Author',
    actions: 'Actions',
    
    // Messages
    articlePublished: 'Article published successfully!',
    articleSaved: 'Article saved as draft',
    articleDeleted: 'Article deleted',
    articleRevoked: 'Article revoked',
    
    // Footer
    aboutUs: 'About Us',
    contactUs: 'Contact Us',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    allRightsReserved: 'All Rights Reserved',
    tagline: 'Your trusted source for news'
  },
  hi: {
    // Navigation
    home: 'होम',
    login: 'लॉगिन',
    signup: 'साइन अप',
    logout: 'लॉगआउट',
    dashboard: 'डैशबोर्ड',
    admin: 'एडमिन',
    writeArticle: 'लेख लिखें',
    myArticles: 'मेरे लेख',
    
    // Categories
    sports: 'खेल',
    crime: 'अपराध',
    politics: 'राजनीति',
    entertainment: 'मनोरंजन',
    business: 'व्यापार',
    technology: 'प्रौद्योगिकी',
    
    // Common
    featured: 'मुख्य खबरें',
    latest: 'ताज़ा खबरें',
    popular: 'लोकप्रिय खबरें',
    search: 'समाचार खोजें...',
    readMore: 'आगे पढ़ें',
    publishedOn: 'प्रकाशित',
    by: 'लेखक',
    views: 'बार देखा गया',
    
    // Auth
    email: 'ईमेल',
    password: 'पासवर्ड',
    name: 'पूरा नाम',
    loginWithGoogle: 'Google से जारी रखें',
    orContinueWith: 'या जारी रखें',
    noAccount: 'खाता नहीं है?',
    hasAccount: 'पहले से खाता है?',
    joinCommunity: 'रिपोर्टर समुदाय से जुड़ें',
    
    // Dashboard
    totalArticles: 'कुल लेख',
    published: 'प्रकाशित',
    drafts: 'ड्राफ्ट',
    totalViews: 'कुल व्यूज',
    
    // Editor
    title: 'शीर्षक',
    titleHindi: 'शीर्षक (हिंदी)',
    content: 'सामग्री',
    contentHindi: 'सामग्री (हिंदी)',
    category: 'श्रेणी',
    imageUrl: 'चित्र URL',
    markFeatured: 'फीचर्ड के रूप में चिह्नित करें',
    saveAsDraft: 'ड्राफ्ट सहेजें',
    publish: 'प्रकाशित करें',
    update: 'अपडेट करें',
    
    // Admin
    manageArticles: 'लेख प्रबंधित करें',
    revoke: 'रद्द करें',
    delete: 'हटाएं',
    status: 'स्थिति',
    author: 'लेखक',
    actions: 'कार्रवाई',
    
    // Messages
    articlePublished: 'लेख सफलतापूर्वक प्रकाशित!',
    articleSaved: 'लेख ड्राफ्ट में सहेजा गया',
    articleDeleted: 'लेख हटाया गया',
    articleRevoked: 'लेख रद्द किया गया',
    
    // Footer
    aboutUs: 'हमारे बारे में',
    contactUs: 'संपर्क करें',
    privacyPolicy: 'गोपनीयता नीति',
    termsOfService: 'सेवा की शर्तें',
    allRightsReserved: 'सर्वाधिकार सुरक्षित',
    tagline: 'आपका विश्वसनीय समाचार स्रोत'
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key) => {
    return translations[language][key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'hi' : 'en');
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t,
    isHindi: language === 'hi'
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
