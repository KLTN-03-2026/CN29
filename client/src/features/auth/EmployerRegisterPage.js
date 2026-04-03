import React from 'react';
import AuthLayout from './components/AuthLayout';
import EmployerRegisterForm from './components/EmployerRegisterForm';

const EmployerRegisterPage = () => {
  return (
    <AuthLayout
      mode="employer-register"
      title="Đăng ký nhà tuyển dụng"
      subtitle="Tạo tài khoản doanh nghiệp để đăng tin tuyển dụng, quản lý hồ sơ và kết nối đúng ứng viên."
      switchText="Đã có tài khoản?"
      switchLabel="Đăng nhập"
      switchTo="/login"
      heroImage="/images/auth-growth-hero.svg"
      heroTitle="Xây dựng đội ngũ mạnh hơn từ hôm nay."
      heroSubtitle="JobFinder giúp doanh nghiệp tiếp cận ứng viên phù hợp nhanh hơn với quy trình tuyển dụng tối ưu."
    >
      <EmployerRegisterForm />
    </AuthLayout>
  );
};

export default EmployerRegisterPage;
