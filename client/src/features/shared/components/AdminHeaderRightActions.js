import React from 'react';
import { ChevronDown, House, Moon, ShieldCheck, Sun } from 'lucide-react';
import './AdminHeaderRightActions.css';

const renderItemIcon = (icon) => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function') {
        const IconComponent = icon;
        return <IconComponent size={16} />;
    }
    return null;
};

const AdminHeaderRightActions = ({
    activeLanguage,
    onChangeLanguage,
    languageAriaLabel,
    activeTheme,
    onChangeTheme,
    themeAriaLabel,
    languageVietnameseLabel = 'VI',
    languageEnglishLabel = 'EN',
    languageVietnameseTitle,
    languageEnglishTitle,
    lightThemeTitle,
    darkThemeTitle,
    onGoHome,
    homeLabel,
    profileMenuOpen,
    onToggleProfileMenu,
    profileMenuRef,
    avatarUrl,
    displayName,
    roleLabel,
    onAvatarError,
    menuItems = []
}) => {
    const normalizedLanguage = String(activeLanguage || 'vi').toLowerCase();
    const isEnglish = normalizedLanguage.startsWith('en');
    const normalizedTheme = String(activeTheme || 'light').toLowerCase();
    const isDarkTheme = normalizedTheme === 'dark';

    return (
        <div className="admin-header-user">
            <div className="admin-header-segmented admin-header-language-group" role="group" aria-label={languageAriaLabel}>
                <button
                    type="button"
                    className={`admin-header-segmented-btn ${!isEnglish ? 'active' : ''}`}
                    onClick={() => onChangeLanguage('vi')}
                    title={languageVietnameseTitle}
                    aria-label={languageVietnameseTitle}
                    aria-pressed={!isEnglish}
                >
                    <span>{languageVietnameseLabel}</span>
                </button>
                <button
                    type="button"
                    className={`admin-header-segmented-btn ${isEnglish ? 'active' : ''}`}
                    onClick={() => onChangeLanguage('en')}
                    title={languageEnglishTitle}
                    aria-label={languageEnglishTitle}
                    aria-pressed={isEnglish}
                >
                    <span>{languageEnglishLabel}</span>
                </button>
            </div>

            <div className="admin-header-segmented admin-header-theme-group" role="group" aria-label={themeAriaLabel}>
                <button
                    type="button"
                    className={`admin-header-segmented-btn ${!isDarkTheme ? 'active' : ''}`}
                    onClick={() => onChangeTheme('light')}
                    title={lightThemeTitle}
                    aria-label={lightThemeTitle}
                    aria-pressed={!isDarkTheme}
                >
                    <Sun size={15} />
                </button>
                <button
                    type="button"
                    className={`admin-header-segmented-btn ${isDarkTheme ? 'active' : ''}`}
                    onClick={() => onChangeTheme('dark')}
                    title={darkThemeTitle}
                    aria-label={darkThemeTitle}
                    aria-pressed={isDarkTheme}
                >
                    <Moon size={15} />
                </button>
            </div>

            <button
                type="button"
                className="admin-header-home-btn"
                onClick={onGoHome}
            >
                <House size={16} />
                <span>{homeLabel}</span>
            </button>

            <div className={`admin-header-user-menu ${profileMenuOpen ? 'open' : ''}`} ref={profileMenuRef}>
                <button
                    type="button"
                    className="admin-header-user-trigger"
                    onClick={onToggleProfileMenu}
                    aria-haspopup="menu"
                    aria-expanded={profileMenuOpen}
                >
                    <div className="admin-header-avatar">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={displayName}
                                onError={onAvatarError}
                            />
                        ) : (
                            <ShieldCheck size={15} />
                        )}
                    </div>
                    <div className="admin-header-user-info">
                        <strong>{displayName}</strong>
                        <small>{roleLabel}</small>
                    </div>
                    <ChevronDown size={16} className="admin-header-user-chevron" />
                </button>

                {profileMenuOpen && (
                    <div className="admin-header-dropdown" role="menu">
                        {menuItems.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                className={`admin-header-dropdown-item ${item.danger ? 'danger' : ''}`}
                                onClick={item.onClick}
                            >
                                {renderItemIcon(item.icon)}
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminHeaderRightActions;
