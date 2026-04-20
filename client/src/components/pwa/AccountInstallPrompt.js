import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import usePWAInstallPrompt from '../../hooks/usePWAInstallPrompt';
import './AccountInstallPrompt.css';

const ACCOUNT_PROMPT_KEY_PREFIX = 'jobfinder:pwa-install-once:';

const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const id = user?.id || user?.MaNguoiDung || user?.maNguoiDung || user?.userId || user?.userID;
    return id ? String(id) : '';
  } catch {
    return '';
  }
};

const getPromptStorageKey = (userId) => `${ACCOUNT_PROMPT_KEY_PREFIX}${userId}`;

const AccountInstallPrompt = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const {
    isInstalled,
    isStandalone,
    canTriggerPrompt,
    isIOS,
    promptInstall,
  } = usePWAInstallPrompt();

  const [userId, setUserId] = useState(() => getCurrentUserId());
  const [isVisible, setIsVisible] = useState(false);
  const [feedback, setFeedback] = useState('');

  const storageKey = useMemo(() => (userId ? getPromptStorageKey(userId) : ''), [userId]);

  useEffect(() => {
    setUserId(getCurrentUserId());
  }, [location.pathname]);

  useEffect(() => {
    const syncUserId = () => setUserId(getCurrentUserId());

    syncUserId();
    window.addEventListener('focus', syncUserId);
    window.addEventListener('storage', syncUserId);

    return () => {
      window.removeEventListener('focus', syncUserId);
      window.removeEventListener('storage', syncUserId);
    };
  }, []);

  useEffect(() => {
    if (!userId || !storageKey) {
      setIsVisible(false);
      return;
    }

    if (isInstalled || isStandalone) {
      setIsVisible(false);
      return;
    }

    const hasSeen = localStorage.getItem(storageKey) === '1';
    if (hasSeen) {
      setIsVisible(false);
      return;
    }

    if (!isIOS && !canTriggerPrompt) {
      setIsVisible(false);
      return;
    }

    localStorage.setItem(storageKey, '1');
    setIsVisible(true);
  }, [userId, storageKey, isInstalled, isStandalone, isIOS, canTriggerPrompt]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleInstall = async () => {
    if (isIOS) {
      setFeedback(t('components.pwa.accountInstallPrompt.feedback.iosManual'));
      return;
    }

    const outcome = await promptInstall();

    if (outcome === 'accepted') {
      setIsVisible(false);
      return;
    }

    if (outcome === 'dismissed') {
      setFeedback(t('components.pwa.accountInstallPrompt.feedback.dismissed'));
      setIsVisible(false);
      return;
    }

    setFeedback(t('components.pwa.accountInstallPrompt.feedback.cannotOpen'));
  };

  if (!isVisible) return null;

  return (
    <div className="account-install-prompt" role="dialog" aria-label={t('components.pwa.accountInstallPrompt.ariaLabel')}>
      <div className="account-install-prompt__icon-wrap">
        <img src="/logo.jpg" alt="JobFinder" className="account-install-prompt__icon" />
      </div>

      <div className="account-install-prompt__text">
        <h4>{t('components.pwa.accountInstallPrompt.title')}</h4>
        <p>{t('components.pwa.accountInstallPrompt.description')}</p>
        {feedback ? <small>{feedback}</small> : null}
      </div>

      <div className="account-install-prompt__actions">
        <button type="button" className="install" onClick={handleInstall}>{t('components.pwa.accountInstallPrompt.installButton')}</button>
        <button type="button" className="later" onClick={handleDismiss}>{t('components.pwa.accountInstallPrompt.laterButton')}</button>
      </div>
    </div>
  );
};

export default AccountInstallPrompt;
