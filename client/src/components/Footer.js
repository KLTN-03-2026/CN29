import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer = () => {
    const { t } = useTranslation();

    return (
        <footer className="jf-footer mt-auto">
            <div className="container">
                <div className="row g-3 align-items-start jf-footer-grid">
                    <div className="col-12 col-md-3 d-flex flex-column">
                        <div className="fw-semibold jf-footer-title">{t('components.footer.brandTitle')}</div>
                        <ul className="list-unstyled mt-2 mb-0">
                            <li><Link to="/">{t('components.footer.links.home')}</Link></li>
                            <li><Link to="/career-guide">{t('components.footer.links.careerGuide')}</Link></li>
                            <li><Link to="/jobs">{t('components.footer.links.findJobs')}</Link></li>
                            <li><a href="mailto:support@jobfinder.vn">support@jobfinder.vn</a></li>
                        </ul>
                    </div>
                    <div className="col-12 col-md-3 d-flex flex-column">
                        <div className="fw-semibold mb-2 jf-footer-title">{t('components.footer.candidate.title')}</div>
                        <ul className="list-unstyled mb-0">
                            <li><Link to="/jobs">{t('components.footer.candidate.exploreJobs')}</Link></li>
                            <li><Link to="/jobs/saved">{t('components.footer.candidate.savedJobs')}</Link></li>
                            <li><Link to="/jobs/applied">{t('components.footer.candidate.appliedJobs')}</Link></li>
                            <li><Link to="/profile">{t('components.footer.candidate.completeProfile')}</Link></li>
                        </ul>
                    </div>
                    <div className="col-12 col-md-3 d-flex flex-column">
                        <div className="fw-semibold mb-2 jf-footer-title">{t('components.footer.employer.title')}</div>
                        <ul className="list-unstyled mb-0">
                            <li><Link to="/register">{t('components.footer.employer.registerAccount')}</Link></li>
                            <li><Link to="/employer">{t('components.footer.employer.manageRecruitment')}</Link></li>
                            <li><Link to="/jobs">{t('components.footer.employer.marketOverview')}</Link></li>
                        </ul>
                    </div>
                    <div className="col-12 col-md-3 d-flex flex-column">
                        <div className="fw-semibold mb-2 jf-footer-title">{t('components.footer.policies.title')}</div>
                        <ul className="list-unstyled mb-0">
                            <li><Link to="/career-guide">{t('components.footer.policies.jobGuide')}</Link></li>
                            <li><a href="/#">{t('components.footer.policies.terms')}</a></li>
                            <li><a href="/#">{t('components.footer.policies.privacy')}</a></li>
                            <li><a href="/#">{t('components.footer.policies.support')}</a></li>
                        </ul>
                    </div>
                </div>
                <div className="jf-footer-bottom">
                    © {new Date().getFullYear()} JobFinder. {t('components.footer.bottomTagline')}
                </div>
            </div>
        </footer>
    );
};

export default Footer;