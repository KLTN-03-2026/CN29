import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import {
    Bell,
    BriefcaseBusiness,
    LayoutDashboard,
    LogOut,
    Menu,
    Moon,
    Sun,
    UserRound
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../components/NotificationProvider';
import { useDarkMode } from '../../context/DarkModeContext';
import EmployerHeaderShell from '../shared/components/EmployerHeaderShell';
import AdminHeaderRightActions from '../shared/components/AdminHeaderRightActions';
import './EmployerLayout.css';

const readStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
        return {};
    }
};

const syncLocalUserSnapshot = (overrides = {}) => {
    try {
        const current = readStoredUser();
        const next = {
            ...current,
            ...overrides
        };
        localStorage.setItem('user', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('jobfinder:user-updated', { detail: next }));
        return next;
    } catch {
        return readStoredUser();
    }
};

const SIDEBAR_LOGO_URL = '/images/logo.png';

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

const EmployerLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const { requestConfirm } = useNotification();
    const { isDarkMode, setTheme, toggleDarkMode } = useDarkMode();
    const [user, setUser] = useState(() => readStoredUser());
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const profileDropdownRef = useRef(null);
    const avatarHydratedUserIdRef = useRef('');

    const userId = user?.id || user?.MaNguoiDung || user?.userId || user?.userID || null;
    const displayName = user?.name || user?.HoTen || user?.hoTen || user?.fullName || user?.full_name || user?.email || t('employer.layout.defaultDisplayName');
    const roleLabel = user?.role || user?.VaiTro || user?.vaiTro || user?.LoaiNguoiDung || t('header.role.employer');
    const avatarRaw = String(
        user?.avatar
        || user?.avatarAbsoluteUrl
        || user?.AnhDaiDien
        || user?.anhDaiDien
        || user?.avatarUrl
        || user?.avatar_url
        || ''
    ).trim();
    const avatarUrl = withAvatarVersion(avatarRaw, user?.avatarUpdatedAt);
    const normalizedLanguage = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase();
    const isEnglish = normalizedLanguage.startsWith('en');

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
            title: t('employer.layout.confirmLogout.title'),
            message: t('employer.layout.confirmLogout.message'),
            confirmText: t('employer.layout.confirmLogout.confirm'),
            cancelText: t('employer.layout.confirmLogout.cancel')
        });
        if (!confirmed) return;

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    useEffect(() => {
        setShowProfileDropdown(false);
    }, [location.pathname]);

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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!profileDropdownRef.current) return;
            if (profileDropdownRef.current.contains(event.target)) return;
            setShowProfileDropdown(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const normalizedUserId = String(userId || '').trim();
        if (!normalizedUserId) return undefined;
        if (avatarRaw) return undefined;
        if (avatarHydratedUserIdRef.current === normalizedUserId) return undefined;

        avatarHydratedUserIdRef.current = normalizedUserId;
        let cancelled = false;

        (async () => {
            try {
                const response = await fetch(`/users/profile/${normalizedUserId}`);
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data?.success || cancelled) return;

                const profile = data.profile || {};
                const normalizedAvatar = normalizeAvatarUrl(
                    profile.avatarAbsoluteUrl
                    || profile.avatarUrl
                    || profile.avatar
                    || profile.AnhDaiDien
                    || ''
                );
                const normalizedName = String(profile.fullName || '').trim();

                if (!normalizedAvatar && !normalizedName) return;

                const next = syncLocalUserSnapshot({
                    ...(normalizedName
                        ? {
                            name: normalizedName,
                            HoTen: normalizedName
                        }
                        : {}),
                    ...(normalizedAvatar
                        ? {
                            avatar: normalizedAvatar,
                            AnhDaiDien: normalizedAvatar,
                            avatarAbsoluteUrl: normalizedAvatar,
                            avatarUrl: normalizedAvatar,
                            avatarUpdatedAt: Date.now()
                        }
                        : {})
                });

                if (!cancelled) {
                    setUser(next);
                }
            } catch {
                // Ignore silent hydration errors; fallback icon remains.
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [avatarRaw, userId]);

    const handleHeaderMenuNavigate = (to) => {
        setShowProfileDropdown(false);
        navigate(to);
    };

    const menuItems = [
        {
            path: '/employer',
            icon: 'bi-speedometer2',
            labelKey: 'employer.layout.menu.dashboard',
            subtitleKey: 'employer.layout.menuSubtitle.dashboard',
            exact: true
        },
        {
            path: '/employer/cv-search',
            icon: 'bi-search',
            labelKey: 'employer.layout.menu.cvSearch',
            subtitleKey: 'employer.layout.menuSubtitle.cvSearch'
        },
        {
            path: '/employer/cv-manage',
            icon: 'bi-bookmark-check',
            labelKey: 'employer.layout.menu.cvManage',
            subtitleKey: 'employer.layout.menuSubtitle.cvManage'
        },
        {
            path: '/employer/jobs',
            icon: 'bi-briefcase',
            labelKey: 'employer.layout.menu.jobs',
            subtitleKey: 'employer.layout.menuSubtitle.jobs'
        },
        {
            path: '/employer/notifications',
            icon: 'bi-bell',
            labelKey: 'employer.layout.menu.notifications',
            subtitleKey: 'employer.layout.menuSubtitle.notifications'
        },
        {
            path: '/employer/applications',
            icon: 'bi-file-earmark-person',
            labelKey: 'employer.layout.menu.applications',
            subtitleKey: 'employer.layout.menuSubtitle.applications'
        },
        {
            path: '/employer/messages',
            icon: 'bi-chat-dots',
            labelKey: 'employer.layout.menu.messages',
            subtitleKey: 'employer.layout.menuSubtitle.messages'
        },
        {
            path: '/employer/company',
            icon: 'bi-building',
            labelKey: 'employer.layout.menu.company',
            subtitleKey: 'employer.layout.menuSubtitle.company'
        },
        {
            path: '/employer/account',
            icon: 'bi-person',
            labelKey: 'employer.layout.menu.account',
            subtitleKey: 'employer.layout.menuSubtitle.account'
        }
    ];

    const employerHeaderMenuItems = [
        {
            key: 'profile',
            icon: UserRound,
            label: t('employer.layout.dropdown.profile'),
            onClick: () => handleHeaderMenuNavigate('/employer/account')
        },
        {
            key: 'dashboard',
            icon: LayoutDashboard,
            label: t('employer.layout.dropdown.dashboard'),
            onClick: () => handleHeaderMenuNavigate('/employer')
        },
        {
            key: 'jobs',
            icon: BriefcaseBusiness,
            label: t('employer.layout.dropdown.jobs'),
            onClick: () => handleHeaderMenuNavigate('/employer/jobs')
        },
        {
            key: 'notifications',
            icon: Bell,
            label: t('employer.layout.dropdown.notifications'),
            onClick: () => handleHeaderMenuNavigate('/employer/notifications')
        },
        {
            key: 'theme',
            icon: isDarkMode ? Sun : Moon,
            label: isDarkMode ? t('common.switchToLight') : t('common.switchToDark'),
            onClick: () => {
                setShowProfileDropdown(false);
                toggleDarkMode();
            }
        },
        {
            key: 'logout',
            icon: LogOut,
            label: t('employer.layout.dropdown.logout'),
            danger: true,
            onClick: () => {
                setShowProfileDropdown(false);
                handleLogout();
            }
        }
    ];

    const isActive = (menuPath, exact = false) => {
        if (exact) {
            return location.pathname === menuPath;
        }
        return location.pathname.startsWith(menuPath);
    };

    const handleToggleSidebar = () => {
        if (window.matchMedia('(max-width: 991px)').matches) {
            setMobileMenuOpen((prev) => !prev);
            return;
        }
        setSidebarCollapsed((prev) => !prev);
    };

    const closeMobileMenu = () => setMobileMenuOpen(false);

    return (
        <div className="employer-layout">
            <button
                type="button"
                className={`employer-mobile-overlay ${mobileMenuOpen ? 'show' : ''}`}
                onClick={closeMobileMenu}
                aria-label={t('employer.layout.aria.closeMenu')}
            />

            <aside className={`employer-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                <div className="employer-sidebar-brand" title="JobFinder">
                    <img
                        src={SIDEBAR_LOGO_URL}
                        alt="JobFinder"
                        className="employer-sidebar-logo"
                        onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = 'https://i.postimg.cc/nhWfcVvh/logo.png';
                        }}
                    />
                    {!sidebarCollapsed && <span>JobFinder</span>}
                </div>

                <nav className="employer-menu">
                    {menuItems.map((item) => {
                        const active = isActive(item.path, item.exact);
                        const itemLabel = t(item.labelKey);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`employer-menu-item ${active ? 'active' : ''}`}
                                title={itemLabel}
                                onClick={closeMobileMenu}
                            >
                                <i className={`bi ${item.icon}`}></i>
                                {!sidebarCollapsed && <span>{itemLabel}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="employer-sidebar-footer">
                    <button
                        type="button"
                        className="employer-logout-btn"
                        onClick={handleLogout}
                    >
                        <i className="bi bi-box-arrow-right"></i>
                        {!sidebarCollapsed && <span>{t('header.user.logout')}</span>}
                    </button>
                </div>
            </aside>

            <div className={`employer-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <EmployerHeaderShell
                    onToggleSidebar={handleToggleSidebar}
                    toggleAriaLabel={t('employer.layout.aria.toggleMenu')}
                    toggleIcon={<Menu size={20} />}
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
                            homeLabel={t('common.home')}
                            profileMenuOpen={showProfileDropdown}
                            onToggleProfileMenu={() => setShowProfileDropdown((prev) => !prev)}
                            profileMenuRef={profileDropdownRef}
                            avatarUrl={avatarUrl}
                            displayName={displayName}
                            roleLabel={roleLabel}
                            onAvatarError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                            }}
                            menuItems={employerHeaderMenuItems}
                        />
                    )}
                />

                <div className="main-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default EmployerLayout;
