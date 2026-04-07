import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="jf-footer mt-auto">
            <div className="container">
                <div className="row g-3 align-items-start jf-footer-grid">
                    <div className="col-12 col-md-3 d-flex flex-column">
                        <div className="fw-semibold jf-footer-title">JobFinder</div>
                        <ul className="list-unstyled mt-2 mb-0">
                            <li><Link to="/">Trang chủ</Link></li>
                            <li><Link to="/career-guide">Cẩm nang nghề nghiệp</Link></li>
                            <li><Link to="/jobs">Tìm việc làm</Link></li>
                            <li><a href="mailto:support@jobfinder.vn">support@jobfinder.vn</a></li>
                        </ul>
                    </div>
                    <div className="col-12 col-md-3 d-flex flex-column">
                        <div className="fw-semibold mb-2 jf-footer-title">Dành cho ứng viên</div>
                        <ul className="list-unstyled mb-0">
                            <li><Link to="/jobs">Khám phá việc làm</Link></li>
                            <li><Link to="/jobs/saved">Việc làm đã lưu</Link></li>
                            <li><Link to="/jobs/applied">Việc làm đã ứng tuyển</Link></li>
                            <li><Link to="/profile">Hoàn thiện hồ sơ</Link></li>
                        </ul>
                    </div>
                    <div className="col-12 col-md-3 d-flex flex-column">
                        <div className="fw-semibold mb-2 jf-footer-title">Dành cho nhà tuyển dụng</div>
                        <ul className="list-unstyled mb-0">
                            <li><Link to="/register">Đăng ký tài khoản</Link></li>
                            <li><Link to="/employer">Quản lý tuyển dụng</Link></li>
                            <li><Link to="/jobs">Xem thị trường việc làm</Link></li>
                        </ul>
                    </div>
                    <div className="col-12 col-md-3 d-flex flex-column">
                        <div className="fw-semibold mb-2 jf-footer-title">Chính sách và hỗ trợ</div>
                        <ul className="list-unstyled mb-0">
                            <li><Link to="/career-guide">Hướng dẫn tìm việc</Link></li>
                            <li><a href="/#">Điều khoản sử dụng</a></li>
                            <li><a href="/#">Chính sách bảo mật</a></li>
                            <li><a href="/#">Liên hệ hỗ trợ</a></li>
                        </ul>
                    </div>
                </div>
                <div className="jf-footer-bottom">
                    © {new Date().getFullYear()} JobFinder. Kết nối ứng viên và nhà tuyển dụng hiệu quả hơn.
                </div>
            </div>
        </footer>
    );
};

export default Footer;