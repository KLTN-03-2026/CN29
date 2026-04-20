import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CandidateDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="container mt-5">
            <div className="row">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2>{t('candidatePages.dashboard.title')}</h2>
                        <button className="btn btn-outline-danger" onClick={handleLogout}>
                            {t('candidatePages.dashboard.logout')}
                        </button>
                    </div>
                    <div className="alert alert-primary">
                        <h4>{t('candidatePages.dashboard.greeting', { name: user.name || '' })}</h4>
                        <p>{t('candidatePages.dashboard.roleLabel')}: <strong>{user.role}</strong></p>
                    </div>
                </div>
            </div>
            
            <div className="row g-4 mt-3">
                <div className="col-md-3">
                    <div className="card text-center">
                        <div className="card-body">
                            <h5 className="card-title">{t('candidatePages.dashboard.cards.cvProfile')}</h5>
                            <p className="card-text display-6">0</p>
                            <button className="btn btn-primary btn-sm">{t('candidatePages.dashboard.actions.createCv')}</button>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-center">
                        <div className="card-body">
                            <h5 className="card-title">{t('candidatePages.dashboard.cards.appliedJobs')}</h5>
                            <p className="card-text display-6">0</p>
                            <button className="btn btn-info btn-sm text-white">{t('candidatePages.dashboard.actions.view')}</button>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-center">
                        <div className="card-body">
                            <h5 className="card-title">{t('candidatePages.dashboard.cards.savedJobs')}</h5>
                            <p className="card-text display-6">0</p>
                            <button className="btn btn-warning btn-sm">{t('candidatePages.dashboard.actions.view')}</button>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-center">
                        <div className="card-body">
                            <h5 className="card-title">{t('candidatePages.dashboard.cards.notifications')}</h5>
                            <p className="card-text display-6">0</p>
                            <button className="btn btn-secondary btn-sm">{t('candidatePages.dashboard.actions.view')}</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mt-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">
                            <h5>{t('candidatePages.dashboard.matchingSection.title')}</h5>
                        </div>
                        <div className="card-body">
                            <p className="text-muted">{t('candidatePages.dashboard.matchingSection.description')}</p>
                            <button className="btn btn-primary">{t('candidatePages.dashboard.actions.completeProfile')}</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mt-4">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-header">
                            <h5>{t('candidatePages.dashboard.applicationsSection.title')}</h5>
                        </div>
                        <div className="card-body">
                            <p className="text-muted">{t('candidatePages.dashboard.applicationsSection.empty')}</p>
                            <button className="btn btn-success">{t('candidatePages.dashboard.actions.findJobsNow')}</button>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-header">
                            <h5>{t('candidatePages.dashboard.savedSection.title')}</h5>
                        </div>
                        <div className="card-body">
                            <p className="text-muted">{t('candidatePages.dashboard.savedSection.empty')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CandidateDashboard;
