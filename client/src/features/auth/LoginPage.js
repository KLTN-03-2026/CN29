import React from 'react';
import AuthLayout from './components/AuthLayout';
import LoginForm from './components/LoginForm';

const LoginPage = () => {
  return (
    <AuthLayout
      mode="login"
      title="Chào mừng quay lại"
      subtitle="Đăng nhập để tiếp tục xây dựng CV và theo dõi cơ hội việc làm phù hợp với bạn."
      switchText="Chưa có tài khoản?"
      switchLabel="Đăng ký"
      switchTo="/register"
      heroImage="/images/auth-career-hero.svg"
      heroTitle="Bắt đầu hành trình nghề nghiệp của bạn."
      heroSubtitle="Tạo CV online, ứng tuyển nhanh và kết nối với nhà tuyển dụng uy tín chỉ trong vài phút."
    >
      <LoginForm />
    </AuthLayout>
  );
};

export default LoginPage;
