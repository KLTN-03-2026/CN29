import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE as CLIENT_API_BASE } from '../../config/apiBase';

const VerifyOTP = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const email = location.state?.email || '';
    const otpDeliveryFailed = Boolean(location.state?.otpDeliveryFailed);
    const verificationMessage = String(location.state?.verificationMessage || '');
    const initialOtp = String(location.state?.otp || '').replace(/\D/g, '').slice(0, 6);
    const apiBase = CLIENT_API_BASE;
    
    const [otp, setOtp] = useState(initialOtp);
    const [fallbackOtp, setFallbackOtp] = useState(initialOtp);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    useEffect(() => {
        if (!email) {
            navigate('/register', { replace: true });
        }
    }, [email, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (otp.length !== 6) {
            setError(t('authPages.verifyOtp.errors.invalidOtpLength'));
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${apiBase}/auth/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, otp })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || t('authPages.verifyOtp.errors.verifyFailed'));
            }

            const prefill = {
                ...(location.state?.prefill || {}),
                ...(data.prefill || {})
            };

            if (data.token && data.user) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            if (Object.keys(prefill).length > 0) {
                localStorage.setItem('pending_onboarding_prefill', JSON.stringify(prefill));
            }

            const nextStep = String(data.nextStep || '').trim();
            if (nextStep) {
                setSuccess(t('authPages.verifyOtp.success.redirectNextStep'));
                setTimeout(() => {
                    navigate(nextStep, {
                        state: {
                            email,
                            prefill
                        },
                        replace: true
                    });
                }, 600);
                return;
            }

            setSuccess(t('authPages.verifyOtp.success.redirectLogin'));
            setTimeout(() => {
                navigate('/login');
            }, 1200);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setError('');
        setSuccess('');
        setResending(true);

        try {
            const response = await fetch(`${apiBase}/auth/resend-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || t('authPages.verifyOtp.errors.resendFailed'));
            }

            const nextOtp = String(data.otp || '').replace(/\D/g, '').slice(0, 6);
            if (nextOtp) {
                setFallbackOtp(nextOtp);
                setOtp(nextOtp);
            }

            setSuccess(data.message);
        } catch (err) {
            setError(err.message);
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="container my-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card shadow">
                        <div className="card-body p-5">
                            <div className="text-center mb-4">
                                <i className="bi bi-envelope-check" style={{ fontSize: '4rem', color: '#0d6efd' }}></i>
                                <h2 className="mt-3 mb-2">{t('authPages.verifyOtp.title')}</h2>
                                <p className="text-muted">
                                    {otpDeliveryFailed
                                        ? t('authPages.verifyOtp.delivery.failedPrefix')
                                        : t('authPages.verifyOtp.delivery.sentPrefix')}<br />
                                    <strong>{email}</strong>
                                </p>
                            </div>

                            {otpDeliveryFailed && (
                                <div className="alert alert-warning" role="alert">
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    {verificationMessage || t('authPages.verifyOtp.delivery.fallbackWarning')}
                                </div>
                            )}

                            {fallbackOtp && (
                                <div className="alert alert-info" role="alert">
                                    <i className="bi bi-key-fill me-2"></i>
                                    {t('authPages.verifyOtp.tempOtpLabel')} <strong>{fallbackOtp}</strong>
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <label className="form-label text-center w-100 fw-bold">
                                        {t('authPages.verifyOtp.inputLabel')}
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control form-control-lg text-center"
                                        style={{ fontSize: '2rem', letterSpacing: '0.5rem' }}
                                        placeholder={t('authPages.verifyOtp.inputPlaceholder')}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        maxLength={6}
                                        required
                                        autoFocus
                                    />
                                    <small className="text-muted d-block text-center mt-2">
                                        {t('authPages.verifyOtp.inputHint')}
                                    </small>
                                </div>

                                {error && (
                                    <div className="alert alert-danger" role="alert">
                                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                        {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="alert alert-success" role="alert">
                                        <i className="bi bi-check-circle-fill me-2"></i>
                                        {success}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="btn btn-primary btn-lg w-100 mb-3"
                                    disabled={loading || otp.length !== 6}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            {t('authPages.verifyOtp.verifying')}
                                        </>
                                    ) : (
                                        t('authPages.verifyOtp.verifyButton')
                                    )}
                                </button>

                                <div className="text-center">
                                    <p className="mb-2">{t('authPages.verifyOtp.notReceived')}</p>
                                    <button
                                        type="button"
                                        className="btn btn-link"
                                        onClick={handleResendOTP}
                                        disabled={resending}
                                    >
                                        {resending ? t('authPages.verifyOtp.resending') : t('authPages.verifyOtp.resendButton')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyOTP;
