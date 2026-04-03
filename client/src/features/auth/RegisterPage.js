import React from 'react';
import AuthLayout from './components/AuthLayout';
import RegisterForm from './components/RegisterForm';

const RegisterPage = () => {
  return (
    <AuthLayout
      mode="register"
      title="Tạo tài khoản"
      subtitle="Hoàn thiện thông tin trong ít phút để bắt đầu tiếp cận những cơ hội tốt hơn."
      switchText="Đã có tài khoản?"
      switchLabel="Đăng nhập"
      switchTo="/login"
      heroImage="/images/auth-growth-hero.svg"
      heroTitle="Tạo hồ sơ chuyên nghiệp, tiếp cận cơ hội tốt hơn."
      heroSubtitle="Nền tảng được thiết kế để bạn nổi bật hơn trong mắt nhà tuyển dụng ngay từ bước đầu tiên."
    >
      <RegisterForm />
    </AuthLayout>
  );
};

export default RegisterPage;
