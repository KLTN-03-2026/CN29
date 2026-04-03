import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotification } from '../../../components/NotificationProvider';
import { API_BASE as CLIENT_API_BASE } from '../../../config/apiBase';

const REMEMBER_KEY = 'remembered_login_identity';

const LoginForm = ({ onSuccess }) => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const apiBase = CLIENT_API_BASE;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const rememberedIdentity = localStorage.getItem(REMEMBER_KEY);
    if (rememberedIdentity) {
      setEmail(rememberedIdentity);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const raw = await response.text();
      let data = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        const backendHint = response.status === 405
          ? 'API chưa trỏ đúng backend. Kiểm tra REACT_APP_API_BASE trên Vercel và redeploy.'
          : '';
        throw new Error(data.error || `${response.status} ${response.statusText}. ${backendHint}`.trim());
      }

      if (!data.token || !data.user) {
        throw new Error('Phản hồi đăng nhập không hợp lệ từ máy chủ.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, email.trim());
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      notify({ type: 'success', message: `Đăng nhập thành công! Xin chào ${data.user.name}` });

      if (onSuccess) {
        onSuccess();
      }

      switch (data.user.role) {
        case 'Quan tri':
        case 'Quản trị':
        case 'Sieu quan tri vien':
        case 'Siêu quản trị viên':
          navigate('/admin/dashboard');
          break;
        case 'Nha tuyen dung':
        case 'Nhà tuyển dụng':
          navigate('/employer');
          break;
        case 'Ung vien':
        case 'Ứng viên':
        default:
          navigate('/');
          break;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <label className="auth-field-label" htmlFor="loginIdentity">
          Email hoặc tên đăng nhập
        </label>
        <input
          id="loginIdentity"
          type="text"
          className="auth-input"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="auth-field">
        <label className="auth-field-label" htmlFor="loginPassword">
          Mật khẩu
        </label>
        <div className="auth-input-wrap">
          <input
            id="loginPassword"
            type={showPassword ? 'text' : 'password'}
            className="auth-input auth-input--with-icon"
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="auth-password-btn"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
          </button>
        </div>
      </div>

      {error ? <div className="auth-error-banner">{error}</div> : null}

      <div className="auth-row-between">
        <label className="auth-checkbox-wrap" htmlFor="rememberMe">
          <input
            id="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span>Ghi nhớ đăng nhập</span>
        </label>
        <Link className="auth-inline-link" to="/forgot-password">
          Quên mật khẩu?
        </Link>
      </div>

      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? 'Đang xử lý...' : 'Đăng nhập ngay'}
        <i className="bi bi-arrow-right"></i>
      </button>

      <p className="auth-switch-inline">
        Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
      </p>
    </form>
  );
};

export default LoginForm;
