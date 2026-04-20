import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './ForgotPassword.css';
import { API_BASE as CLIENT_API_BASE } from '../../config/apiBase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const OTP_REGEX = /^\d{6}$/;
const PASSWORD_MIN_LENGTH = 8;

const ForgotPassword = ({ onClose, inline = false }) => {
    const { t } = useTranslation();
    const apiBase = CLIENT_API_BASE;
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    const normalizedEmail = email.trim();

    const clearAlerts = () => {
        setError('');
        setMessage('');
    };

    const closePanel = () => {
        if (typeof onClose === 'function') {
            onClose();
        }
    };

    const validateEmail = (value) => EMAIL_REGEX.test(String(value || '').trim().toLowerCase());

    const sendOtp = async ({ keepCurrentStep = false } = {}) => {
        if (!validateEmail(normalizedEmail)) {
            setError(t('authPages.forgotPassword.errors.invalidEmail'));
            return;
        }

        clearAlerts();
        setLoading(true);

        try {
            const res = await fetch(`${apiBase}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalizedEmail })
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(data?.error || 'send-otp-failed');
            }

            setMessage(
                keepCurrentStep
                    ? t('authPages.forgotPassword.messages.otpResent')
                    : t('authPages.forgotPassword.messages.otpSent')
            );
            setResendTimer(60);

            if (!keepCurrentStep) {
                setOtp('');
                setNewPassword('');
                setConfirmPassword('');
                setShowNewPassword(false);
                setShowConfirmPassword(false);
                setStep(2);
            }
        } catch (e) {
            setError(t('authPages.forgotPassword.errors.sendOtpFailed'));
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        clearAlerts();

        if (!OTP_REGEX.test(String(otp || '').trim())) {
            setError(t('authPages.forgotPassword.errors.invalidOtpFormat'));
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${apiBase}/auth/verify-reset-password-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: normalizedEmail,
                    otp: String(otp || '').trim()
                })
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(data?.error || 'invalid-otp');
            }

            setMessage(t('authPages.forgotPassword.messages.otpVerified'));
            setStep(3);
        } catch (e) {
            setError(t('authPages.forgotPassword.errors.invalidOtp'));
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async () => {
        clearAlerts();

        if (!OTP_REGEX.test(String(otp || '').trim())) {
            setError(t('authPages.forgotPassword.errors.invalidOtpNeedReverify'));
            setStep(2);
            return;
        }

        const password = String(newPassword || '');
        const confirm = String(confirmPassword || '');
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);

        if (password.length < PASSWORD_MIN_LENGTH) {
            setError(t('authPages.forgotPassword.errors.passwordMinLength'));
            return;
        }

        if (!hasLetter || !hasNumber) {
            setError(t('authPages.forgotPassword.errors.passwordRequireLetterNumber'));
            return;
        }

        if (password !== confirm) {
            setError(t('authPages.forgotPassword.errors.confirmPasswordMismatch'));
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${apiBase}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: normalizedEmail,
                    otp: String(otp || '').trim(),
                    newPassword: password
                })
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(data?.error || 'reset-password-failed');
            }

            setMessage(t('authPages.forgotPassword.messages.resetPasswordSuccess'));
            setNewPassword('');
            setConfirmPassword('');
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            setStep(4);
        } catch (e) {
            setError(t('authPages.forgotPassword.errors.resetPasswordFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (resendTimer <= 0) return undefined;

        const intervalId = window.setInterval(() => {
            setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, [resendTimer > 0]);

    const handleResend = async () => {
        if (resendTimer > 0 || loading) return;
        await sendOtp({ keepCurrentStep: true });
    };

    const handleChangeEmail = () => {
        clearAlerts();
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setStep(1);
    };

    const handleKeyDownEmail = (event) => {
        if (event.key === 'Enter' && validateEmail(normalizedEmail) && !loading) {
            sendOtp();
        }
    };

    const handleKeyDownOtp = (event) => {
        if (event.key === 'Enter' && OTP_REGEX.test(String(otp || '').trim()) && !loading) {
            verifyOtp();
        }
    };

    const handleKeyDownReset = (event) => {
        if (event.key === 'Enter' && newPassword && confirmPassword && !loading) {
            resetPassword();
        }
    };

    const bodyFields = (
        <>
            {error && <div className="alert alert-danger">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}

            <p className="forgot-step-meta">{t('authPages.forgotPassword.stepLabel', { step: Math.min(step, 3) })}</p>

            {step === 1 && (
                <>
                    <label className="forgot-field-label" htmlFor="forgot-email">{t('authPages.forgotPassword.labels.registeredEmail')}</label>
                    <input
                        id="forgot-email"
                        type="email"
                        className="form-control mb-2"
                        placeholder={t('authPages.forgotPassword.placeholders.email')}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        onKeyDown={handleKeyDownEmail}
                        autoComplete="email"
                    />
                    <button className="forgot-btn forgot-btn-primary w-100" onClick={() => sendOtp()} disabled={loading || !validateEmail(normalizedEmail)}>
                        {loading ? t('authPages.forgotPassword.sending') : t('authPages.forgotPassword.sendOtp')}
                    </button>
                </>
            )}

            {step === 2 && (
                <>
                    <p className="forgot-step-title">{t('authPages.forgotPassword.step2.title')}</p>
                    <p className="forgot-help-text">{t('authPages.forgotPassword.step2.hint', { email: normalizedEmail })}</p>
                    <input
                        type="text"
                        className="form-control forgot-otp-input mb-2"
                        placeholder={t('authPages.forgotPassword.placeholders.otp')}
                        value={otp}
                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                        onKeyDown={handleKeyDownOtp}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                    />
                    <div className="forgot-action-row">
                        <button
                            type="button"
                            className="forgot-btn forgot-btn-secondary forgot-btn-resend"
                            onClick={handleResend}
                            disabled={resendTimer > 0 || loading}
                        >
                            {resendTimer > 0
                                ? t('authPages.forgotPassword.step2.resendWithTimer', { seconds: resendTimer })
                                : t('authPages.forgotPassword.step2.resend')}
                        </button>
                        <button
                            type="button"
                            className="forgot-btn forgot-btn-success forgot-btn-verify"
                            onClick={verifyOtp}
                            disabled={loading || !OTP_REGEX.test(String(otp || '').trim())}
                        >
                            {loading ? t('authPages.forgotPassword.verifying') : t('authPages.forgotPassword.step2.verifyOtp')}
                        </button>
                    </div>
                    <button type="button" className="btn btn-link forgot-change-email" onClick={handleChangeEmail} disabled={loading}>
                        {t('authPages.forgotPassword.step2.changeEmail')}
                    </button>
                </>
            )}

            {step === 3 && (
                <>
                    <p className="forgot-step-title">{t('authPages.forgotPassword.step3.title')}</p>
                    <p className="forgot-help-text">{t('authPages.forgotPassword.step3.hint')}</p>
                    <div className="forgot-password-field mb-2">
                        <input
                            type={showNewPassword ? 'text' : 'password'}
                            className="form-control"
                            placeholder={t('authPages.forgotPassword.placeholders.newPassword')}
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                            onKeyDown={handleKeyDownReset}
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            className="forgot-password-toggle"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            aria-label={showNewPassword
                                ? t('authPages.forgotPassword.aria.hideNewPassword')
                                : t('authPages.forgotPassword.aria.showNewPassword')}
                        >
                            <i className={`bi ${showNewPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                        </button>
                    </div>

                    <div className="forgot-password-field mb-2">
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            className="form-control"
                            placeholder={t('authPages.forgotPassword.placeholders.confirmPassword')}
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            onKeyDown={handleKeyDownReset}
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            className="forgot-password-toggle"
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            aria-label={showConfirmPassword
                                ? t('authPages.forgotPassword.aria.hideConfirmPassword')
                                : t('authPages.forgotPassword.aria.showConfirmPassword')}
                        >
                            <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                        </button>
                    </div>
                    <button className="forgot-btn forgot-btn-success w-100" onClick={resetPassword} disabled={loading || !newPassword || !confirmPassword}>
                        {loading ? t('authPages.forgotPassword.processing') : t('authPages.forgotPassword.step3.resetPassword')}
                    </button>
                </>
            )}

            {step === 4 && (
                <>
                    <p>{t('authPages.forgotPassword.step4.successDescription')}</p>
                    <button className="forgot-btn forgot-btn-primary w-100" onClick={closePanel}>{t('authPages.forgotPassword.step4.loginNow')}</button>
                </>
            )}
        </>
    );

    if (inline) {
        return (
            <div className="forgot-modal forgot-modal-inline">
                <div className="modal-body">
                    {bodyFields}
                </div>
            </div>
        );
    }

    return (
        <div className="forgot-modal modal-backdrop show" style={{ display: 'block' }}>
            <div className="modal d-block" tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered forgot-modal-dialog">
                    <div className="forgot-modal-content modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">{t('authPages.forgotPassword.modalTitle')}</h5>
                            <button type="button" className="btn-close" aria-label="Close" onClick={closePanel}></button>
                        </div>
                        <div className="modal-body">
                            {bodyFields}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
