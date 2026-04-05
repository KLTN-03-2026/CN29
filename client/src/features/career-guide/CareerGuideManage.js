import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CareerRichTextEditor from './components/CareerRichTextEditor';
import {
  sanitizeCareerHtml,
  extractPlainText,
  buildCareerSlug,
  splitTags
} from './richTextUtils';
import './CareerGuideManage.css';

const CATEGORY_OPTIONS = [
  'CV & Hồ sơ',
  'Phỏng vấn',
  'Lương & đãi ngộ',
  'Định hướng nghề',
  'Kỹ năng làm việc'
];

const STATUS_OPTIONS = [
  { value: 'published', label: 'Công khai ngay' },
  { value: 'draft', label: 'Lưu nháp' }
];

const INITIAL_CONTENT = `
<h2>Mở đầu</h2>
<p>Hãy bắt đầu bài viết bằng một đoạn ngắn nêu vấn đề và bối cảnh thực tế.</p>
<h3>Ý chính 1</h3>
<p>Nội dung nên có ví dụ cụ thể và lời khuyên có thể áp dụng ngay.</p>
`;

function CareerGuideManage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    category: CATEGORY_OPTIONS[0],
    tags: '',
    coverImage: '',
    status: STATUS_OPTIONS[0].value,
    content: INITIAL_CONTENT
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const sanitizedContent = useMemo(
    () => sanitizeCareerHtml(form.content),
    [form.content]
  );

  const plainTextContent = useMemo(
    () => extractPlainText(form.content),
    [form.content]
  );

  const slugPreview = useMemo(
    () => buildCareerSlug(form.title),
    [form.title]
  );

  const tagList = useMemo(
    () => splitTags(form.tags),
    [form.tags]
  );

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || plainTextContent.length < 30) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/career-guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: form.title.trim(),
          content: sanitizedContent,
          excerpt: form.excerpt.trim(),
          category: form.category,
          tags: tagList,
          coverImage: form.coverImage.trim(),
          status: form.status,
          slug: slugPreview
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Đăng bài thành công!' });
        setForm({
          title: '',
          excerpt: '',
          category: CATEGORY_OPTIONS[0],
          tags: '',
          coverImage: '',
          status: STATUS_OPTIONS[0].value,
          content: INITIAL_CONTENT
        });

        setTimeout(() => {
          navigate(`/career-guide/${data.postId}`);
        }, 1200);
      } else {
        setMessage({ type: 'error', text: data.error || 'Không thể đăng bài' });
      }
    } catch (err) {
      console.error('Error creating post:', err);
      setMessage({ type: 'error', text: 'Lỗi khi đăng bài viết' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="career-guide-manage-page">
      <div className="cgm-shell">
        <div className="cgm-header">
          <span className="cgm-header-badge">Career Guide Studio</span>
          <h1>
            <i className="bi bi-pencil-square" aria-hidden="true"></i>
            Tạo bài viết mới
          </h1>
          <p>Soạn bài với trình editor trực quan, thêm metadata rõ ràng và xem trước trước khi đăng.</p>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} cgm-alert`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="cgm-layout">
          <section className="cgm-main-card">
            <div className="cgm-field">
              <label htmlFor="title">Tiêu đề bài viết *</label>
              <input
                id="title"
                type="text"
                className="form-control"
                placeholder="Ví dụ: 5 cách chuẩn bị phỏng vấn cho vị trí Data Analyst"
                value={form.title}
                onChange={(event) => updateForm('title', event.target.value)}
                disabled={submitting}
                maxLength={200}
              />
              <div className="cgm-hint-row">
                <small>{form.title.length}/200 ký tự</small>
                <small>Slug: {slugPreview || '-'}</small>
              </div>
            </div>

            <div className="cgm-field">
              <label htmlFor="excerpt">Mô tả ngắn</label>
              <textarea
                id="excerpt"
                className="form-control cgm-textarea-sm"
                placeholder="Tóm tắt ngắn 1-2 câu để hiển thị ở danh sách bài viết..."
                value={form.excerpt}
                onChange={(event) => updateForm('excerpt', event.target.value)}
                disabled={submitting}
                maxLength={240}
              />
              <small>{form.excerpt.length}/240 ký tự</small>
            </div>

            <div className="cgm-field">
              <label>Nội dung bài viết *</label>
              <CareerRichTextEditor
                value={form.content}
                onChange={(nextValue) => updateForm('content', nextValue)}
                initialValue={INITIAL_CONTENT}
                placeholder="Viết nội dung bài viết theo định dạng trực quan..."
                minHeight={360}
              />
              <small>{plainTextContent.length} ký tự nội dung</small>
            </div>

            {plainTextContent && (
              <div className="cgm-preview-card">
                <h3>
                  <i className="bi bi-eye" aria-hidden="true"></i>
                  Xem trước
                </h3>
                {form.coverImage.trim() && (
                  <img
                    src={form.coverImage.trim()}
                    alt="Ảnh bìa xem trước"
                    className="cgm-preview-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <div className="cgm-preview-meta">
                  <span>{form.category}</span>
                  <span>{new Date().toLocaleDateString('vi-VN')}</span>
                </div>
                <h4>{form.title || 'Tiêu đề bài viết'}</h4>
                {form.excerpt.trim() && <p className="cgm-preview-excerpt">{form.excerpt.trim()}</p>}
                <div
                  className="cgm-preview-content"
                  dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />
              </div>
            )}
          </section>

          <aside className="cgm-side-card">
            <h3>Cấu hình bài viết</h3>

            <div className="cgm-field">
              <label htmlFor="category">Danh mục</label>
              <select
                id="category"
                className="form-select"
                value={form.category}
                onChange={(event) => updateForm('category', event.target.value)}
                disabled={submitting}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="cgm-field">
              <label htmlFor="tags">Tags</label>
              <input
                id="tags"
                type="text"
                className="form-control"
                placeholder="Ví dụ: CV, phỏng vấn, thực tập"
                value={form.tags}
                onChange={(event) => updateForm('tags', event.target.value)}
                disabled={submitting}
              />
              {tagList.length > 0 && (
                <div className="cgm-tag-preview">
                  {tagList.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="cgm-field">
              <label htmlFor="coverImage">Ảnh bìa (URL)</label>
              <input
                id="coverImage"
                type="url"
                className="form-control"
                placeholder="https://..."
                value={form.coverImage}
                onChange={(event) => updateForm('coverImage', event.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="cgm-field">
              <label htmlFor="status">Trạng thái</label>
              <select
                id="status"
                className="form-select"
                value={form.status}
                onChange={(event) => updateForm('status', event.target.value)}
                disabled={submitting}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            <div className="cgm-tips">
              <h4>Mẹo để bài viết chất lượng</h4>
              <ul>
                <li>Mở bài nêu rõ vấn đề và đối tượng độc giả.</li>
                <li>Dùng tiêu đề phụ để người đọc quét nội dung nhanh.</li>
                <li>Ưu tiên ví dụ thực tế, có số liệu hoặc tình huống cụ thể.</li>
                <li>Kết bài nên có checklist hành động ngắn gọn.</li>
              </ul>
            </div>

            <div className="cgm-actions">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => navigate('/career-guide')}
                disabled={submitting}
              >
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-2" aria-hidden="true"></i>
                    Đăng bài viết
                  </>
                )}
              </button>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

export default CareerGuideManage;
