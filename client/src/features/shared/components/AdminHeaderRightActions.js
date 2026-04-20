import React from 'react';
import { ChevronDown, House, Languages, ShieldCheck } from 'lucide-react';
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
    isEnglish,
    onToggleLanguage,
    languageToggleTitle,
    languageAriaLabel,
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
    return (
        <div className="admin-header-user">
            <button
                type="button"
                className="admin-header-home-btn"
                onClick={onToggleLanguage}
                title={languageToggleTitle}
                aria-label={languageAriaLabel}
            >
                <Languages size={16} />
                <span>{isEnglish ? 'VI' : 'EN'}</span>
            </button>

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
