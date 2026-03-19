import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  FileText, Users, Eye, AlertTriangle, Trash2, XCircle, CheckCircle,
  BarChart3, Clock, UserCheck, UserX, Plus, Pencil, Tag, Star, Pin,
  RefreshCw, Download, Radio, Activity, Shield, TrendingUp,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const authHeaders = (token) => ({ Authorization: `Bearer ${token}`, withCredentials: true });

export default function AdminPage() {
  const { token } = useAuth();
  const { t, isHindi } = useLanguage();

  // ── Tab ──
  const [activeTab, setActiveTab] = useState('articles');

  // ── Articles ──
  const [articles, setArticles] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [actionDialog, setActionDialog] = useState({ open: false, type: null, articleId: null, label: '' });

  // ── Reporters ──
  const [reporters, setReporters] = useState([]);
  const [reporterFilter, setReporterFilter] = useState('all');
  const [reporterDialog, setReporterDialog] = useState({ open: false, type: null, reporter: null });

  // ── Categories ──
  const [categories, setCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState({ id: '', name: '', name_hi: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryDialog, setCategoryDialog] = useState({ open: false, category: null });

  // ── Users ──
  const [users, setUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userDialog, setUserDialog] = useState({ open: false, type: null, user: null });
  const [userRoleChange, setUserRoleChange] = useState('');

  // ── Breaking News ──
  const [breakingText, setBreakingText] = useState('');
  const [currentBreaking, setCurrentBreaking] = useState(null);

  // ── Analytics ──
  const [analytics, setAnalytics] = useState(null);

  // ── Audit Log ──
  const [auditLogs, setAuditLogs] = useState([]);

  // ── Shared ──
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const headers = { headers: { Authorization: `Bearer ${token}` }, withCredentials: true };

  // ── Data fetchers ──
  const fetchStats = useCallback(async () => {
    const res = await axios.get(`${API}/admin/stats`, headers);
    setStats(res.data);
  }, [token]);

  const fetchArticles = useCallback(async () => {
    const params = filter !== 'all' ? { status: filter } : {};
    const res = await axios.get(`${API}/admin/articles`, { params, ...headers });
    setArticles(res.data);
    setSelectedIds([]);
  }, [token, filter]);

  const fetchReporters = useCallback(async () => {
    const params = reporterFilter !== 'all' ? { status: reporterFilter } : {};
    const res = await axios.get(`${API}/admin/reporters`, { params, ...headers });
    setReporters(res.data);
  }, [token, reporterFilter]);

  const fetchCategories = useCallback(async () => {
    const res = await axios.get(`${API}/categories`, headers);
    setCategories(res.data);
  }, [token]);

  const fetchUsers = useCallback(async () => {
    const params = userRoleFilter !== 'all' ? { role: userRoleFilter } : {};
    const res = await axios.get(`${API}/admin/users`, { params, ...headers });
    setUsers(res.data);
  }, [token, userRoleFilter]);

  const fetchBreakingNews = useCallback(async () => {
    const res = await axios.get(`${API}/public/breaking-news`);
    setCurrentBreaking(res.data.text || null);
    setBreakingText(res.data.text || '');
  }, []);

  const fetchAnalytics = useCallback(async () => {
    const res = await axios.get(`${API}/admin/analytics`, headers);
    setAnalytics(res.data);
  }, [token]);

  const fetchAuditLogs = useCallback(async () => {
    const res = await axios.get(`${API}/admin/audit-logs`, headers);
    setAuditLogs(res.data);
  }, [token]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await fetchStats();
        if (activeTab === 'articles') await fetchArticles();
        else if (activeTab === 'reporters') await fetchReporters();
        else if (activeTab === 'categories') await fetchCategories();
        else if (activeTab === 'users') await fetchUsers();
        else if (activeTab === 'breaking') await fetchBreakingNews();
        else if (activeTab === 'analytics') await fetchAnalytics();
        else if (activeTab === 'audit') await fetchAuditLogs();
      } catch (err) {
        toast.error(isHindi ? 'डेटा लोड करने में त्रुटि' : 'Error loading data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeTab, filter, reporterFilter, userRoleFilter]);

  // ── Article actions ──
  const articleAction = async (type, id, label) => {
    try {
      if (type === 'revoke')     await axios.put(`${API}/admin/articles/${id}/revoke`, {}, headers);
      if (type === 'republish')  await axios.put(`${API}/admin/articles/${id}/republish`, {}, headers);
      if (type === 'delete')     await axios.delete(`${API}/articles/${id}`, headers);
      if (type === 'feature')    await axios.put(`${API}/admin/articles/${id}/feature`, {}, headers);
      if (type === 'pin')        await axios.put(`${API}/admin/articles/${id}/pin`, {}, headers);
      toast.success(isHindi ? 'हो गया' : 'Done');
      await fetchArticles();
      await fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || (isHindi ? 'त्रुटि' : 'Error'));
    } finally {
      setActionDialog({ open: false, type: null, articleId: null, label: '' });
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    try {
      await axios.post(`${API}/admin/articles/bulk`, { ids: selectedIds, action: bulkAction }, headers);
      toast.success(isHindi ? `${selectedIds.length} लेख अपडेट हुए` : `${selectedIds.length} articles updated`);
      setBulkAction('');
      await fetchArticles();
      await fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || (isHindi ? 'त्रुटि' : 'Error'));
    }
  };

  const handleExport = () => {
    window.open(`${API}/admin/articles/export?token=${token}`, '_blank');
    // fallback with auth header via fetch-blob
    fetch(`${API}/admin/articles/export`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob()).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'articles.csv'; a.click();
        URL.revokeObjectURL(url);
      }).catch(() => toast.error('Export failed'));
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === articles.length ? [] : articles.map(a => a.article_id));
  };

  // ── Reporter actions ──
  const handleReporterAction = async () => {
    const { type, reporter } = reporterDialog;
    try {
      await axios.put(`${API}/admin/reporters/${reporter.user_id}/${type}`, {}, headers);
      toast.success(type === 'approve' ? (isHindi ? 'स्वीकृत' : 'Approved') : (isHindi ? 'अस्वीकृत' : 'Rejected'));
      await fetchReporters(); await fetchStats();
    } catch (err) { toast.error(isHindi ? 'त्रुटि' : 'Error'); }
    finally { setReporterDialog({ open: false, type: null, reporter: null }); }
  };

  // ── Category actions ──
  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await axios.put(`${API}/admin/categories/${editingCategory}`, { name: categoryForm.name, name_hi: categoryForm.name_hi }, headers);
        toast.success(isHindi ? 'अपडेट हुई' : 'Updated');
      } else {
        await axios.post(`${API}/admin/categories`, categoryForm, headers);
        toast.success(isHindi ? 'जोड़ी गई' : 'Added');
      }
      setCategoryForm({ id: '', name: '', name_hi: '' }); setEditingCategory(null);
      await fetchCategories();
    } catch (err) { toast.error(err.response?.data?.detail || (isHindi ? 'त्रुटि' : 'Error')); }
  };

  const handleDeleteCategory = async () => {
    try {
      await axios.delete(`${API}/admin/categories/${categoryDialog.category.id}`, headers);
      toast.success(isHindi ? 'हटाई गई' : 'Deleted');
      await fetchCategories();
    } catch (err) { toast.error(err.response?.data?.detail || (isHindi ? 'त्रुटि' : 'Error')); }
    finally { setCategoryDialog({ open: false, category: null }); }
  };

  // ── User actions ──
  const handleUserAction = async () => {
    const { type, user } = userDialog;
    try {
      if (type === 'activate')   await axios.put(`${API}/admin/users/${user.user_id}/activate`, {}, headers);
      if (type === 'deactivate') await axios.put(`${API}/admin/users/${user.user_id}/deactivate`, {}, headers);
      if (type === 'role')       await axios.put(`${API}/admin/users/${user.user_id}/role`, { role: userRoleChange }, headers);
      toast.success(isHindi ? 'अपडेट हुआ' : 'Updated');
      await fetchUsers();
    } catch (err) { toast.error(err.response?.data?.detail || (isHindi ? 'त्रुटि' : 'Error')); }
    finally { setUserDialog({ open: false, type: null, user: null }); }
  };

  // ── Breaking news actions ──
  const handleSetBreaking = async () => {
    if (!breakingText.trim()) return;
    try {
      await axios.put(`${API}/admin/breaking-news`, { text: breakingText }, headers);
      toast.success(isHindi ? 'ब्रेकिंग न्यूज़ सेट हुई' : 'Breaking news set');
      setCurrentBreaking(breakingText.trim());
    } catch (err) { toast.error(isHindi ? 'त्रुटि' : 'Error'); }
  };

  const handleClearBreaking = async () => {
    try {
      await axios.delete(`${API}/admin/breaking-news`, headers);
      toast.success(isHindi ? 'साफ हो गया' : 'Cleared');
      setCurrentBreaking(null); setBreakingText('');
    } catch (err) { toast.error(isHindi ? 'त्रुटि' : 'Error'); }
  };

  // ── Helpers ──
  const fmtDate = (d) => { try { return format(new Date(d), 'MMM dd, yyyy HH:mm'); } catch { return d; } };
  const fmtDateShort = (d) => { try { return format(new Date(d), 'MMM dd, yyyy'); } catch { return d; } };

  const statusBadge = (status) => ({
    published: <span className="status-published flex items-center gap-1"><CheckCircle className="w-3 h-3" />{isHindi ? 'प्रकाशित' : 'Published'}</span>,
    draft:     <span className="status-draft">{isHindi ? 'ड्राफ्ट' : 'Draft'}</span>,
    revoked:   <span className="status-revoked flex items-center gap-1"><XCircle className="w-3 h-3" />{isHindi ? 'रद्द' : 'Revoked'}</span>,
  }[status] || <span className="status-draft">{status}</span>);

  const TABS = [
    { id: 'articles',  label: isHindi ? 'लेख' : 'Articles',       icon: FileText },
    { id: 'reporters', label: isHindi ? 'रिपोर्टर' : 'Reporters', icon: Users,    badge: stats?.pending_reporters },
    { id: 'users',     label: isHindi ? 'उपयोगकर्ता' : 'Users',   icon: Shield },
    { id: 'categories',label: isHindi ? 'श्रेणियां' : 'Categories', icon: Tag },
    { id: 'breaking',  label: isHindi ? 'ब्रेकिंग' : 'Breaking',  icon: Radio },
    { id: 'analytics', label: isHindi ? 'विश्लेषण' : 'Analytics', icon: TrendingUp },
    { id: 'audit',     label: isHindi ? 'ऑडिट' : 'Audit Log',     icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f6]" data-testid="admin-page">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold text-[#2a5a5a] ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
            {t('admin')} {isHindi ? 'डैशबोर्ड' : 'Dashboard'}
          </h1>
          <p className={`text-gray-600 mt-1 ${isHindi ? 'font-hindi' : ''}`}>
            {isHindi ? 'सभी लेख और उपयोगकर्ता प्रबंधित करें' : 'Manage all articles, users, and site settings'}
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6 md:mb-8">
            {[
              { label: isHindi ? 'कुल लेख' : 'Total', value: stats.total_articles, color: 'text-[#2a5a5a]', bg: 'bg-[#2a5a5a]/10', Icon: FileText },
              { label: t('published'), value: stats.published, color: 'text-green-600', bg: 'bg-green-100', Icon: CheckCircle },
              { label: t('drafts'), value: stats.drafts, color: 'text-amber-600', bg: 'bg-amber-100', Icon: BarChart3 },
              { label: isHindi ? 'रद्द' : 'Revoked', value: stats.revoked, color: 'text-red-600', bg: 'bg-red-100', Icon: AlertTriangle },
              { label: isHindi ? 'उपयोगकर्ता' : 'Users', value: stats.total_users, color: 'text-blue-600', bg: 'bg-blue-100', Icon: Users },
              { label: isHindi ? 'रिपोर्टर' : 'Reporters', value: stats.reporters, color: 'text-purple-600', bg: 'bg-purple-100', Icon: FileText },
              { label: isHindi ? 'लंबित' : 'Pending', value: stats.pending_reporters, color: 'text-orange-600', bg: 'bg-orange-100', Icon: Clock },
            ].map(({ label, value, color, bg, Icon }) => (
              <div key={label} className="stat-card !p-3 lg:!p-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 ${bg} rounded flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 leading-tight">{label}</p>
                    <p className={`text-xl font-bold ${color} leading-none mt-0.5`}>{value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === id ? 'text-[#2a5a5a] border-b-2 border-[#2a5a5a]' : 'text-gray-500 hover:text-[#2a5a5a]'}`}
            >
              <Icon className="w-4 h-4" />{label}
              {badge > 0 && <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
            </button>
          ))}
        </div>

        {/* ── ARTICLES TAB ── */}
        {activeTab === 'articles' && (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {['all', 'published', 'draft', 'revoked'].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-colors ${
                      filter === f ? 'bg-[#2a5a5a] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {f === 'all' ? (isHindi ? 'सभी' : 'All') : f === 'revoked' ? (isHindi ? 'रद्द' : 'Revoked') : t(f === 'published' ? 'published' : 'drafts')}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={handleExport} className="text-xs border-[#2a5a5a] text-[#2a5a5a]">
                <Download className="w-3.5 h-3.5 mr-1" />{isHindi ? 'CSV डाउनलोड' : 'Export CSV'}
              </Button>
            </div>

            {/* Bulk actions bar */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3 mb-3 p-3 bg-[#2a5a5a]/5 border border-[#2a5a5a]/20 rounded">
                <span className="text-sm font-semibold text-[#2a5a5a]">{selectedIds.length} {isHindi ? 'चुने गए' : 'selected'}</span>
                <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#2a5a5a]">
                  <option value="">{isHindi ? 'कार्रवाई चुनें' : 'Choose action'}</option>
                  <option value="revoke">{isHindi ? 'रद्द करें' : 'Revoke'}</option>
                  <option value="republish">{isHindi ? 'पुनः प्रकाशित' : 'Republish'}</option>
                  <option value="feature">{isHindi ? 'फ़ीचर करें' : 'Feature'}</option>
                  <option value="unfeature">{isHindi ? 'अन-फ़ीचर करें' : 'Unfeature'}</option>
                  <option value="delete">{isHindi ? 'हटाएं' : 'Delete'}</option>
                </select>
                <Button size="sm" disabled={!bulkAction} onClick={handleBulkAction}
                  className="bg-[#2a5a5a] hover:bg-[#1f4444] text-white text-xs">
                  {isHindi ? 'लागू करें' : 'Apply'}
                </Button>
                <button className="text-xs text-gray-500 hover:text-gray-700" onClick={() => setSelectedIds([])}>
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
              </div>
            )}

            <div className="bg-white border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center"><div className="animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4" /><div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" /></div></div>
              ) : articles.length === 0 ? (
                <div className="p-8 text-center"><FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">{isHindi ? 'कोई लेख नहीं' : 'No articles found'}</p></div>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th><input type="checkbox" checked={selectedIds.length === articles.length && articles.length > 0} onChange={toggleSelectAll} className="rounded" /></th>
                          <th className={isHindi ? 'font-hindi' : ''}>{t('title')}</th>
                          <th className={isHindi ? 'font-hindi' : ''}>{t('author')}</th>
                          <th className={isHindi ? 'font-hindi' : ''}>{t('category')}</th>
                          <th className={isHindi ? 'font-hindi' : ''}>{t('status')}</th>
                          <th className={isHindi ? 'font-hindi' : ''}>{t('views')}</th>
                          <th className={isHindi ? 'font-hindi' : ''}>{isHindi ? 'तारीख' : 'Date'}</th>
                          <th className={isHindi ? 'font-hindi' : ''}>{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {articles.map(article => (
                          <tr key={article.article_id} data-testid={`admin-article-row-${article.article_id}`}
                            className={selectedIds.includes(article.article_id) ? 'bg-[#2a5a5a]/5' : ''}>
                            <td>
                              <input type="checkbox" checked={selectedIds.includes(article.article_id)}
                                onChange={e => setSelectedIds(e.target.checked ? [...selectedIds, article.article_id] : selectedIds.filter(i => i !== article.article_id))}
                                className="rounded" />
                            </td>
                            <td>
                              <div className="max-w-xs flex items-center gap-1.5">
                                {article.pinned && <Pin className="w-3 h-3 text-[#2a5a5a] shrink-0" title="Pinned" />}
                                {article.is_featured && <Star className="w-3 h-3 text-[#f4c430] shrink-0" title="Featured" />}
                                <Link to={`/article/${article.article_id}`} className={`font-semibold text-gray-900 line-clamp-1 hover:text-[#2a5a5a] ${isHindi ? 'font-hindi' : ''}`}>
                                  {isHindi && article.title_hi ? article.title_hi : article.title}
                                </Link>
                              </div>
                            </td>
                            <td className="text-sm text-gray-600">{article.author_name}</td>
                            <td><span className={`category-pill ${isHindi ? 'font-hindi' : ''}`}>{t(article.category.toLowerCase())}</span></td>
                            <td>{statusBadge(article.status)}</td>
                            <td>{article.views || 0}</td>
                            <td className="text-sm text-gray-500 whitespace-nowrap">{fmtDateShort(article.created_at)}</td>
                            <td>
                              <div className="flex items-center gap-1">
                                <Link to={`/article/${article.article_id}`}>
                                  <Button variant="ghost" size="sm" className="text-gray-500 hover:text-[#2a5a5a] p-1.5" title="View"><Eye className="w-3.5 h-3.5" /></Button>
                                </Link>
                                <Button variant="ghost" size="sm"
                                  className={`p-1.5 ${article.is_featured ? 'text-[#f4c430]' : 'text-gray-400 hover:text-[#f4c430]'}`}
                                  title={article.is_featured ? 'Unfeature' : 'Feature'}
                                  onClick={() => setActionDialog({ open: true, type: 'feature', articleId: article.article_id, label: article.title })}>
                                  <Star className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm"
                                  className={`p-1.5 ${article.pinned ? 'text-[#2a5a5a]' : 'text-gray-400 hover:text-[#2a5a5a]'}`}
                                  title={article.pinned ? 'Unpin' : 'Pin to top'}
                                  onClick={() => setActionDialog({ open: true, type: 'pin', articleId: article.article_id, label: article.title })}>
                                  <Pin className="w-3.5 h-3.5" />
                                </Button>
                                {article.status === 'published' && (
                                  <Button variant="ghost" size="sm" className="text-amber-500 hover:text-amber-600 p-1.5" title="Revoke"
                                    onClick={() => setActionDialog({ open: true, type: 'revoke', articleId: article.article_id, label: article.title })}>
                                    <XCircle className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                {article.status === 'revoked' && (
                                  <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 p-1.5" title="Republish"
                                    onClick={() => setActionDialog({ open: true, type: 'republish', articleId: article.article_id, label: article.title })}>
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-600 p-1.5" title="Delete"
                                  onClick={() => setActionDialog({ open: true, type: 'delete', articleId: article.article_id, label: article.title })}>
                                  <Trash2 className="w-3.5 h-3.5" />
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
                    <div className="p-3 bg-gray-50 flex items-center justify-between border-b border-gray-200">
                      <label className="flex items-center gap-2 text-sm text-gray-600 font-medium cursor-pointer">
                        <input type="checkbox" checked={selectedIds.length === articles.length && articles.length > 0} onChange={toggleSelectAll} className="rounded" />
                        {isHindi ? 'सभी चुनें' : 'Select All'}
                      </label>
                    </div>
                    {articles.map(article => (
                      <div key={article.article_id} className={`p-4 flex flex-col gap-3 ${selectedIds.includes(article.article_id) ? 'bg-[#2a5a5a]/5' : 'bg-white'}`}>
                        <div className="flex gap-3 items-start relative">
                          <input type="checkbox" checked={selectedIds.includes(article.article_id)}
                                 onChange={e => setSelectedIds(e.target.checked ? [...selectedIds, article.article_id] : selectedIds.filter(i => i !== article.article_id))}
                                 className="rounded mt-1 shrink-0 cursor-pointer" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              {article.pinned && <Pin className="w-3 h-3 text-[#2a5a5a] shrink-0" />}
                              {article.is_featured && <Star className="w-3 h-3 text-[#f4c430] shrink-0" />}
                              <span className={`category-pill text-[10px] py-0.5 px-2 bg-gray-100 ${isHindi ? 'font-hindi' : ''}`}>{t(article.category.toLowerCase())}</span>
                            </div>
                            <Link to={`/article/${article.article_id}`} className={`font-semibold text-gray-900 line-clamp-2 leading-snug ${isHindi ? 'font-hindi' : ''}`}>
                              {isHindi && article.title_hi ? article.title_hi : article.title}
                            </Link>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-500 pl-7">
                          <span className="font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-[10px]">{article.author_name}</span>
                          <div className="shrink-0">{statusBadge(article.status)}</div>
                          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{article.views || 0}</span>
                          <span>{fmtDateShort(article.created_at)}</span>
                        </div>

                        <div className="flex items-center gap-1 mt-2 pt-3 border-t border-gray-100 pl-7 overflow-x-auto pb-1">
                          <Link to={`/article/${article.article_id}`} className="shrink-0">
                            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-[#2a5a5a] h-8 px-2 bg-gray-50"><Eye className="w-4 h-4" /></Button>
                          </Link>
                          <Button variant="ghost" size="sm"
                            className={`h-8 px-2 shrink-0 bg-gray-50 ${article.is_featured ? 'text-[#f4c430]' : 'text-gray-400 hover:text-[#f4c430]'}`}
                            onClick={() => setActionDialog({ open: true, type: 'feature', articleId: article.article_id, label: article.title })}>
                            <Star className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm"
                            className={`h-8 px-2 shrink-0 bg-gray-50 ${article.pinned ? 'text-[#2a5a5a]' : 'text-gray-400 hover:text-[#2a5a5a]'}`}
                            onClick={() => setActionDialog({ open: true, type: 'pin', articleId: article.article_id, label: article.title })}>
                            <Pin className="w-4 h-4" />
                          </Button>
                          {article.status === 'published' && (
                            <Button variant="ghost" size="sm" className="text-amber-500 hover:text-amber-600 h-8 px-2 shrink-0 bg-gray-50"
                              onClick={() => setActionDialog({ open: true, type: 'revoke', articleId: article.article_id, label: article.title })}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {article.status === 'revoked' && (
                            <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 h-8 px-2 shrink-0 bg-gray-50"
                              onClick={() => setActionDialog({ open: true, type: 'republish', articleId: article.article_id, label: article.title })}>
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-600 h-8 px-2 ml-auto shrink-0 bg-red-50"
                            onClick={() => setActionDialog({ open: true, type: 'delete', articleId: article.article_id, label: article.title })}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── REPORTERS TAB ── */}
        {activeTab === 'reporters' && (
          <>
            <div className="flex gap-2 mb-4 flex-wrap">
              {['all', 'pending', 'approved', 'rejected'].map(f => (
                <button key={f} onClick={() => setReporterFilter(f)}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-colors ${
                    reporterFilter === f ? 'bg-[#2a5a5a] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f === 'all' ? (isHindi ? 'सभी' : 'All') : f === 'pending' ? (isHindi ? 'लंबित' : 'Pending') : f === 'approved' ? (isHindi ? 'स्वीकृत' : 'Approved') : (isHindi ? 'अस्वीकृत' : 'Rejected')}
                </button>
              ))}
            </div>
            <div className="bg-white border border-gray-200 overflow-x-auto">
              {loading ? <div className="p-8 text-center animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" /></div>
              : reporters.length === 0 ? <div className="p-8 text-center"><Users className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">{isHindi ? 'कोई रिपोर्टर नहीं' : 'No reporters found'}</p></div>
              : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="data-table">
                      <thead><tr>
                        <th>{isHindi ? 'नाम' : 'Name'}</th>
                        <th>{isHindi ? 'ईमेल' : 'Email'}</th>
                        <th>{isHindi ? 'स्थिति' : 'Status'}</th>
                        <th>{isHindi ? 'तारीख' : 'Joined'}</th>
                        <th>{t('actions')}</th>
                      </tr></thead>
                      <tbody>
                        {reporters.map(r => (
                          <tr key={r.user_id}>
                            <td className="font-semibold text-gray-900">{r.name}</td>
                            <td className="text-sm text-gray-600">{r.email}</td>
                            <td>
                              {r.status === 'pending'  && <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded"><Clock className="w-3 h-3" />{isHindi ? 'लंबित' : 'Pending'}</span>}
                              {r.status === 'approved' && <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded"><CheckCircle className="w-3 h-3" />{isHindi ? 'स्वीकृत' : 'Approved'}</span>}
                              {r.status === 'rejected' && <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded"><XCircle className="w-3 h-3" />{isHindi ? 'अस्वीकृत' : 'Rejected'}</span>}
                            </td>
                            <td className="text-sm text-gray-500 whitespace-nowrap">{fmtDateShort(r.created_at)}</td>
                            <td>
                              <div className="flex gap-2">
                                {r.status !== 'approved' && (
                                  <Button variant="ghost" size="sm" className="text-green-600 hover:bg-green-50 p-1.5"
                                    onClick={() => setReporterDialog({ open: true, type: 'approve', reporter: r })} title="Approve">
                                    <UserCheck className="w-4 h-4" />
                                  </Button>
                                )}
                                {r.status !== 'rejected' && (
                                  <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 p-1.5"
                                    onClick={() => setReporterDialog({ open: true, type: 'reject', reporter: r })} title="Reject">
                                    <UserX className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile Card View for Reporters */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {reporters.map(r => (
                      <div key={r.user_id} className="p-4 bg-white flex flex-col gap-2">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="font-semibold text-gray-900">{r.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{r.email}</p>
                          </div>
                          <div className="shrink-0">
                            {r.status === 'pending'  && <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded"><Clock className="w-3 h-3" />{isHindi ? 'लंबित' : 'Pending'}</span>}
                            {r.status === 'approved' && <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded"><CheckCircle className="w-3 h-3" />{isHindi ? 'स्वीकृत' : 'Approved'}</span>}
                            {r.status === 'rejected' && <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded"><XCircle className="w-3 h-3" />{isHindi ? 'अस्वीकृत' : 'Rejected'}</span>}
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-3 border-t border-gray-50">
                          <span className="text-xs text-gray-400">{fmtDateShort(r.created_at)}</span>
                          <div className="flex gap-2">
                            {r.status !== 'approved' && (
                              <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50 h-8 px-3"
                                onClick={() => setReporterDialog({ open: true, type: 'approve', reporter: r })}>
                                <UserCheck className="w-3.5 h-3.5 mr-1" /> Approve
                              </Button>
                            )}
                            {r.status !== 'rejected' && (
                              <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 h-8 px-3"
                                onClick={() => setReporterDialog({ open: true, type: 'reject', reporter: r })}>
                                <UserX className="w-3.5 h-3.5 mr-1" /> Reject
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === 'users' && (
          <>
            <div className="flex gap-2 mb-4">
              {['all', 'admin', 'reporter'].map(f => (
                <button key={f} onClick={() => setUserRoleFilter(f)}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-colors ${
                    userRoleFilter === f ? 'bg-[#2a5a5a] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f === 'all' ? (isHindi ? 'सभी' : 'All') : f === 'admin' ? 'Admin' : (isHindi ? 'रिपोर्टर' : 'Reporter')}
                </button>
              ))}
            </div>
            <div className="bg-white border border-gray-200 overflow-x-auto">
              {loading ? <div className="p-8 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" /></div>
              : users.length === 0 ? <div className="p-8 text-center"><Users className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">{isHindi ? 'कोई उपयोगकर्ता नहीं' : 'No users found'}</p></div>
              : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="data-table">
                      <thead><tr>
                        <th>{isHindi ? 'नाम' : 'Name'}</th>
                        <th>{isHindi ? 'ईमेल' : 'Email'}</th>
                        <th>{isHindi ? 'भूमिका' : 'Role'}</th>
                        <th>{isHindi ? 'स्थिति' : 'Status'}</th>
                        <th>{isHindi ? 'सक्रिय' : 'Active'}</th>
                        <th>{isHindi ? 'तारीख' : 'Joined'}</th>
                        <th>{t('actions')}</th>
                      </tr></thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.user_id}>
                            <td className="font-semibold text-gray-900">{u.name}</td>
                            <td className="text-sm text-gray-600">{u.email}</td>
                            <td>
                              <span className={`text-xs font-bold px-2 py-1 rounded ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {u.role}
                              </span>
                            </td>
                            <td>
                              {u.status === 'approved' && <span className="text-xs font-semibold text-green-600">{isHindi ? 'स्वीकृत' : 'Approved'}</span>}
                              {u.status === 'pending'  && <span className="text-xs font-semibold text-amber-600">{isHindi ? 'लंबित' : 'Pending'}</span>}
                              {u.status === 'rejected' && <span className="text-xs font-semibold text-red-600">{isHindi ? 'अस्वीकृत' : 'Rejected'}</span>}
                            </td>
                            <td>
                              {u.is_active
                                ? <span className="text-xs font-semibold text-green-600">{isHindi ? 'हाँ' : 'Yes'}</span>
                                : <span className="text-xs font-semibold text-red-600">{isHindi ? 'नहीं' : 'No'}</span>}
                            </td>
                            <td className="text-sm text-gray-500 whitespace-nowrap">{fmtDateShort(u.created_at)}</td>
                            <td>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="text-blue-500 hover:bg-blue-50 p-1.5" title="Change role"
                                  onClick={() => { setUserRoleChange(u.role); setUserDialog({ open: true, type: 'role', user: u }); }}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                {u.is_active
                                  ? <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 p-1.5" title="Deactivate"
                                      onClick={() => setUserDialog({ open: true, type: 'deactivate', user: u })}>
                                      <XCircle className="w-3.5 h-3.5" />
                                    </Button>
                                  : <Button variant="ghost" size="sm" className="text-green-600 hover:bg-green-50 p-1.5" title="Activate"
                                      onClick={() => setUserDialog({ open: true, type: 'activate', user: u })}>
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    </Button>
                                }
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View for Users */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {users.map(u => (
                      <div key={u.user_id} className="p-4 bg-white flex flex-col gap-2">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="font-semibold text-gray-900 leading-tight">{u.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                          </div>
                          <div className="shrink-0 flex flex-col gap-1 items-end">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {u.role.toUpperCase()}
                            </span>
                            {u.is_active
                              ? <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{isHindi ? 'सक्रिय' : 'Active'}</span>
                              : <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{isHindi ? 'निष्क्रिय' : 'Inactive'}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1">
                          <span>
                            {u.status === 'approved' && <span className="font-semibold text-green-600">{isHindi ? 'स्वीकृत' : 'Approved'}</span>}
                            {u.status === 'pending'  && <span className="font-semibold text-amber-600">{isHindi ? 'लंबित' : 'Pending'}</span>}
                            {u.status === 'rejected' && <span className="font-semibold text-red-600">{isHindi ? 'अस्वीकृत' : 'Rejected'}</span>}
                          </span>
                          <span>•</span>
                          <span>{fmtDateShort(u.created_at)}</span>
                        </div>
                        <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-gray-50">
                          <Button variant="outline" size="sm" className="text-blue-500 border-blue-200 hover:bg-blue-50 h-8 px-2"
                            onClick={() => { setUserRoleChange(u.role); setUserDialog({ open: true, type: 'role', user: u }); }}>
                            <Pencil className="w-3 h-3 mr-1" /> Role
                          </Button>
                          {u.is_active
                            ? <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 h-8 px-2"
                                onClick={() => setUserDialog({ open: true, type: 'deactivate', user: u })}>
                                <XCircle className="w-3 h-3 mr-1" /> Deactivate
                              </Button>
                            : <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50 h-8 px-2"
                                onClick={() => setUserDialog({ open: true, type: 'activate', user: u })}>
                                <CheckCircle className="w-3 h-3 mr-1" /> Activate
                              </Button>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── CATEGORIES TAB ── */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 p-6">
              <h2 className={`text-lg font-bold text-[#2a5a5a] mb-4 flex items-center gap-2 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
                <Tag className="w-5 h-5" />
                {editingCategory ? (isHindi ? 'श्रेणी संपादित करें' : 'Edit Category') : (isHindi ? 'नई श्रेणी जोड़ें' : 'Add New Category')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {!editingCategory && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">ID <span className="text-red-500">*</span> <span className="text-xs font-normal text-gray-400">(e.g. sports)</span></label>
                    <input type="text" value={categoryForm.id}
                      onChange={e => setCategoryForm(p => ({ ...p, id: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                      placeholder="category_id" className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#2a5a5a]" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{isHindi ? 'नाम (अंग्रेजी)' : 'Name (English)'} <span className="text-red-500">*</span></label>
                  <input type="text" value={categoryForm.name} onChange={e => setCategoryForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Sports" className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#2a5a5a]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 font-hindi">{isHindi ? 'नाम (हिंदी)' : 'Name (Hindi)'} <span className="text-red-500">*</span></label>
                  <input type="text" value={categoryForm.name_hi} onChange={e => setCategoryForm(p => ({ ...p, name_hi: e.target.value }))}
                    placeholder="खेल" className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm font-hindi focus:outline-none focus:border-[#2a5a5a]" />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button onClick={handleSaveCategory} disabled={!categoryForm.name || !categoryForm.name_hi || (!editingCategory && !categoryForm.id)}
                  className="bg-[#2a5a5a] hover:bg-[#1f4444] text-white">
                  <Plus className="w-4 h-4 mr-2" />{editingCategory ? (isHindi ? 'अपडेट करें' : 'Update') : (isHindi ? 'जोड़ें' : 'Add')}
                </Button>
                {editingCategory && (
                  <Button variant="outline" onClick={() => { setEditingCategory(null); setCategoryForm({ id: '', name: '', name_hi: '' }); }}>
                    {isHindi ? 'रद्द करें' : 'Cancel'}
                  </Button>
                )}
              </div>
            </div>
            <div className="bg-white border border-gray-200 overflow-x-auto">
              {categories.length === 0 ? (
                <div className="p-8 text-center"><Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">{isHindi ? 'कोई श्रेणी नहीं' : 'No categories'}</p></div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>ID</th><th>{isHindi ? 'नाम (अंग्रेजी)' : 'Name (English)'}</th><th>{isHindi ? 'नाम (हिंदी)' : 'Name (Hindi)'}</th><th>{t('actions')}</th></tr></thead>
                  <tbody>
                    {categories.map(cat => (
                      <tr key={cat.id}>
                        <td><code className="text-xs bg-gray-100 px-2 py-1 rounded">{cat.id}</code></td>
                        <td className="font-semibold">{cat.name}</td>
                        <td className="font-hindi">{cat.name_hi}</td>
                        <td>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="text-blue-500 hover:bg-blue-50 p-1.5"
                              onClick={() => { setEditingCategory(cat.id); setCategoryForm({ id: cat.id, name: cat.name, name_hi: cat.name_hi }); }}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5"
                              onClick={() => setCategoryDialog({ open: true, category: cat })}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── BREAKING NEWS TAB ── */}
        {activeTab === 'breaking' && (
          <div className="space-y-6">
            {currentBreaking && (
              <div className="bg-red-50 border border-red-200 rounded p-4 flex items-start gap-3">
                <Radio className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">{isHindi ? 'वर्तमान ब्रेकिंग न्यूज़' : 'Current Breaking News'}</p>
                  <p className={`text-gray-900 font-semibold ${isHindi ? 'font-hindi' : ''}`}>{currentBreaking}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleClearBreaking} className="border-red-300 text-red-600 hover:bg-red-100 shrink-0">
                  <XCircle className="w-4 h-4 mr-1" />{isHindi ? 'हटाएं' : 'Clear'}
                </Button>
              </div>
            )}
            <div className="bg-white border border-gray-200 p-6">
              <h2 className={`text-lg font-bold text-[#2a5a5a] mb-4 flex items-center gap-2 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
                <Radio className="w-5 h-5" />{isHindi ? 'ब्रेकिंग न्यूज़ सेट करें' : 'Set Breaking News Ticker'}
              </h2>
              <p className={`text-sm text-gray-500 mb-4 ${isHindi ? 'font-hindi' : ''}`}>
                {isHindi ? 'यह टेक्स्ट साइट के हेडर में स्क्रॉल होकर दिखेगा।' : 'This text will scroll across the site header for all visitors.'}
              </p>
              <textarea value={breakingText} onChange={e => setBreakingText(e.target.value)} rows={3}
                placeholder={isHindi ? 'ब्रेकिंग न्यूज़ टेक्स्ट यहाँ लिखें...' : 'Enter breaking news text here...'}
                className={`w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#2a5a5a] mb-4 ${isHindi ? 'font-hindi' : ''}`} />
              <Button onClick={handleSetBreaking} disabled={!breakingText.trim()} className="bg-red-600 hover:bg-red-700 text-white">
                <Radio className="w-4 h-4 mr-2" />{isHindi ? 'प्रकाशित करें' : 'Publish Ticker'}
              </Button>
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {loading ? <div className="p-8 text-center animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-4" /><div className="h-4 bg-gray-200 rounded w-1/3 mx-auto" /></div>
            : !analytics ? <div className="p-8 text-center text-gray-500">{isHindi ? 'डेटा नहीं मिला' : 'No data'}</div>
            : (
              <>
                <div className="bg-white border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">{isHindi ? 'कुल दृश्य (प्रकाशित लेख)' : 'Total Views (Published Articles)'}</p>
                  <p className="text-4xl font-bold text-[#2a5a5a]">{analytics.total_views?.toLocaleString()}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Articles */}
                  <div className="bg-white border border-gray-200 p-4">
                    <h3 className={`font-bold text-[#2a5a5a] mb-3 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
                      {isHindi ? 'शीर्ष लेख' : 'Top Articles'}
                    </h3>
                    <div className="space-y-2">
                      {analytics.topArticles?.map((a, i) => (
                        <div key={a.article_id} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <Link to={`/article/${a.article_id}`} className="text-sm font-semibold text-gray-900 hover:text-[#2a5a5a] line-clamp-1">{a.title}</Link>
                            <p className="text-xs text-gray-500">{a.author_name} · <span className="category-pill text-xs py-0">{a.category}</span></p>
                          </div>
                          <span className="text-sm font-bold text-[#2a5a5a] shrink-0">{a.views?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Views by Category */}
                  <div className="bg-white border border-gray-200 p-4">
                    <h3 className={`font-bold text-[#2a5a5a] mb-3 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
                      {isHindi ? 'श्रेणी अनुसार दृश्य' : 'Views by Category'}
                    </h3>
                    <div className="space-y-2">
                      {analytics.viewsByCategory?.map(c => {
                        const pct = analytics.total_views > 0 ? Math.round((c.total_views / analytics.total_views) * 100) : 0;
                        return (
                          <div key={c.category}>
                            <div className="flex justify-between text-sm mb-0.5">
                              <span className="capitalize font-semibold">{c.category}</span>
                              <span className="text-gray-500">{c.total_views?.toLocaleString()} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className="bg-[#2a5a5a] h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reporter Leaderboard */}
                  <div className="bg-white border border-gray-200 p-4">
                    <h3 className={`font-bold text-[#2a5a5a] mb-3 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
                      {isHindi ? 'रिपोर्टर लीडरबोर्ड' : 'Reporter Leaderboard'}
                    </h3>
                    <div className="space-y-2">
                      {analytics.reporterLeaderboard?.map((r, i) => (
                        <div key={r.author_id} className="flex items-center gap-3">
                          <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${i === 0 ? 'bg-[#f4c430] text-[#2a5a5a]' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-300 text-orange-800' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                          <span className="flex-1 text-sm font-semibold text-gray-900">{r.author_name}</span>
                          <span className="text-xs text-gray-500">{r.article_count} {isHindi ? 'लेख' : 'articles'}</span>
                          <span className="text-sm font-bold text-[#2a5a5a]">{r.total_views?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Articles over time */}
                  <div className="bg-white border border-gray-200 p-4">
                    <h3 className={`font-bold text-[#2a5a5a] mb-3 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
                      {isHindi ? 'पिछले 30 दिन (लेख)' : 'Last 30 Days (Articles Published)'}
                    </h3>
                    {analytics.articlesOverTime?.length === 0
                      ? <p className="text-sm text-gray-400">{isHindi ? 'कोई डेटा नहीं' : 'No data'}</p>
                      : (
                        <div className="flex items-end gap-1 h-24">
                          {analytics.articlesOverTime?.map(d => {
                            const max = Math.max(...analytics.articlesOverTime.map(x => x.count));
                            const h = max > 0 ? Math.max(4, Math.round((d.count / max) * 96)) : 4;
                            return (
                              <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count}`}>
                                <div className="w-full bg-[#2a5a5a] rounded-t" style={{ height: h }} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── AUDIT LOG TAB ── */}
        {activeTab === 'audit' && (
          <div className="bg-white border border-gray-200 overflow-x-auto">
            {loading ? <div className="p-8 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" /></div>
            : auditLogs.length === 0 ? <div className="p-8 text-center"><Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">{isHindi ? 'कोई लॉग नहीं' : 'No audit logs yet'}</p></div>
            : (
              <table className="data-table">
                <thead><tr>
                  <th>{isHindi ? 'कार्रवाई' : 'Action'}</th>
                  <th>{isHindi ? 'प्रकार' : 'Entity'}</th>
                  <th>{isHindi ? 'लेबल' : 'Label'}</th>
                  <th>{isHindi ? 'किसने किया' : 'Performed By'}</th>
                  <th>{isHindi ? 'विवरण' : 'Details'}</th>
                  <th>{isHindi ? 'समय' : 'Time'}</th>
                </tr></thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td><code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-800">{log.action}</code></td>
                      <td><span className="text-xs text-gray-500">{log.entity_type}</span></td>
                      <td className="text-sm text-gray-800 max-w-xs truncate">{log.entity_label || '—'}</td>
                      <td className="text-sm font-semibold text-gray-800">{log.performed_by_name}</td>
                      <td className="text-xs text-gray-500">{log.details || '—'}</td>
                      <td className="text-xs text-gray-500 whitespace-nowrap">{fmtDate(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>

      {/* ── DIALOGS ── */}

      {/* Article action dialog */}
      <AlertDialog open={actionDialog.open} onOpenChange={() => setActionDialog({ open: false, type: null, articleId: null, label: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={isHindi ? 'font-hindi-heading' : 'font-heading'}>
              {actionDialog.type === 'delete'    && (isHindi ? 'लेख हटाएं?' : 'Delete Article?')}
              {actionDialog.type === 'revoke'    && (isHindi ? 'लेख रद्द करें?' : 'Revoke Article?')}
              {actionDialog.type === 'republish' && (isHindi ? 'पुनः प्रकाशित करें?' : 'Republish Article?')}
              {actionDialog.type === 'feature'   && (isHindi ? 'फ़ीचर टॉगल करें?' : 'Toggle Feature?')}
              {actionDialog.type === 'pin'       && (isHindi ? 'पिन टॉगल करें?' : 'Toggle Pin?')}
            </AlertDialogTitle>
            <AlertDialogDescription className={isHindi ? 'font-hindi' : ''}>
              <span className="font-semibold">"{actionDialog.label}"</span>
              {actionDialog.type === 'delete'    && (isHindi ? ' — यह क्रिया पूर्ववत नहीं की जा सकती।' : ' — This cannot be undone.')}
              {actionDialog.type === 'revoke'    && (isHindi ? ' — लेख सार्वजनिक दृश्य से हट जाएगा।' : ' — This will remove it from public view.')}
              {actionDialog.type === 'republish' && (isHindi ? ' — लेख पुनः प्रकाशित होगा।' : ' — This will make it publicly visible again.')}
              {actionDialog.type === 'feature'   && (isHindi ? ' — फ़ीचर्ड स्थिति बदलेगी।' : ' — Featured status will be toggled.')}
              {actionDialog.type === 'pin'       && (isHindi ? ' — पिन स्थिति बदलेगी।' : ' — Pin status will be toggled.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isHindi ? 'रद्द करें' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => articleAction(actionDialog.type, actionDialog.articleId, actionDialog.label)}
              className={actionDialog.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : actionDialog.type === 'revoke' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#2a5a5a] hover:bg-[#1f4444]'}>
              {actionDialog.type === 'delete'    && (isHindi ? 'हटाएं' : 'Delete')}
              {actionDialog.type === 'revoke'    && (isHindi ? 'रद्द करें' : 'Revoke')}
              {actionDialog.type === 'republish' && (isHindi ? 'प्रकाशित करें' : 'Republish')}
              {actionDialog.type === 'feature'   && (isHindi ? 'टॉगल करें' : 'Toggle')}
              {actionDialog.type === 'pin'       && (isHindi ? 'टॉगल करें' : 'Toggle')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reporter approve/reject dialog */}
      <AlertDialog open={reporterDialog.open} onOpenChange={() => setReporterDialog({ open: false, type: null, reporter: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={isHindi ? 'font-hindi-heading' : 'font-heading'}>
              {reporterDialog.type === 'approve' ? (isHindi ? 'रिपोर्टर स्वीकृत करें?' : 'Approve Reporter?') : (isHindi ? 'रिपोर्टर अस्वीकृत करें?' : 'Reject Reporter?')}
            </AlertDialogTitle>
            <AlertDialogDescription className={isHindi ? 'font-hindi' : ''}>
              {reporterDialog.type === 'approve'
                ? (isHindi ? `${reporterDialog.reporter?.name} को लेख प्रकाशित करने की अनुमति मिलेगी।` : `${reporterDialog.reporter?.name} will be allowed to publish articles.`)
                : (isHindi ? `${reporterDialog.reporter?.name} लेख प्रकाशित नहीं कर पाएंगे।` : `${reporterDialog.reporter?.name} will not be able to publish articles.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isHindi ? 'रद्द करें' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleReporterAction}
              className={reporterDialog.type === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
              {reporterDialog.type === 'approve' ? (isHindi ? 'स्वीकृत करें' : 'Approve') : (isHindi ? 'अस्वीकृत करें' : 'Reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category delete dialog */}
      <AlertDialog open={categoryDialog.open} onOpenChange={() => setCategoryDialog({ open: false, category: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={isHindi ? 'font-hindi-heading' : 'font-heading'}>{isHindi ? 'श्रेणी हटाएं?' : 'Delete Category?'}</AlertDialogTitle>
            <AlertDialogDescription className={isHindi ? 'font-hindi' : ''}>
              {isHindi ? `"${categoryDialog.category?.name}" हटाई जाएगी। यदि कोई लेख इसका उपयोग कर रहा है तो यह नहीं हो सकता।` : `"${categoryDialog.category?.name}" will be deleted. Cannot delete if articles are using it.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isHindi ? 'रद्द करें' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-red-600 hover:bg-red-700">{isHindi ? 'हटाएं' : 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User action dialog */}
      <AlertDialog open={userDialog.open} onOpenChange={() => setUserDialog({ open: false, type: null, user: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={isHindi ? 'font-hindi-heading' : 'font-heading'}>
              {userDialog.type === 'role'       && (isHindi ? 'भूमिका बदलें' : 'Change Role')}
              {userDialog.type === 'activate'   && (isHindi ? 'उपयोगकर्ता सक्रिय करें?' : 'Activate User?')}
              {userDialog.type === 'deactivate' && (isHindi ? 'उपयोगकर्ता निष्क्रिय करें?' : 'Deactivate User?')}
            </AlertDialogTitle>
            <AlertDialogDescription className={isHindi ? 'font-hindi' : ''}>
              <span className="font-semibold">{userDialog.user?.name}</span>
              {userDialog.type === 'role' && (
                <div className="mt-3">
                  <label className="block text-sm font-semibold mb-2">{isHindi ? 'नई भूमिका' : 'New Role'}</label>
                  <select value={userRoleChange} onChange={e => setUserRoleChange(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none">
                    <option value="reporter">Reporter</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}
              {userDialog.type === 'deactivate' && (isHindi ? ' — यह उपयोगकर्ता लॉगिन नहीं कर पाएगा।' : ' — This user will not be able to log in.')}
              {userDialog.type === 'activate'   && (isHindi ? ' — उपयोगकर्ता फिर से लॉगिन कर पाएगा।' : ' — This user will be able to log in again.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isHindi ? 'रद्द करें' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleUserAction}
              className={userDialog.type === 'deactivate' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#2a5a5a] hover:bg-[#1f4444]'}>
              {userDialog.type === 'role'       && (isHindi ? 'अपडेट करें' : 'Update')}
              {userDialog.type === 'activate'   && (isHindi ? 'सक्रिय करें' : 'Activate')}
              {userDialog.type === 'deactivate' && (isHindi ? 'निष्क्रिय करें' : 'Deactivate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}