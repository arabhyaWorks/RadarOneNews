import React, { useState, useEffect, useRef } from 'react';
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
import { Save, Send, ArrowLeft, Image, Upload, X, Loader2 } from 'lucide-react';
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

export default function EditorPage() {
  const { articleId } = useParams();
  const { token, user } = useAuth();
  const { t, isHindi } = useLanguage();
  const isApproved = user?.role === 'admin' || user?.status === 'approved';
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const fileInputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    image_url: '',
    is_featured: false
  });
  
  // Refs for Quill editors
  const contentEditorRef = useRef(null);

  const isEditing = !!articleId;

  useEffect(() => {
    axios.get(`${API}/categories`).then(res => setCategories(res.data)).catch(() => {});
    if (articleId) fetchArticle();
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
        content: article.content || '',
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

  // Helper to check if HTML content is effectively empty
  const isContentEmpty = (html) => {
    if (!html) return true;
    // Strip HTML tags and check if there's actual text content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    return textContent.trim().length === 0;
  };

  // Get content directly from Quill editor DOM
  const getEditorContent = () => {
    const contentEditor = document.querySelector('[data-testid="content-editor"] .ql-editor');
    
    let content = formData.content;
    
    // Fallback: read directly from DOM if state is empty
    if (isContentEmpty(content) && contentEditor) {
      const html = contentEditor.innerHTML;
      content = (html === '<p><br></p>' || html === '<p></p>') ? '' : html;
    }
    
    return { content };
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    setUploading(true);
    try {
      const res = await axios.post(`${API}/upload/image`, formDataUpload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });
      setFormData(prev => ({ ...prev, image_url: res.data.url }));
      toast.success(isHindi ? 'छवि अपलोड हो गई!' : 'Image uploaded!');
    } catch (err) {
      toast.error(isHindi ? 'छवि अपलोड विफल' : 'Image upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (status) => {
    // Get content from editors (with fallback to DOM)
    const { content } = getEditorContent();
    
    if (!formData.title.trim()) {
      toast.error(isHindi ? 'शीर्षक आवश्यक है' : 'Title is required');
      return;
    }
    if (isContentEmpty(content)) {
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
        content,
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
          <div className="w-16 h-16 mx-auto mb-4 bg-[#b91c1c] rounded-full flex items-center justify-center">
            <div className="w-8 h-8 bg-[#f4c430] rounded-full" />
          </div>
          <p className="text-gray-600">{isHindi ? 'लोड हो रहा है...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-[#faf9f6]" data-testid="editor-page">
      <div className="max-w-[1600px] w-full mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-[#b91c1c] px-2 -ml-2 sm:-ml-0"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold text-[#b91c1c] ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
              {isEditing 
                ? (isHindi ? 'लेख संपादित करें' : 'Edit Article')
                : t('writeArticle')
              }
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 px-1 sm:px-0">
            <Button
              variant="outline"
              onClick={() => handleSubmit('draft')}
              disabled={saving}
              className="flex-1 sm:flex-none justify-center border-[#b91c1c] text-[#b91c1c] hover:bg-[#b91c1c] hover:text-white px-3 py-2 h-auto text-sm sm:text-base whitespace-nowrap"
              data-testid="save-draft-btn"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" />
              {t('saveAsDraft')}
            </Button>
            <Button
              onClick={() => setConfirmPublish(true)}
              disabled={saving || !isApproved}
              title={!isApproved ? (isHindi ? 'प्रकाशित करने के लिए एडमिन अनुमोदन आवश्यक है' : 'Admin approval required to publish') : ''}
              className="flex-1 sm:flex-none justify-center bg-[#f4c430] text-[#b91c1c] hover:bg-[#e0b020] font-bold disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 h-auto text-sm sm:text-base whitespace-nowrap"
              data-testid="publish-btn"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" />
              {t('publish')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Editor Form */}
          <div className="bg-white border border-gray-200 p-6 space-y-6 rounded shadow-sm h-fit">
            {/* Article Title */}
            <div>
              <Label htmlFor="title" className="text-gray-700 font-semibold">
                {t('title')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder={isHindi ? 'शीर्षक दर्ज करें' : 'Enter article title'}
                className="mt-1 py-6 rounded-sm border-gray-300 focus:border-[#b91c1c] focus:ring-[#b91c1c] font-heading text-xl"
                data-testid="title-input"
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
                <Label className={`text-gray-700 font-semibold ${isHindi ? 'font-hindi' : ''}`}>
                  {t('imageUrl')}
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                {formData.image_url ? (
                  <div className="mt-1 relative rounded-sm overflow-hidden border border-gray-200">
                    <img
                      src={formData.image_url}
                      alt="Uploaded"
                      className="w-full h-28 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="mt-1 w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-[#b91c1c] rounded-sm py-5 text-gray-400 hover:text-[#b91c1c] transition-colors disabled:opacity-50"
                    data-testid="image-upload-btn"
                  >
                    {uploading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" />{isHindi ? 'अपलोड हो रहा है...' : 'Uploading...'}</>
                    ) : (
                      <><Upload className="w-5 h-5" />{isHindi ? 'छवि अपलोड करें' : 'Upload Image'}</>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Featured Checkbox */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                data-testid="featured-checkbox"
              />
              <Label htmlFor="is_featured" className={`text-gray-700 font-semibold cursor-pointer ${isHindi ? 'font-hindi' : ''}`}>
                {t('markFeatured')}
              </Label>
            </div>

            {/* Article Content */}
            <div className="flex flex-col flex-1 pb-10">
              <Label className="text-gray-700 font-semibold mb-2 block">
                {t('content')} <span className="text-red-500">*</span>
              </Label>
              <div data-testid="content-editor" className="border border-gray-200 rounded-sm">
                <QuillEditor
                  value={formData.content}
                  onChange={(value) => handleContentChange(value, 'content')}
                  placeholder={isHindi ? 'यहां अपने लेख की सामग्री लिखें...' : 'Write your article content here...'}
                  className="min-h-[500px]"
                  token={token}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live Preview */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <div className="bg-white border text-center border-gray-200 px-4 py-2 border-b-0 font-semibold text-gray-600 uppercase tracking-widest text-xs">
                Live Preview
              </div>
              <div className="bg-white border border-gray-200 h-[calc(100vh-100px)] overflow-y-auto">
                <div className="relative pb-8">
                  {/* Preview Hero Image */}
                  {formData.image_url ? (
                    <div className="relative h-64 overflow-hidden bg-gray-100">
                      <img 
                        src={formData.image_url} 
                        alt="Preview Hero" 
                        className="w-full h-full object-cover"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-tr from-[#b91c1c] to-[#7f1d1d] flex items-center justify-center text-white/50 text-sm">
                      Hero Image Placeholder
                    </div>
                  )}

                  <div className="px-8 mt-8">
                    {/* Preview Category/Badge */}
                    <div className="flex items-center gap-3 mb-4">
                      {formData.category ? (
                        <div className={`category-pill ${isHindi ? 'font-hindi' : ''}`}>
                          {t(formData.category)}
                        </div>
                      ) : (
                        <div className="category-pill bg-gray-100 text-gray-400">Category</div>
                      )}
                      {formData.is_featured && <span className="featured-badge">{t('featured')}</span>}
                    </div>

                    {/* Preview Title */}
                    <h1 className={`text-3xl font-bold text-gray-900 leading-tight mb-6 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
                      {formData.title || <span className="text-gray-300">Article Title preview...</span>}
                    </h1>

                    {/* Preview Meta */}
                    <div className="flex items-center gap-4 text-gray-400 text-sm border-b border-gray-100 pb-5 mb-6">
                      <span className="font-semibold text-gray-500">By {user?.name || 'Author'}</span>
                      <span>•</span>
                      <span>Just now</span>
                    </div>

                    {/* Preview Content */}
                    <div 
                      className={`article-content max-w-none ${isHindi ? 'font-hindi' : ''}`}
                      dangerouslySetInnerHTML={{ __html: formData.content || '<p class="text-gray-300 italic">Start typing to see content preview...</p>' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className={isHindi ? 'font-hindi-heading' : 'font-heading'}>
            {isHindi ? 'लेख प्रकाशित करें?' : 'Publish Article?'}
          </AlertDialogTitle>
          <AlertDialogDescription className={isHindi ? 'font-hindi' : ''}>
            {isHindi
              ? 'यह लेख सार्वजनिक रूप से दिखाई देगा। क्या आप सुनिश्चित हैं?'
              : 'This article will be visible to the public. Are you sure you want to publish?'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={isHindi ? 'font-hindi' : ''}>
            {isHindi ? 'रद्द करें' : 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => { setConfirmPublish(false); handleSubmit('published'); }}
            className="bg-[#f4c430] text-[#b91c1c] hover:bg-[#e0b020] font-bold"
          >
            {isHindi ? 'प्रकाशित करें' : 'Publish'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
