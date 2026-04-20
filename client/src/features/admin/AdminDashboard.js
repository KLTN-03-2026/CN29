import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
    BarChart3,
    Bell,
    BookOpen,
    BriefcaseBusiness,
    Building2,
    ChevronDown,
    ClipboardList,
    FileStack,
    History,
    LayoutDashboard,
    LogOut,
    Menu,
    Moon,
    Sun,
    UserRound,
    Users,
    X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE as CLIENT_API_BASE } from '../../config/apiBase';
import { useDarkMode } from '../../context/DarkModeContext';
import AdminCompaniesPage from './pages/AdminCompaniesPage';
import AdminJobsPage from './pages/AdminJobsPage';
import AdminOverviewPage from './pages/AdminOverviewPage';
import AdminProfilePage from './pages/AdminProfilePage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage';
import AdminCareerGuidePostsPage from './pages/AdminCareerGuidePostsPage';
import AdminTemplatesPage from './pages/AdminTemplatesPage';
import AdminUsersPage from './pages/AdminUsersPage';
import EmployerHeaderShell from '../shared/components/EmployerHeaderShell';
import AdminHeaderRightActions from '../shared/components/AdminHeaderRightActions';
import './AdminDashboard.css';

const readStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
        return {};
    }
};

const normalizeAvatarUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && raw.startsWith('http://')) {
        return `https://${raw.slice(7)}`;
    }
    return raw;
};

const withAvatarVersion = (url, version) => {
    const raw = normalizeAvatarUrl(url);
    if (!raw) return '';

    const versionNumber = Number(version || 0);
    if (!Number.isFinite(versionNumber) || versionNumber <= 0) {
        return raw;
    }

    const separator = raw.includes('?') ? '&' : '?';
    return `${raw}${separator}v=${versionNumber}`;
};

const safeNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const parseDateSafe = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const formatRelativeTime = (value, t) => {
    const date = value instanceof Date ? value : parseDateSafe(value);
    if (!date) return t('admin.time.noTimestamp');

    const diffInMs = Date.now() - date.getTime();
    if (diffInMs < 60 * 1000) return t('admin.time.justNow');

    const minutes = Math.floor(diffInMs / (60 * 1000));
    if (minutes < 60) return t('admin.time.minutesAgo', { count: minutes });

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('admin.time.hoursAgo', { count: hours });

    const days = Math.floor(hours / 24);
    if (days < 30) return t('admin.time.daysAgo', { count: days });

    const months = Math.floor(days / 30);
    if (months < 12) return t('admin.time.monthsAgo', { count: months });

    const years = Math.floor(months / 12);
    return t('admin.time.yearsAgo', { count: years });
};

const getTemplateName = (template, index = 0) => {
    const name = template?.TenTemplate
        || template?.TemplateName
        || template?.name
        || template?.Slug
        || template?.slug;
    return String(name || `Template ${index + 1}`);
};

const getTemplateUsage = (template) => safeNumber(
    template?.SoLuotSuDung
    ?? template?.LuotSuDung
    ?? template?.TongLuotSuDung
    ?? template?.UsageCount
    ?? template?.useCount
    ?? template?.usedCount
    ?? template?.so_luot_su_dung
    ?? 0
);

const getTemplateCreatedAt = (template) => parseDateSafe(
    template?.NgayTao
    || template?.NgayCapNhat
    || template?.createdAt
    || template?.updatedAt
    || template?.ngay_tao
    || template?.created_at
);

const menuItems = [
    { key: 'dashboard', icon: LayoutDashboard, labelKey: 'admin.menu.dashboard', to: '/admin/dashboard' },
    { key: 'users', icon: Users, labelKey: 'admin.menu.users', to: '/admin/usersmanament' },
    { key: 'jobs', icon: BriefcaseBusiness, labelKey: 'admin.menu.jobs', to: '/admin/jobs' },
    { key: 'companies', icon: Building2, labelKey: 'admin.menu.companies', to: '/admin/companies' },
    {
        key: 'templates',
        icon: FileStack,
        labelKey: 'admin.menu.templates',
        children: [
            { key: 'templates-all', labelKey: 'admin.menu.templatesAll', to: '/admin/templates', exact: true },
            { key: 'templates-create', labelKey: 'admin.menu.templatesCreate', to: '/admin/templates/create' }
        ]
    },
    { key: 'reports', icon: ClipboardList, labelKey: 'admin.menu.reports', to: '/admin/reports' },
    { key: 'career-guide-posts', icon: BookOpen, labelKey: 'admin.menu.careerGuidePosts', to: '/admin/career-guide-posts' },
    { key: 'audit-logs', icon: History, labelKey: 'admin.menu.auditLogs', to: '/admin/audit-logs' },
    { key: 'profile', icon: UserRound, labelKey: 'admin.menu.profile', to: '/admin/profile' }
];

const SIDEBAR_LOGO_URL = 'https://i.postimg.cc/nhWfcVvh/logo.png';

const resolvePageTitleKey = (pathname) => {
    const normalizedPath = String(pathname || '').trim().toLowerCase();

    if (normalizedPath.includes('/career-guide-posts')) return 'admin.pageTitle.careerGuidePosts';
    if (normalizedPath.includes('/audit-logs')) return 'admin.pageTitle.auditLogs';
    if (normalizedPath.includes('/templates')) return 'admin.pageTitle.templates';
    if (normalizedPath.includes('/usersmanament')) return 'admin.pageTitle.users';
    if (normalizedPath.includes('/companies')) return 'admin.pageTitle.companies';
    if (normalizedPath.includes('/jobs')) return 'admin.pageTitle.jobs';
    if (normalizedPath.includes('/reports')) return 'admin.pageTitle.reports';
    if (normalizedPath.includes('/profile')) return 'admin.pageTitle.profile';
    return 'admin.pageTitle.dashboard';
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const { isDarkMode, setTheme, toggleDarkMode } = useDarkMode();

    const normalizedLanguage = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase();
    const isEnglish = normalizedLanguage.startsWith('en');
    const currentLocale = isEnglish ? 'en-US' : 'vi-VN';

    const API_BASE = CLIENT_API_BASE;
    const token = String(localStorage.getItem('token') || '').trim();

    const [user, setUser] = useState(() => readStoredUser());

    useEffect(() => {
        const refreshUser = (event) => {
            const stored = readStoredUser();
            if (event?.detail && typeof event.detail === 'object') {
                setUser({ ...stored, ...event.detail });
                return;
            }
            setUser(stored);
        };

        window.addEventListener('storage', refreshUser);
        window.addEventListener('jobfinder:user-updated', refreshUser);

        return () => {
            window.removeEventListener('storage', refreshUser);
            window.removeEventListener('jobfinder:user-updated', refreshUser);
        };
    }, []);

    const isSuperAdmin = (
        user?.isSuperAdmin === true
        || user?.isSuperAdmin === 1
        || user?.isSuperAdmin === '1'
        || user?.IsSuperAdmin === true
        || user?.IsSuperAdmin === 1
        || user?.IsSuperAdmin === '1'
    );
    const currentRole = user?.role || user?.VaiTro || user?.vaiTro || user?.LoaiNguoiDung || '';
    const normalizedCurrentRole = String(currentRole || '').trim().toLowerCase();
    const isAdmin = isSuperAdmin || normalizedCurrentRole.includes('quản trị') || normalizedCurrentRole.includes('quan tri');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth <= 1280;
    });
    const [openMenus, setOpenMenus] = useState(() => ({
        templates: location.pathname.startsWith('/admin/templates')
    }));
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

    const [counts, setCounts] = useState({});
    const [users, setUsers] = useState([]);
    const [roleFilter, setRoleFilter] = useState('all');
    const [jobs, setJobs] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [reports, setReports] = useState([]);
    const [careerGuidePosts, setCareerGuidePosts] = useState([]);
    const [templates, setTemplates] = useState([]);

    const confirmResolveRef = useRef(null);
    const profileMenuRef = useRef(null);
    const [confirmState, setConfirmState] = useState({
        open: false,
        title: 'Xác nhận',
        message: '',
        confirmText: 'OK',
        cancelText: 'Hủy'
    });

    const requestConfirm = (opts = {}) => {
        return new Promise((resolve) => {
            confirmResolveRef.current = resolve;
            setConfirmState({
                open: true,
                title: opts.title || 'Xác nhận',
                message: opts.message || '',
                confirmText: opts.confirmText || 'OK',
                cancelText: opts.cancelText || 'Hủy'
            });
        });
    };

    const closeConfirm = (result) => {
        const resolve = confirmResolveRef.current;
        confirmResolveRef.current = null;
        setConfirmState((prev) => ({ ...prev, open: false }));
        if (typeof resolve === 'function') resolve(result);
    };

    const authHeaders = useMemo(() => {
        const base = {
            'Content-Type': 'application/json'
        };
        if (token) {
            base.Authorization = `Bearer ${token}`;
        }
        return base;
    }, [token]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const loadAll = async () => {
        setLoading(true);
        setError('');
        try {
            const [ov, us, js, cs, rs, cgp, ts] = await Promise.all([
                fetch(`${API_BASE}/api/admin/overview`, { headers: authHeaders }),
                fetch(`${API_BASE}/api/admin/users?limit=50`, { headers: authHeaders }),
                fetch(`${API_BASE}/api/admin/jobs?limit=50`, { headers: authHeaders }),
                fetch(`${API_BASE}/api/admin/companies?limit=50`, { headers: authHeaders }),
                fetch(`${API_BASE}/api/admin/reports?limit=50`, { headers: authHeaders }),
                fetch(`${API_BASE}/api/admin/career-guide-posts?limit=100`, { headers: authHeaders }),
                fetch(`${API_BASE}/api/admin/templates?limit=200&offset=0`, { headers: authHeaders })
            ]);

            const ovData = await ov.json().catch(() => null);
            const usData = await us.json().catch(() => null);
            const jsData = await js.json().catch(() => null);
            const csData = await cs.json().catch(() => null);
            const rsData = await rs.json().catch(() => null);
            const cgpData = await cgp.json().catch(() => null);
            const tsData = await ts.json().catch(() => null);

            if (!ov.ok) throw new Error(ovData?.error || 'Không tải được thống kê');
            if (!us.ok) throw new Error(usData?.error || 'Không tải được người dùng');
            if (!js.ok) throw new Error(jsData?.error || 'Không tải được tin tuyển dụng');
            if (!cs.ok) throw new Error(csData?.error || 'Không tải được công ty');
            if (!rs.ok) throw new Error(rsData?.error || 'Không tải được báo cáo');
            if (!cgp.ok) throw new Error(cgpData?.error || 'Không tải được bài viết hướng nghiệp');

            setCounts(ovData?.counts || {});
            setUsers(Array.isArray(usData?.users) ? usData.users : []);
            setJobs(Array.isArray(jsData?.jobs) ? jsData.jobs : []);
            setCompanies(Array.isArray(csData?.companies) ? csData.companies : []);
            setReports(Array.isArray(rsData?.reports) ? rsData.reports : []);
            setCareerGuidePosts(Array.isArray(cgpData?.posts) ? cgpData.posts : []);

            const templateRows = Array.isArray(tsData?.templates)
                ? tsData.templates
                : Array.isArray(tsData?.data)
                    ? tsData.data
                    : [];
            setTemplates(templateRows);
        } catch (err) {
            setError(err?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!token) return;
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [API_BASE, token]);

    useEffect(() => {
        const onResize = () => {
            if (typeof window === 'undefined') return;
            if (window.innerWidth < 992) {
                setSidebarCollapsed(false);
            } else {
                setMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 992) {
            setMobileMenuOpen(false);
        }
        setProfileMenuOpen(false);

        if (location.pathname.startsWith('/admin/templates')) {
            setOpenMenus((prev) => ({ ...prev, templates: true }));
        }
    }, [location.pathname]);

    useEffect(() => {
        const handleDocumentClick = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setProfileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleDocumentClick);
        return () => document.removeEventListener('mousedown', handleDocumentClick);
    }, []);

    const patchUser = async (id, payload) => {
        const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Không cập nhật được người dùng');
        return data?.user;
    };

    const fetchUserDetail = async (id) => {
        const res = await fetch(`${API_BASE}/api/admin/users/${id}/detail`, {
            headers: authHeaders
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Không tải được chi tiết người dùng');
        return data?.detail || null;
    };

    const patchReport = async (id, payload) => {
        const res = await fetch(`${API_BASE}/api/admin/reports/${id}`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Không cập nhật được báo cáo');
        return data?.report;
    };

    const approveReport = async (id, payload) => {
        const res = await fetch(`${API_BASE}/api/admin/reports/${id}/approve`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(payload || {})
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Không phê duyệt được báo cáo');
        return data?.report;
    };

    const deleteReport = async (id) => {
        const res = await fetch(`${API_BASE}/api/admin/reports/${id}`, {
            method: 'DELETE',
            headers: authHeaders
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Không xóa được báo cáo');
    };

    const deleteCareerGuidePost = async (id) => {
        const res = await fetch(`${API_BASE}/api/admin/career-guide-posts/${id}`, {
            method: 'DELETE',
            headers: authHeaders
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Không xóa được bài viết hướng nghiệp');
    };

    const deleteJob = async (id) => {
        const res = await fetch(`${API_BASE}/api/admin/jobs/${id}`, {
            method: 'DELETE',
            headers: authHeaders
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Không xóa được tin tuyển dụng');
    };

    const deleteUser = async (id) => {
        const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: authHeaders
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Không xóa được người dùng');
        return data?.user;
    };

    const restoreUser = async (id) => {
        const res = await fetch(`${API_BASE}/api/admin/users/${id}/restore`, {
            method: 'POST',
            headers: authHeaders
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Không khôi phục được người dùng');
        return data?.user;
    };

    const patchCompany = async (id, payload) => {
        const res = await fetch(`${API_BASE}/api/admin/companies/${id}`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Không cập nhật được công ty');
        return data?.company;
    };

    const deleteCompany = async (id) => {
        const res = await fetch(`${API_BASE}/api/admin/companies/${id}`, {
            method: 'DELETE',
            headers: authHeaders
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Không xóa được công ty');
    };

    const saveUserById = async (userId, payload) => {
        const updated = await patchUser(userId, payload);
        setUsers((prev) => prev.map((item) => (item.MaNguoiDung === userId ? updated : item)));
    };

    const deleteUserById = async (userId) => {
        const updated = await deleteUser(userId);
        setUsers((prev) => prev.map((item) => (item.MaNguoiDung === userId ? updated : item)));
    };

    const restoreUserById = async (userId) => {
        const updated = await restoreUser(userId);
        setUsers((prev) => prev.map((item) => (item.MaNguoiDung === userId ? updated : item)));
    };

    const deleteJobById = async (jobId) => {
        await deleteJob(jobId);
        setJobs((prev) => prev.filter((item) => item.MaTin !== jobId));
    };

    const saveCompanyStatusById = async (companyId, status) => {
        const updated = await patchCompany(companyId, { status });
        setCompanies((prev) => prev.map((item) => (item.MaCongTy === companyId ? updated : item)));
    };

    const deleteCompanyById = async (companyId) => {
        await deleteCompany(companyId);
        setCompanies((prev) => prev.filter((item) => item.MaCongTy !== companyId));
    };

    const saveReportById = async (reportId, payload) => {
        const updated = await patchReport(reportId, payload);
        setReports((prev) => prev.map((item) => (item.MaBaoCao === reportId ? { ...item, ...updated } : item)));
    };

    const approveReportById = async (reportId, payload) => {
        const updated = await approveReport(reportId, payload);
        setReports((prev) => prev.map((item) => (item.MaBaoCao === reportId ? { ...item, ...updated } : item)));
    };

    const deleteReportById = async (reportId) => {
        await deleteReport(reportId);
        setReports((prev) => prev.filter((item) => item.MaBaoCao !== reportId));
    };

    const deleteCareerGuidePostById = async (postId) => {
        await deleteCareerGuidePost(postId);
        setCareerGuidePosts((prev) => prev.filter((item) => item.MaBaiViet !== postId));
    };

    const greetingName = user?.HoTen || user?.name || user?.full_name || user?.email || t('admin.greetingDefault');
    const roleLabel = (isSuperAdmin || normalizedCurrentRole.includes('siêu') || normalizedCurrentRole.includes('sieu'))
        ? t('admin.role.superAdmin')
        : t('admin.role.admin');
    const adminAvatarRaw = String(user?.avatar || user?.avatarAbsoluteUrl || user?.AnhDaiDien || user?.avatarUrl || '').trim();
    const adminAvatarUrl = withAvatarVersion(adminAvatarRaw, user?.avatarUpdatedAt);

    const totalTemplateCount = Math.max(safeNumber(counts?.CvTemplate), templates.length);
    const usedTemplateCount = templates.filter((template) => getTemplateUsage(template) > 0).length;

    const statsCards = [
        {
            key: 'total-templates',
            title: t('admin.stats.totalTemplatesTitle'),
            value: totalTemplateCount,
            meta: t('admin.stats.totalTemplatesMeta', { percent: totalTemplateCount > 0 ? '+12%' : '0%' }),
            icon: FileStack,
            iconClass: 'sky'
        },
        {
            key: 'used-templates',
            title: t('admin.stats.usedTemplatesTitle'),
            value: usedTemplateCount,
            meta: t('admin.stats.usedTemplatesMeta', { count: usedTemplateCount }),
            icon: BarChart3,
            iconClass: 'violet'
        },
        {
            key: 'users',
            title: t('admin.stats.usersTitle'),
            value: safeNumber(counts?.NguoiDung),
            meta: t('admin.stats.usersMeta', { percent: safeNumber(counts?.NguoiDung) > 0 ? '+6%' : '0%' }),
            icon: Users,
            iconClass: 'blue'
        },
        {
            key: 'companies',
            title: t('admin.stats.companiesTitle'),
            value: safeNumber(counts?.CongTy),
            meta: t('admin.stats.companiesMeta', { percent: safeNumber(counts?.CongTy) > 0 ? '+4%' : '0%' }),
            icon: Building2,
            iconClass: 'indigo'
        }
    ];

    const recentTemplateActivities = useMemo(() => {
        const rows = templates
            .map((template, index) => {
                const createdAt = getTemplateCreatedAt(template);
                return {
                    id: template?.MaTemplateCV || template?.id || `${getTemplateName(template, index)}-${index}`,
                    name: getTemplateName(template, index),
                    createdAt,
                    usage: getTemplateUsage(template),
                    relativeTime: formatRelativeTime(createdAt, t),
                    exactTime: createdAt ? createdAt.toLocaleString(currentLocale) : t('admin.time.noCreatedDate')
                };
            })
            .sort((a, b) => {
                const aTime = a.createdAt ? a.createdAt.getTime() : 0;
                const bTime = b.createdAt ? b.createdAt.getTime() : 0;
                return bTime - aTime;
            });

        return rows.slice(0, 6);
    }, [templates, currentLocale, t]);

    const popularTemplates = useMemo(() => {
        const rows = templates
            .map((template, index) => ({
                id: template?.MaTemplateCV || template?.id || `${getTemplateName(template, index)}-${index}`,
                name: getTemplateName(template, index),
                usage: getTemplateUsage(template)
            }))
            .sort((a, b) => b.usage - a.usage)
            .slice(0, 5);

        const maxUsage = rows.reduce((max, row) => Math.max(max, row.usage), 0);
        return rows.map((row) => ({
            ...row,
            progress: maxUsage > 0 ? Math.round((row.usage / maxUsage) * 100) : 0
        }));
    }, [templates]);

    const handleSidebarToggle = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 992) {
            setMobileMenuOpen((prev) => !prev);
            return;
        }
        setSidebarCollapsed((prev) => !prev);
    };

    const handleSidebarItemClick = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 992) {
            setMobileMenuOpen(false);
        }
    };

    const handleProfileMenuNavigate = (path) => {
        setProfileMenuOpen(false);
        navigate(path);
    };

    const handleChangeLanguage = (language) => {
        const targetLanguage = String(language || '').trim().toLowerCase();
        if (!targetLanguage) return;
        if (normalizedLanguage.startsWith(targetLanguage)) return;
        i18n.changeLanguage(targetLanguage);
    };

    const handleChangeTheme = (nextTheme) => {
        const normalizedTheme = String(nextTheme || '').trim().toLowerCase();
        if (normalizedTheme !== 'dark' && normalizedTheme !== 'light') return;
        setTheme(normalizedTheme);
    };

    const handleProfileMenuThemeToggle = () => {
        toggleDarkMode();
        setProfileMenuOpen(false);
    };

    const adminHeaderMenuItems = [
        {
            key: 'dashboard',
            icon: LayoutDashboard,
            label: t('admin.dropdown.dashboard'),
            onClick: () => handleProfileMenuNavigate('/admin/dashboard')
        },
        {
            key: 'profile',
            icon: UserRound,
            label: t('admin.dropdown.profile'),
            onClick: () => handleProfileMenuNavigate('/admin/profile')
        },
        {
            key: 'notifications',
            icon: Bell,
            label: t('admin.dropdown.notifications'),
            onClick: () => handleProfileMenuNavigate('/admin/dashboard')
        },
        {
            key: 'theme',
            icon: isDarkMode ? Sun : Moon,
            label: isDarkMode ? t('admin.dropdown.themeLight') : t('admin.dropdown.themeDark'),
            onClick: handleProfileMenuThemeToggle
        },
        {
            key: 'logout',
            icon: LogOut,
            label: t('admin.dropdown.logout'),
            onClick: handleLogout,
            danger: true
        }
    ];

    const isPathActive = (path, exact = false) => {
        if (exact) return location.pathname === path;
        return location.pathname === path || location.pathname.startsWith(`${path}/`);
    };

    if (!token) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="admin-layout">
            <button
                type="button"
                className={`admin-mobile-overlay ${mobileMenuOpen ? 'show' : ''}`}
                aria-label={t('common.close')}
                onClick={() => setMobileMenuOpen(false)}
            />

            <div className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="admin-sidebar-brand" title="JobFinder">
                    <img src={SIDEBAR_LOGO_URL} alt="JobFinder" className="admin-sidebar-logo" />
                    {!sidebarCollapsed && <span>JobFinder</span>}
                </div>

                <div className="admin-menu">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const itemLabel = t(item.labelKey);

                        if (Array.isArray(item.children) && item.children.length > 0) {
                            const isGroupActive = item.children.some((child) => isPathActive(child.to, child.exact));
                            const isOpen = !sidebarCollapsed && (openMenus[item.key] || isGroupActive);

                            return (
                                <div key={item.key} className={`admin-menu-group ${isGroupActive ? 'active' : ''}`}>
                                    <button
                                        type="button"
                                        className={`admin-menu-item admin-menu-parent ${isGroupActive ? 'active' : ''}`}
                                        onClick={() => {
                                            if (sidebarCollapsed) {
                                                navigate(item.children[0].to);
                                                handleSidebarItemClick();
                                                return;
                                            }
                                            setOpenMenus((prev) => ({
                                                ...prev,
                                                [item.key]: !prev[item.key]
                                            }));
                                        }}
                                        title={itemLabel}
                                    >
                                        <Icon size={18} strokeWidth={2.1} />
                                        {!sidebarCollapsed && <span>{itemLabel}</span>}
                                        {!sidebarCollapsed && (
                                            <ChevronDown
                                                size={16}
                                                className={`admin-menu-caret ${isOpen ? 'open' : ''}`}
                                            />
                                        )}
                                    </button>

                                    {!sidebarCollapsed && isOpen && (
                                        <div className="admin-submenu">
                                            {item.children.map((child) => (
                                                <NavLink
                                                    key={child.key}
                                                    to={child.to}
                                                    end={Boolean(child.exact)}
                                                    className={({ isActive }) => `admin-submenu-item ${isActive ? 'active' : ''}`}
                                                    onClick={handleSidebarItemClick}
                                                >
                                                    {t(child.labelKey)}
                                                </NavLink>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <NavLink
                                key={item.key}
                                to={item.to}
                                className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}
                                onClick={handleSidebarItemClick}
                                title={itemLabel}
                            >
                                <Icon size={18} strokeWidth={2.1} />
                                {!sidebarCollapsed && <span>{itemLabel}</span>}
                            </NavLink>
                        );
                    })}
                </div>

                <div className="admin-sidebar-footer">
                    <button
                        type="button"
                        className="admin-logout-btn"
                        onClick={() => {
                            handleSidebarItemClick();
                            handleLogout();
                        }}
                        title={t('admin.actions.logout')}
                        aria-label={t('admin.actions.logout')}
                    >
                        <LogOut size={18} strokeWidth={2.1} />
                        <span>{t('admin.actions.logout')}</span>
                    </button>
                </div>
            </div>

            <div className={`admin-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <EmployerHeaderShell
                    onToggleSidebar={handleSidebarToggle}
                    toggleAriaLabel={t('header.aria.toggleNavigation')}
                    toggleIcon={mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    title={t(resolvePageTitleKey(location.pathname))}
                    rightContent={(
                        <AdminHeaderRightActions
                            activeLanguage={isEnglish ? 'en' : 'vi'}
                            onChangeLanguage={handleChangeLanguage}
                            languageAriaLabel={t('common.languageSwitch')}
                            activeTheme={isDarkMode ? 'dark' : 'light'}
                            onChangeTheme={handleChangeTheme}
                            themeAriaLabel={t('common.toggleDarkMode')}
                            languageVietnameseTitle={t('common.switchToVietnamese')}
                            languageEnglishTitle={t('common.switchToEnglish')}
                            lightThemeTitle={t('common.switchToLight')}
                            darkThemeTitle={t('common.switchToDark')}
                            onGoHome={() => navigate('/')}
                            homeLabel={t('admin.actions.home')}
                            profileMenuOpen={profileMenuOpen}
                            onToggleProfileMenu={() => setProfileMenuOpen((prev) => !prev)}
                            profileMenuRef={profileMenuRef}
                            avatarUrl={adminAvatarUrl}
                            displayName={greetingName}
                            roleLabel={roleLabel}
                            onAvatarError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                            }}
                            menuItems={adminHeaderMenuItems}
                        />
                    )}
                />

                <div className="admin-content">
                    {error && <div className="alert alert-danger admin-feedback">{error}</div>}
                    {loading && <div className="alert alert-info admin-feedback">{t('admin.loadingData')}</div>}

                    <Routes>
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route
                            path="dashboard"
                            element={
                                <AdminOverviewPage
                                    currentAdminName={greetingName}
                                    statsCards={statsCards}
                                    recentTemplateActivities={recentTemplateActivities}
                                    popularTemplates={popularTemplates}
                                />
                            }
                        />
                        <Route
                            path="usersmanament"
                            element={
                                <AdminUsersPage
                                    users={users}
                                    loading={loading}
                                    roleFilter={roleFilter}
                                    onRoleFilterChange={setRoleFilter}
                                    isSuperAdmin={isSuperAdmin}
                                    isAdmin={isAdmin}
                                    requestConfirm={requestConfirm}
                                    onSaveUser={saveUserById}
                                    onDeleteUser={deleteUserById}
                                    onRestoreUser={restoreUserById}
                                    onViewUserDetail={fetchUserDetail}
                                />
                            }
                        />
                        <Route
                            path="jobs"
                            element={
                                <AdminJobsPage
                                    jobs={jobs}
                                    loading={loading}
                                    canDelete={isSuperAdmin}
                                    requestConfirm={requestConfirm}
                                    onDeleteJob={deleteJobById}
                                />
                            }
                        />
                        <Route
                            path="companies"
                            element={
                                <AdminCompaniesPage
                                    companies={companies}
                                    loading={loading}
                                    canEdit={isSuperAdmin}
                                    requestConfirm={requestConfirm}
                                    onSaveCompanyStatus={saveCompanyStatusById}
                                    onDeleteCompany={deleteCompanyById}
                                />
                            }
                        />
                        <Route
                            path="templates"
                            element={
                                <AdminTemplatesPage
                                    API_BASE={API_BASE}
                                    authHeaders={authHeaders}
                                    requestConfirm={requestConfirm}
                                    mode="list"
                                />
                            }
                        />
                        <Route
                            path="templates/create"
                            element={
                                <AdminTemplatesPage
                                    API_BASE={API_BASE}
                                    authHeaders={authHeaders}
                                    requestConfirm={requestConfirm}
                                    mode="create"
                                />
                            }
                        />
                        <Route
                            path="reports"
                            element={
                                <AdminReportsPage
                                    reports={reports}
                                    loading={loading}
                                    onSaveReport={saveReportById}
                                    onApproveReport={approveReportById}
                                    onDeleteReport={deleteReportById}
                                    requestConfirm={requestConfirm}
                                />
                            }
                        />
                        <Route
                            path="audit-logs"
                            element={
                                <AdminAuditLogsPage
                                    API_BASE={API_BASE}
                                    authHeaders={authHeaders}
                                />
                            }
                        />
                        <Route
                            path="career-guide-posts"
                            element={
                                <AdminCareerGuidePostsPage
                                    posts={careerGuidePosts}
                                    loading={loading}
                                    requestConfirm={requestConfirm}
                                    onDeletePost={deleteCareerGuidePostById}
                                />
                            }
                        />
                        <Route
                            path="profile"
                            element={
                                <AdminProfilePage
                                    user={user}
                                    roleLabel={roleLabel}
                                    greetingName={greetingName}
                                />
                            }
                        />
                        <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                </div>
            </div>

            {confirmState.open && (
                <div className="admin-confirm-backdrop" role="dialog" aria-modal="true">
                    <div className="admin-confirm-dialog card border-0 shadow-sm">
                        <div className="card-body">
                            <h5 className="mb-3">{confirmState.title}</h5>
                            <div className="mb-4">{confirmState.message}</div>
                            <div className="d-flex justify-content-end gap-2">
                                <button type="button" className="btn btn-outline-secondary" onClick={() => closeConfirm(false)}>
                                    {confirmState.cancelText}
                                </button>
                                <button type="button" className="btn btn-danger" onClick={() => closeConfirm(true)}>
                                    {confirmState.confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
