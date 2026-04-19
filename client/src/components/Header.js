import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from './NotificationProvider';
import { useDarkMode } from '../context/DarkModeContext';

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
    const { isDarkMode, toggleDarkMode } = useDarkMode();
    const [currentUser, setCurrentUser] = useState(() => readStoredUser());
    const [showJobManagement, setShowJobManagement] = useState(false);
    const [showMobileJobsMenu, setShowMobileJobsMenu] = useState(false);

    const normalizedLanguage = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase();
    const isEnglish = normalizedLanguage.startsWith('en');

    const handleToggleLanguage = () => {
        i18n.changeLanguage(isEnglish ? 'vi' : 'en');
    };

    const handleLogout = async () => {
        const confirmed = await requestConfirm({
            type: 'warning',
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
                <div className="collapse navbar-collapse justify-content-between jf-main-navbar__collapse" id="mainNavbar">
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
                            <ul className={`dropdown-menu jf-nav-dropdown-menu p-0 ${showMobileJobsMenu ? 'is-open' : ''}`} style={{ minWidth: 280, borderRadius: 12 }}>
                                <li className="px-3 pt-3 pb-2 text-uppercase text-secondary" style={{ fontSize: 12, letterSpacing: 1 }}>
                                    {t('header.jobsMenu.title')}
                                </li>
                                <li className="px-2 pb-2">
                                    <Link className="dropdown-item d-flex align-items-center gap-3 rounded p-2" to="/jobs" onClick={collapseMobileNavbar}>
                                        <i className="bi bi-search fs-5 text-primary"></i>
                                        <span className="fw-semibold">{t('header.jobsMenu.findJobs')}</span>
                                    </Link>
                                </li>
                                {!isEmployer && (
                                    <>
                                        <li className="px-2 pb-2">
                                            <Link className="dropdown-item d-flex align-items-center gap-3 rounded p-2" to="/jobs/saved" onClick={collapseMobileNavbar}>
                                                <i className="bi bi-bookmark fs-5 text-primary"></i>
                                                <span className="fw-semibold">{t('header.jobsMenu.savedJobs')}</span>
                                            </Link>
                                        </li>
                                        <li className="px-2 pb-2">
                                            <Link className="dropdown-item d-flex align-items-center gap-3 rounded p-2" to="/jobs/applied" onClick={collapseMobileNavbar}>
                                                <i className="bi bi-file-earmark-check fs-5 text-primary"></i>
                                                <span className="fw-semibold">{t('header.jobsMenu.appliedJobs')}</span>
                                            </Link>
                                        </li>
                                        <li className="px-2 pb-3">
                                            <Link className="dropdown-item d-flex align-items-center gap-3 rounded p-2" to="/jobs/matching" onClick={collapseMobileNavbar}>
                                                <i className="bi bi-hand-thumbs-up fs-5 text-primary"></i>
                                                <span className="fw-semibold">{t('header.jobsMenu.matchingJobs')}</span>
                                            </Link>
                                        </li>
                                    </>
                                )}
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
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm jf-utility-btn"
                                onClick={handleToggleLanguage}
                                title={isEnglish ? t('common.switchToVietnamese') : t('common.switchToEnglish')}
                                aria-label={t('common.languageSwitch')}
                            >
                                <i className="bi bi-translate" aria-hidden="true"></i>
                                <span>{isEnglish ? 'EN' : 'VI'}</span>
                            </button>

                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm jf-utility-btn"
                                onClick={toggleDarkMode}
                                title={isDarkMode ? t('common.switchToLight') : t('common.switchToDark')}
                                aria-label={t('common.toggleDarkMode')}
                            >
                                <i className={`bi ${isDarkMode ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`} aria-hidden="true"></i>
                            </button>
                        </div>

                        {!user ? (
                            <>
                                <Link className="btn btn-outline-primary fw-semibold fs-6 px-4 py-1" to="/login" onClick={collapseMobileNavbar}>
                                    {t('header.auth.login')}
                                </Link>
                                <Link className="btn btn-primary fw-semibold fs-6 px-4 py-1" to="/register" onClick={collapseMobileNavbar}>
                                    {t('header.auth.register')}
                                </Link>
                            </>
                        ) : (
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
                                    <i className="bi bi-chevron-down jf-user-chip-chevron" aria-hidden="true"></i>
                                </button>
                                <ul className="dropdown-menu dropdown-menu-end jf-user-dropdown-menu" aria-labelledby="dropdownUser">
                                    {/* Menu items */}
                                    <li className="jf-user-dropdown-row">
                                        <Link className="dropdown-item jf-user-dropdown-item" to={profileLink} onClick={collapseMobileNavbar}>
                                            <i className="bi bi-file-earmark-person text-primary"></i>
                                            <span>{t('header.user.profile')}</span>
                                        </Link>
                                    </li>
                                    {dashboardLink && (
                                        <li className="jf-user-dropdown-row">
                                            <Link className="dropdown-item jf-user-dropdown-item" to={dashboardLink} onClick={collapseMobileNavbar}>
                                                <i className="bi bi-speedometer2 text-primary"></i>
                                                <span>{t('header.user.dashboard')}</span>
                                            </Link>
                                        </li>
                                    )}
                                    {messagingLink && (
                                        <li className="jf-user-dropdown-row">
                                            <Link className="dropdown-item jf-user-dropdown-item" to={messagingLink} onClick={collapseMobileNavbar}>
                                                <i className="bi bi-chat-dots text-primary"></i>
                                                <span>{t('header.user.messages')}</span>
                                            </Link>
                                        </li>
                                    )}
                                    {!isAdmin && (isEmployer ? (
                                        <li className="jf-user-dropdown-row">
                                            <Link className="dropdown-item jf-user-dropdown-item" to="/employer/jobs" onClick={collapseMobileNavbar}>
                                                <i className="bi bi-briefcase text-primary"></i>
                                                <span>{t('header.user.manageEmployerJobs')}</span>
                                            </Link>
                                        </li>
                                    ) : (
                                        <li className="jf-user-dropdown-row">
                                            <div className="dropdown-item jf-user-dropdown-item jf-user-dropdown-toggle"
                                                onClick={e => { e.stopPropagation(); setShowJobManagement(!showJobManagement); }}>
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="bi bi-briefcase text-primary"></i>
                                                    <span>{t('header.user.manageJobs')}</span>
                                                </div>
                                                <i className={`bi bi-chevron-${showJobManagement ? 'up' : 'down'}`}></i>
                                            </div>
                                            {showJobManagement && (
                                                <ul className="list-unstyled jf-user-submenu-list">
                                                    <li>
                                                        <Link className="jf-user-submenu-link" to="/jobs/applied" onClick={collapseMobileNavbar}>
                                                            <i className="bi bi-file-earmark-check text-primary"></i>
                                                            <span>{t('header.jobsMenu.appliedJobs')}</span>
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link className="jf-user-submenu-link" to="/jobs/saved" onClick={collapseMobileNavbar}>
                                                            <i className="bi bi-bookmark text-primary"></i>
                                                            <span>{t('header.jobsMenu.savedJobs')}</span>
                                                        </Link>
                                                    </li>
                                                </ul>
                                            )}
                                        </li>
                                    ))}
                                    <li className="jf-user-dropdown-row">
                                        <Link className="dropdown-item jf-user-dropdown-item" to="/support" onClick={collapseMobileNavbar}>
                                            <i className="bi bi-bell text-primary"></i>
                                            <span>{t('header.user.notifications')}</span>
                                        </Link>
                                    </li>
                                    <li><hr className="dropdown-divider" /></li>
                                    <li className="jf-user-dropdown-row jf-user-dropdown-row-last">
                                        <button className="btn btn-link text-decoration-none jf-user-logout-btn"
                                                onClick={handleLogout}>
                                            {t('header.user.logout')}
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Header;