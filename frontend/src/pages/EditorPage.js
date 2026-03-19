import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { QuillEditor } from '../components/QuillEditor';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { Save, Send, ArrowLeft, Image } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EditorPage() {
  const { articleId } = useParams();
  const { token } = useAuth();
  const { t, isHindi } = useLanguage();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    title_hi: '',
    content: '',
    content_hi: '',
    category: '',
    image_url: '',
    is_featured: false
  });

  const isEditing = !!articleId;

  const categories = [
    { id: 'sports', name: 'Sports', name_hi: 'खेल' },
    { id: 'crime', name: 'Crime', name_hi: 'अपराध' },
    { id: 'politics', name: 'Politics', name_hi: 'राजनीति' },
    { id: 'entertainment', name: 'Entertainment', name_hi: 'मनोरंजन' },
    { id: 'business', name: 'Business', name_hi: 'व्यापार' },
    { id: 'technology', name: 'Technology', name_hi: 'प्रौद्योगिकी' }
  ];

  useEffect(() => {
    if (articleId) {
      fetchArticle();
    }
  }, [articleId]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/articles/${articleId}?increment_view=false`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      
      const article = response.data;
      setFormData({
        title: article.title || '',
        title_hi: article.title_hi || '',
        content: article.content || '',
        content_hi: article.content_hi || '',
        category: article.category || '',
        image_url: article.image_url || '',
        is_featured: article.is_featured || false
      });
    } catch (error) {
      console.error('Error fetching article:', error);
      toast.error(isHindi ? 'लेख लोड करने में त्रुटि' : 'Error loading article');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleContentChange = (value, field) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (status) => {
    if (!formData.title.trim()) {
      toast.error(isHindi ? 'शीर्षक आवश्यक है' : 'Title is required');
      return;
    }
    if (!formData.content.trim()) {
      toast.error(isHindi ? 'सामग्री आवश्यक है' : 'Content is required');
      return;
    }
    if (!formData.category) {
      toast.error(isHindi ? 'श्रेणी चुनें' : 'Please select a category');
      return;
    }

    setSaving(true);
    
    try {
      const payload = {
        ...formData,
        status
      };

      if (isEditing) {
        await axios.put(`${API}/articles/${articleId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
        toast.success(isHindi ? 'लेख अपडेट हो गया!' : 'Article updated!');
      } else {
        await axios.post(`${API}/articles`, payload, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
        toast.success(status === 'published' ? t('articlePublished') : t('articleSaved'));
      }
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving article:', error);
      toast.error(isHindi ? 'सहेजने में त्रुटि' : 'Error saving article');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#2a5a5a] rounded-full flex items-center justify-center">
            <div className="w-8 h-8 bg-[#f4c430] rounded-full" />
          </div>
          <p className="text-gray-600">{isHindi ? 'लोड हो रहा है...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6]" data-testid="editor-page">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-[#2a5a5a]"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className={`text-2xl font-bold text-[#2a5a5a] ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
              {isEditing 
                ? (isHindi ? 'लेख संपादित करें' : 'Edit Article')
                : t('writeArticle')
              }
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleSubmit('draft')}
              disabled={saving}
              className="border-[#2a5a5a] text-[#2a5a5a] hover:bg-[#2a5a5a] hover:text-white"
              data-testid="save-draft-btn"
            >
              <Save className="w-4 h-4 mr-2" />
              {t('saveAsDraft')}
            </Button>
            <Button
              onClick={() => handleSubmit('published')}
              disabled={saving}
              className="bg-[#f4c430] text-[#2a5a5a] hover:bg-[#e0b020] font-bold"
              data-testid="publish-btn"
            >
              <Send className="w-4 h-4 mr-2" />
              {t('publish')}
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white border border-gray-200 p-6 space-y-6">
          {/* English Title */}
          <div>
            <Label htmlFor="title" className="text-gray-700 font-semibold">
              {t('title')} (English) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter article title"
              className="mt-1 py-6 rounded-sm border-gray-300 focus:border-[#2a5a5a] focus:ring-[#2a5a5a] font-heading text-xl"
              data-testid="title-input"
            />
          </div>

          {/* Hindi Title */}
          <div>
            <Label htmlFor="title_hi" className="text-gray-700 font-semibold font-hindi">
              {t('titleHindi')} (हिंदी)
            </Label>
            <Input
              id="title_hi"
              name="title_hi"
              value={formData.title_hi}
              onChange={handleChange}
              placeholder="हिंदी में शीर्षक दर्ज करें"
              className="mt-1 py-6 rounded-sm border-gray-300 focus:border-[#2a5a5a] focus:ring-[#2a5a5a] font-hindi-heading text-xl"
              data-testid="title-hi-input"
            />
          </div>

          {/* Category & Image Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className={`text-gray-700 font-semibold ${isHindi ? 'font-hindi' : ''}`}>
                {t('category')} <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="mt-1 py-6 rounded-sm" data-testid="category-select">
                  <SelectValue placeholder={isHindi ? 'श्रेणी चुनें' : 'Select category'} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {isHindi ? cat.name_hi : cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="image_url" className={`text-gray-700 font-semibold ${isHindi ? 'font-hindi' : ''}`}>
                {t('imageUrl')}
              </Label>
              <div className="relative mt-1">
                <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="image_url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
                  className="pl-10 py-6 rounded-sm border-gray-300 focus:border-[#2a5a5a] focus:ring-[#2a5a5a]"
                  data-testid="image-url-input"
                />
              </div>
            </div>
          </div>

          {/* Image Preview */}
          {formData.image_url && (
            <div className="relative aspect-video max-w-md overflow-hidden rounded border border-gray-200">
              <img 
                src={formData.image_url} 
                alt="Preview" 
                className="w-full h-full object-cover"
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
          )}

          {/* Featured Checkbox */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="is_featured"
              checked={formData.is_featured}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
              data-testid="featured-checkbox"
            />
            <Label htmlFor="is_featured" className={`text-gray-700 cursor-pointer ${isHindi ? 'font-hindi' : ''}`}>
              {t('markFeatured')}
            </Label>
          </div>

          {/* English Content */}
          <div>
            <Label className="text-gray-700 font-semibold mb-2 block">
              {t('content')} (English) <span className="text-red-500">*</span>
            </Label>
            <div data-testid="content-editor" className="border border-gray-200 rounded-sm">
              <QuillEditor
                value={formData.content}
                onChange={(value) => handleContentChange(value, 'content')}
                placeholder="Write your article content here..."
              />
            </div>
          </div>

          {/* Hindi Content */}
          <div>
            <Label className="text-gray-700 font-semibold mb-2 block font-hindi">
              {t('contentHindi')} (हिंदी)
            </Label>
            <div data-testid="content-hi-editor" className="border border-gray-200 rounded-sm">
              <QuillEditor
                value={formData.content_hi}
                onChange={(value) => handleContentChange(value, 'content_hi')}
                placeholder="यहां अपने लेख की सामग्री लिखें..."
                className="font-hindi"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
