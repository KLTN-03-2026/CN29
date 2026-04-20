import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const EmployerDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2>{t('components.employerDashboard.title')}</h2>
                        <button className="btn btn-outline-danger" onClick={handleLogout}>
                            {t('components.employerDashboard.logout')}
                        </button>
                    </div>
                    <div className="alert alert-success">
                        <h4>{t('components.employerDashboard.greeting', { name: user.name || '' })}</h4>
                        <p>{t('components.employerDashboard.roleLabel')}: <strong>{user.role}</strong></p>
                    </div>
                </div>
            </div>
            
            {/* Nội dung dashboard của bạn ở đây */}
        </div>
    );
};

export default EmployerDashboard;
