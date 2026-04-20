import React from 'react';
import { Menu } from 'lucide-react';
import './EmployerHeaderShell.css';

const EmployerHeaderShell = ({
    onToggleSidebar,
    toggleAriaLabel,
    toggleIcon,
    title,
    rightContent
}) => {
    return (
        <header className="employer-shell-header">
            <div className="employer-shell-header-left">
                <button
                    type="button"
                    className="employer-shell-sidebar-toggle"
                    onClick={onToggleSidebar}
                    aria-label={toggleAriaLabel}
                >
                    {toggleIcon || <Menu size={20} />}
                </button>
                {title ? <h1 className="employer-shell-page-title">{title}</h1> : null}
            </div>
            <div className="employer-shell-header-right">{rightContent}</div>
        </header>
    );
};

export default EmployerHeaderShell;
