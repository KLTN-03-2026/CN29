import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './AdminNotificationsPage.css';

const AdminNotificationsPage = () => {
  const { t } = useTranslation();

  const notificationItems = [
    {
      title: t('admin.notificationsPage.items.messages.title'),
      description: t('admin.notificationsPage.items.messages.description'),
      icon: 'bi-chat-dots',
      accent: 'primary'
    },
    {
      title: t('admin.notificationsPage.items.alerts.title'),
      description: t('admin.notificationsPage.items.alerts.description'),
      icon: 'bi-shield-check',
      accent: 'warning'
    },
    {
      title: t('admin.notificationsPage.items.pwa.title'),
      description: t('admin.notificationsPage.items.pwa.description'),
      icon: 'bi-phone',
      accent: 'info'
    }
  ];

  return (
    <div className="admin-notifications-page">
      <section className="admin-notification-hero">
        <div>
          <span className="admin-notification-eyebrow">{t('admin.notificationsPage.eyebrow')}</span>
          <h1>{t('admin.notificationsPage.title')}</h1>
          <p>
            {t('admin.notificationsPage.description')}
          </p>
        </div>
        <Link className="btn btn-light admin-notification-hero-btn" to="/support">
          <i className="bi bi-life-preserver me-2"></i>
          {t('admin.notificationsPage.openCenter')}
        </Link>
      </section>

      <section className="admin-notification-grid">
        {notificationItems.map((item) => (
          <article key={item.title} className="admin-notification-card">
            <div className={`admin-notification-icon ${item.accent}`}>
              <i className={`bi ${item.icon}`}></i>
            </div>
            <div>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="admin-notification-footer">
        <div>
          <h2>{t('admin.notificationsPage.quickLinksTitle')}</h2>
          <p>{t('admin.notificationsPage.quickLinksDescription')}</p>
        </div>
        <div className="admin-notification-links">
          <Link to="/admin/dashboard" className="admin-notification-link">{t('admin.notificationsPage.links.dashboard')}</Link>
          <Link to="/admin/reports" className="admin-notification-link">{t('admin.notificationsPage.links.reports')}</Link>
          <Link to="/admin/usersmanament" className="admin-notification-link">{t('admin.notificationsPage.links.users')}</Link>
        </div>
      </section>
    </div>
  );
};

export default AdminNotificationsPage;
