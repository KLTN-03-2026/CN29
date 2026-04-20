import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from './NotificationProvider';
import { useDarkMode } from '../context/DarkModeContext';
import {
    Bell,
    BookOpen,
    BriefcaseBusiness,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    LayoutDashboard,
    LogOut,
    Mail,
    UserRound
} from 'lucide-react';

const readStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
        return null;
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

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const { requestConfirm } = useNotification();
    const { isDarkMode, setTheme } = useDarkMode();
    const [currentUser, setCurrentUser] = useState(() => readStoredUser());
    const [showJobManagement, setShowJobManagement] = useState(false);
    const [showMobileJobsMenu, setShowMobileJobsMenu] = useState(false);

    const normalizedLanguage = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase();
    const isEnglish = normalizedLanguage.startsWith('en');
    const isVietnamese = normalizedLanguage.startsWith('vi');

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

    const handleLogout = async () => {
        const confirmed = await requestConfirm({
            type: 'warning',
            intent: 'logout',
            title: t('header.confirmLogout.title'),
            message: t('header.confirmLogout.message'),
            confirmText: t('header.confirmLogout.confirm'),
            cancelText: t('header.confirmLogout.cancel')
        });

        if (!confirmed) return;

        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setShowJobManagement(false);
        setShowMobileJobsMenu(false);
        collapseMobileNavbar();
        navigate('/login');
    };

    const collapseMobileNavbar = () => {
        const collapseElement = document.getElementById('mainNavbar');
        if (!collapseElement?.classList.contains('show')) return;

        const bootstrap = window.bootstrap;
        if (bootstrap?.Collapse) {
            const instance = bootstrap.Collapse.getInstance(collapseElement)
                || new bootstrap.Collapse(collapseElement, { toggle: false });
            instance.hide();
            return;
        }

        collapseElement.classList.remove('show');
        const toggler = document.querySelector('[data-bs-target="#mainNavbar"]');
        if (toggler) {
            toggler.setAttribute('aria-expanded', 'false');
            toggler.classList.add('collapsed');
        }
    };

    useEffect(() => {
        setShowMobileJobsMenu(false);
        setShowJobManagement(false);
        collapseMobileNavbar();
    }, [location.pathname]);

    useEffect(() => {
        const syncUserFromStorage = (event) => {
            const stored = readStoredUser();
            if (event?.detail && typeof event.detail === 'object') {
                setCurrentUser({ ...(stored || {}), ...event.detail });
                return;
            }
            setCurrentUser(stored);
        };

        window.addEventListener('storage', syncUserFromStorage);
        window.addEventListener('jobfinder:user-updated', syncUserFromStorage);

        return () => {
            window.removeEventListener('storage', syncUserFromStorage);
            window.removeEventListener('jobfinder:user-updated', syncUserFromStorage);
        };
    }, []);

    const normalize = (value) => String(value || '').trim().toLowerCase();

    const resolveRoleLabel = (rawRole, isSuperAdmin) => {
        const role = normalize(rawRole);
        if (isSuperAdmin || role.includes('siêu') || role.includes('sieu')) return t('header.role.superAdmin');
        if (role.includes('quản trị') || role.includes('quan tri')) return t('header.role.admin');
        if (role.includes('nhà tuyển dụng') || role.includes('nha tuyen dung')) return t('header.role.employer');
        return t('header.role.candidate');
    };
    
    // Kiểm tra trạng thái đăng nhập
    const user = currentUser;

    const userRole = String(user?.role || user?.vaiTro || user?.VaiTro || '').trim();
    const isSuperAdmin = (
        user?.isSuperAdmin === true
        || user?.isSuperAdmin === 1
        || user?.isSuperAdmin === '1'
        || user?.IsSuperAdmin === true
        || user?.IsSuperAdmin === 1
        || user?.IsSuperAdmin === '1'
    );
    const roleLabel = resolveRoleLabel(userRole, isSuperAdmin);
    const isEmployer = roleLabel === t('header.role.employer');
    const isAdmin = (
        roleLabel === t('header.role.admin')
        || roleLabel === t('header.role.superAdmin')
        || isSuperAdmin
    );
    const profileTitle = String(user?.HoTen || user?.name || user?.fullName || user?.username || user?.email || '').trim() || t('header.profileFallback');
    const avatarUrlRaw = String(user?.avatar || user?.avatarAbsoluteUrl || user?.AnhDaiDien || user?.avatarUrl || '').trim();
    const avatarUrl = withAvatarVersion(avatarUrlRaw, user?.avatarUpdatedAt);
    const profileIcon = isAdmin
        ? 'bi-shield-check'
        : (isEmployer ? 'bi-building-check' : 'bi-person-check');
    const profileLink = isEmployer ? '/employer/account' : (isAdmin ? '/admin/profile' : '/profile');
    const dashboardLink = isEmployer ? '/employer' : (isAdmin ? '/admin' : '');
    const messagingLink = isEmployer ? '/employer/messages' : (!isAdmin ? '/messages' : '');

    return (
        <nav className="navbar navbar-expand-lg bg-white border-bottom shadow-sm jf-main-navbar">
            <div className="container jf-main-navbar__container">
                <Link className="navbar-brand d-flex align-items-center gap-3 text-decoration-none jf-main-navbar__brand" to="/">
                    <img src="/images/logo.png" alt="JobFinder Logo" className="jf-main-navbar__logo" />
                </Link>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar" aria-controls="mainNavbar" aria-expanded="false" aria-label={t('header.aria.toggleNavigation')}>
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse d-lg-flex justify-content-between jf-main-navbar__collapse" id="mainNavbar">
                    <ul className="navbar-nav align-items-lg-center gap-lg-4 mb-3 mb-lg-0 jf-main-navbar__menu">
                        <li className="nav-item">
                            <Link className="nav-link fw-semibold fs-6" to="/" onClick={collapseMobileNavbar}>{t('header.nav.home')}</Link>
                        </li>
                        <li className="nav-item dropdown jf-nav-dropdown">
                            <button
                                type="button"
                                className="nav-link d-flex align-items-center gap-1 fw-semibold fs-6 jf-nav-dropdown-toggle"
                                onClick={() => setShowMobileJobsMenu((prev) => !prev)}
                                aria-expanded={showMobileJobsMenu}
                                aria-label={t('header.aria.openJobsMenu')}
                            >
                                {t('header.nav.jobs')} <i className="bi bi-chevron-down small jf-nav-chevron"></i>
                            </button>
                            <ul className={`dropdown-menu jf-nav-dropdown-menu p-0 ${showMobileJobsMenu ? 'is-open' : ''}`}>
                                <li className="jf-jobs-menu-head">
                                    {t('header.jobsMenu.title')}
                                </li>
                                <li className={`jf-jobs-menu-grid ${isEmployer ? 'is-employer' : 'is-candidate'}`}>
                                    <Link className="dropdown-item d-flex align-items-center gap-3 rounded p-2 jf-jobs-menu-link" to="/jobs" onClick={collapseMobileNavbar}>
                                        <i className="bi bi-search fs-5 text-primary"></i>
                                        <span className="fw-semibold">{t('header.jobsMenu.findJobs')}</span>
                                    </Link>
                                    {!isEmployer && (
                                        <>
                                            <Link className="dropdown-item d-flex align-items-center gap-3 rounded p-2 jf-jobs-menu-link" to="/jobs/saved" onClick={collapseMobileNavbar}>
                                                <i className="bi bi-bookmark fs-5 text-primary"></i>
                                                <span className="fw-semibold">{t('header.jobsMenu.savedJobs')}</span>
                                            </Link>
                                            <Link className="dropdown-item d-flex align-items-center gap-3 rounded p-2 jf-jobs-menu-link" to="/jobs/applied" onClick={collapseMobileNavbar}>
                                                <i className="bi bi-file-earmark-check fs-5 text-primary"></i>
                                                <span className="fw-semibold">{t('header.jobsMenu.appliedJobs')}</span>
                                            </Link>
                                            <Link className="dropdown-item d-flex align-items-center gap-3 rounded p-2 jf-jobs-menu-link" to="/jobs/matching" onClick={collapseMobileNavbar}>
                                                <i className="bi bi-hand-thumbs-up fs-5 text-primary"></i>
                                                <span className="fw-semibold">{t('header.jobsMenu.matchingJobs')}</span>
                                            </Link>
                                        </>
                                    )}
                                </li>
                            </ul>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link fw-semibold fs-6" to="/create-cv/templates" onClick={collapseMobileNavbar}>
                                {t('header.nav.cvTemplates')}
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link fw-semibold fs-6" to="/cv-management" onClick={collapseMobileNavbar}>
                                {t('header.nav.cvManagement')}
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link fw-semibold fs-6" to="/career-guide" onClick={collapseMobileNavbar}>
                                {t('header.nav.careerGuide')}
                            </Link>
                        </li>
                    </ul>
                    <div className="d-flex align-items-center gap-3 jf-main-navbar__actions">
                        <div className="d-flex align-items-center gap-2 jf-utility-actions">
                            <div className="jf-utility-group" role="group" aria-label={t('common.languageSwitch')}>
                                <button
                                    type="button"
                                    className={`btn btn-sm jf-utility-btn ${isVietnamese ? 'is-active' : ''}`}
                                    onClick={() => handleChangeLanguage('vi')}
                                    title={t('common.switchToVietnamese')}
                                    aria-label={t('common.switchToVietnamese')}
                                    aria-pressed={isVietnamese}
                                >
                                    <span>VI</span>
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-sm jf-utility-btn ${isEnglish ? 'is-active' : ''}`}
                                    onClick={() => handleChangeLanguage('en')}
                                    title={t('common.switchToEnglish')}
                                    aria-label={t('common.switchToEnglish')}
                                    aria-pressed={isEnglish}
                                >
                                    <span>EN</span>
                                </button>
                            </div>

                            <div className="jf-utility-group jf-utility-group-theme" role="group" aria-label={t('common.toggleDarkMode')}>
                                <button
                                    type="button"
                                    className={`btn btn-sm jf-utility-btn ${!isDarkMode ? 'is-active' : ''}`}
                                    onClick={() => handleChangeTheme('light')}
                                    title={t('common.switchToLight')}
                                    aria-label={t('common.switchToLight')}
                                    aria-pressed={!isDarkMode}
                                >
                                    <i className="bi bi-sun-fill" aria-hidden="true"></i>
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-sm jf-utility-btn ${isDarkMode ? 'is-active' : ''}`}
                                    onClick={() => handleChangeTheme('dark')}
                                    title={t('common.switchToDark')}
                                    aria-label={t('common.switchToDark')}
                                    aria-pressed={isDarkMode}
                                >
                                    <i className="bi bi-moon-stars-fill" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>

                        {!user ? (
                            <div className="jf-main-navbar__auth-actions">
                                <Link className="btn btn-outline-primary fw-semibold fs-6 px-4 py-1" to="/login" onClick={collapseMobileNavbar}>
                                    {t('header.auth.login')}
                                </Link>
                                <Link className="btn btn-primary fw-semibold fs-6 px-4 py-1" to="/register" onClick={collapseMobileNavbar}>
                                    {t('header.auth.register')}
                                </Link>
                            </div>
                        ) : (
                            <div className="jf-main-navbar__user-actions">
                                <div className="dropdown">
                                <button
                                    className="jf-user-chip"
                                    type="button"
                                    id="dropdownUser"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    <span className={`jf-user-chip-icon ${avatarUrl ? 'has-avatar' : ''}`} aria-hidden="true">
                                        {avatarUrl ? (
                                            <img
                                                src={avatarUrl}
                                                alt={profileTitle}
                                                className="jf-user-chip-avatar"
                                                onError={(event) => {
                                                    event.currentTarget.onerror = null;
                                                    event.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                                                }}
                                            />
                                        ) : (
                                            <i className={`bi ${profileIcon}`}></i>
                                        )}
                                    </span>
                                    <span className="jf-user-chip-info">
                                        <strong>{profileTitle}</strong>
                                        <small>{roleLabel}</small>
                                    </span>
                                    <ChevronDown size={14} className="jf-user-chip-chevron" aria-hidden="true" />
                                </button>
                                <ul className="dropdown-menu dropdown-menu-end jf-user-dropdown-menu" aria-labelledby="dropdownUser">
                                    {/* Menu items */}
                                    <li className="jf-user-dropdown-row">
                                        <Link className="dropdown-item jf-user-dropdown-item" to={profileLink} onClick={collapseMobileNavbar}>
                                            <UserRound size={16} className="jf-user-dropdown-icon" aria-hidden="true" />
                                            <span>{t('header.user.profile')}</span>
                                        </Link>
                                    </li>
                                    {dashboardLink && (
                                        <li className="jf-user-dropdown-row">
                                            <Link className="dropdown-item jf-user-dropdown-item" to={dashboardLink} onClick={collapseMobileNavbar}>
                                                <LayoutDashboard size={16} className="jf-user-dropdown-icon" aria-hidden="true" />
                                                <span>{t('header.user.dashboard')}</span>
                                            </Link>
                                        </li>
                                    )}
                                    {messagingLink && (
                                        <li className="jf-user-dropdown-row">
                                            <Link className="dropdown-item jf-user-dropdown-item" to={messagingLink} onClick={collapseMobileNavbar}>
                                                <Mail size={16} className="jf-user-dropdown-icon" aria-hidden="true" />
                                                <span>{t('header.user.messages')}</span>
                                            </Link>
                                        </li>
                                    )}
                                    {!isAdmin && (isEmployer ? (
                                        <li className="jf-user-dropdown-row">
                                            <Link className="dropdown-item jf-user-dropdown-item" to="/employer/jobs" onClick={collapseMobileNavbar}>
                                                <BriefcaseBusiness size={16} className="jf-user-dropdown-icon" aria-hidden="true" />
                                                <span>{t('header.user.manageEmployerJobs')}</span>
                                            </Link>
                                        </li>
                                    ) : (
                                        <li className="jf-user-dropdown-row">
                                            <div className="dropdown-item jf-user-dropdown-item jf-user-dropdown-toggle"
                                                onClick={e => { e.stopPropagation(); setShowJobManagement(!showJobManagement); }}>
                                                <div className="d-flex align-items-center gap-2">
                                                    <BriefcaseBusiness size={16} className="jf-user-dropdown-icon" aria-hidden="true" />
                                                    <span>{t('header.user.manageJobs')}</span>
                                                </div>
                                                {showJobManagement
                                                    ? <ChevronUp size={15} aria-hidden="true" />
                                                    : <ChevronDown size={15} aria-hidden="true" />}
                                            </div>
                                            {showJobManagement && (
                                                <ul className="list-unstyled jf-user-submenu-list">
                                                    <li>
                                                        <Link className="jf-user-submenu-link" to="/jobs/applied" onClick={collapseMobileNavbar}>
                                                            <CheckCircle2 size={14} className="jf-user-dropdown-icon" aria-hidden="true" />
                                                            <span>{t('header.jobsMenu.appliedJobs')}</span>
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link className="jf-user-submenu-link" to="/jobs/saved" onClick={collapseMobileNavbar}>
                                                            <BookOpen size={14} className="jf-user-dropdown-icon" aria-hidden="true" />
                                                            <span>{t('header.jobsMenu.savedJobs')}</span>
                                                        </Link>
                                                    </li>
                                                </ul>
                                            )}
                                        </li>
                                    ))}
                                    <li className="jf-user-dropdown-row">
                                        <Link className="dropdown-item jf-user-dropdown-item" to="/support" onClick={collapseMobileNavbar}>
                                            <Bell size={16} className="jf-user-dropdown-icon" aria-hidden="true" />
                                            <span>{t('header.user.notifications')}</span>
                                        </Link>
                                    </li>
                                    <li><hr className="dropdown-divider" /></li>
                                    <li className="jf-user-dropdown-row jf-user-dropdown-row-last">
                                        <button className="btn btn-link text-decoration-none jf-user-logout-btn"
                                                onClick={handleLogout}>
                                            <span className="d-inline-flex align-items-center justify-content-center gap-2">
                                                <LogOut size={16} aria-hidden="true" />
                                                <span>{t('header.user.logout')}</span>
                                            </span>
                                        </button>
                                    </li>
                                </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Header;