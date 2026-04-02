import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotification } from '../../components/NotificationProvider';
import './OnlineCvEditor.css';

const SINGLE_TEMPLATE_KEY = 'live-editor';

const TEMPLATE_OPTIONS = [
  { key: SINGLE_TEMPLATE_KEY, label: 'Mẫu CV Live Editor (duy nhất)' },
];

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const escapeHtml = (s = '') => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const injectPreviewEditorScript = (html) => {
  if (!html || typeof html !== 'string') return html;
  if (html.includes('__cv_live_editor_hook__')) return html;

  const script = `
<script id="__cv_live_editor_hook__">
(function () {
  if (window.__cvLiveEditorHooked) return;
  window.__cvLiveEditorHooked = true;

  var style = document.createElement('style');
  style.id = '__cv_live_editor_style__';
  style.textContent =
    '[data-cv-field]{outline:2px dashed transparent;outline-offset:2px;cursor:text;transition:outline .15s ease, background .15s ease;}' +
    '[data-cv-field]:hover{outline-color:#0f766e!important;background:rgba(15,118,110,.08)!important;}' +
    '[data-cv-field].cv-editing{outline-color:#115e59!important;background:rgba(15,118,110,.14)!important;}' +
    '[data-cv-field][data-cv-empty="1"]:not(.cv-editing)::before{content:attr(data-cv-placeholder);color:#94a3b8;font-style:italic;}';
  document.head.appendChild(style);

  var active = null;

  function asElement(target) {
    if (!target) return null;
    if (target.nodeType === 1) return target;
    return target.parentElement || null;
  }

  function getFieldNode(target) {
    var el = asElement(target);
    if (!el || !el.closest) return null;
    return el.closest('[data-cv-field]');
  }

  function normalizeValue(text) {
    return String(text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\r/g, '')
      .replace(/\n{3,}/g, '\n\n');
  }

  function setEmptyState(node) {
    if (!node) return;
    var raw = normalizeValue(node.innerText || '');
    node.setAttribute('data-cv-empty', raw.trim() ? '0' : '1');
  }

  function post(type, payload) {
    window.parent.postMessage(Object.assign({ __cv_editor: true, type: type }, payload || {}), '*');
  }

  function placeCaretAtEnd(node) {
    if (!node) return;
    try {
      var range = document.createRange();
      range.selectNodeContents(node);
      range.collapse(false);
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (_) {}
  }

  function deactivate(node, shouldEmit) {
    if (!node) return;
    node.removeAttribute('contenteditable');
    node.classList.remove('cv-editing');
    setEmptyState(node);

    if (shouldEmit) {
      post('CV_FIELD_UPDATE', {
        field: node.getAttribute('data-cv-field') || '',
        value: normalizeValue(node.innerText || '')
      });
    }
  }

  function activate(node) {
    if (!node) return;
    if (active && active !== node) deactivate(active, true);
    active = node;
    node.setAttribute('contenteditable', 'true');
    node.classList.add('cv-editing');
    node.focus();
    placeCaretAtEnd(node);
  }

  document.querySelectorAll('[data-cv-field]').forEach(function (node) {
    setEmptyState(node);
  });

  document.addEventListener('click', function (event) {
    var node = getFieldNode(event.target);

    if (!node) {
      if (active) {
        deactivate(active, true);
        active = null;
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (active !== node || node.getAttribute('contenteditable') !== 'true') {
      activate(node);
    }

    post('CV_FIELD_FOCUS', { field: node.getAttribute('data-cv-field') || '' });
  }, true);

  document.addEventListener('dblclick', function (event) {
    var node = getFieldNode(event.target);
    if (!node) return;
    event.preventDefault();
    event.stopPropagation();
    activate(node);
  }, true);

  document.addEventListener('focusout', function (event) {
    var node = getFieldNode(event.target);
    if (!node || node !== active) return;

    setTimeout(function () {
      var stillInside = node.contains(document.activeElement);
      if (!stillInside) {
        deactivate(node, true);
        active = null;
      }
    }, 0);
  }, true);

  document.addEventListener('keydown', function (event) {
    if (!active) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      deactivate(active, false);
      active = null;
      return;
    }

    var multiline = active.getAttribute('data-cv-multiline') === '1';
    if (!multiline && event.key === 'Enter') {
      event.preventDefault();
      deactivate(active, true);
      active = null;
    }
  }, true);
})();
</script>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${script}</body>`);
  }
  return `${html}${script}`;
};

const SAMPLE_DATA = {
  title: 'CV Ứng Viên Chuyên Nghiệp',
  summary: 'Tôi là người có tinh thần trách nhiệm, ham học hỏi và chủ động trong công việc. Có khả năng làm việc nhóm tốt, thích nghi nhanh với môi trường mới và luôn sẵn sàng tiếp thu kiến thức để phát triển bản thân.',
  skills: `• Quản lý dự án và làm việc nhóm\n• Giao tiếp và thuyết trình\n• Tin học văn phòng: Word, Excel, PowerPoint\n• Kỹ năng giải quyết vấn đề\n• Tư duy sáng tạo và phân tích`,
  experience: `Nhân viên Marketing - Công ty ABC\n01/2022 - Hiện tại\n• Xây dựng và triển khai chiến dịch marketing trên mạng xã hội\n• Phân tích dữ liệu khách hàng và đề xuất giải pháp tối ưu`,
  education: `Đại học Kinh tế TP.HCM\n09/2018 - 06/2022\nChuyên ngành: Quản trị Marketing`,
  languages: `• Tiếng Việt: Bản ngữ\n• Tiếng Anh: Thành thạo (IELTS 7.0)`,
  projects: `Chiến dịch "Mùa hè sôi động" - Công ty ABC\n• Lên kế hoạch và triển khai chiến dịch marketing tích hợp`,
};

const normalizeTemplateKey = () => SINGLE_TEMPLATE_KEY;

const OnlineCvEditor = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const { notify } = useNotification();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const userId = user?.id || user?.MaNguoiDung || user?.maNguoiDung || user?.userId || user?.userID || null;
  const cvId = query.get('cvId') || query.get('cvid') || query.get('id');
  const isNewCv = !cvId;

  const suppressLoadErrorsUntilRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(isNewCv ? SAMPLE_DATA.title : 'CV Online');
  const [summary, setSummary] = useState(isNewCv ? SAMPLE_DATA.summary : '');
  const [skills, setSkills] = useState(isNewCv ? SAMPLE_DATA.skills : '');
  const [experience, setExperience] = useState(isNewCv ? SAMPLE_DATA.experience : '');
  const [education, setEducation] = useState(isNewCv ? SAMPLE_DATA.education : '');
  const [languages, setLanguages] = useState(isNewCv ? SAMPLE_DATA.languages : '');
  const [projects, setProjects] = useState(isNewCv ? SAMPLE_DATA.projects : '');
  const [templateKey] = useState(SINGLE_TEMPLATE_KEY);

  const [profile, setProfile] = useState(null);
  const [activeField, setActiveField] = useState('');
  const linkedFieldRefs = useRef({});

  const bindLinkedFieldRef = useCallback((fieldKey) => (node) => {
    if (node) {
      linkedFieldRefs.current[fieldKey] = node;
      return;
    }
    delete linkedFieldRefs.current[fieldKey];
  }, []);

  const updateFieldValue = useCallback((field, rawValue) => {
    const value = String(rawValue || '').replace(/\r/g, '');
    switch (field) {
      case 'title': setTitle((prev) => (prev === value ? prev : value)); break;
      case 'summary': setSummary((prev) => (prev === value ? prev : value)); break;
      case 'skills': setSkills((prev) => (prev === value ? prev : value)); break;
      case 'experience': setExperience((prev) => (prev === value ? prev : value)); break;
      case 'education': setEducation((prev) => (prev === value ? prev : value)); break;
      case 'languages': setLanguages((prev) => (prev === value ? prev : value)); break;
      case 'projects': setProjects((prev) => (prev === value ? prev : value)); break;
      default: break;
    }
  }, []);

  useEffect(() => {
    const handlePreviewBridge = (event) => {
      const data = event?.data;
      if (!data || data.__cv_editor !== true) return;

      if (data.type === 'CV_FIELD_FOCUS') {
        const field = String(data.field || '').trim();
        if (!field) return;
        setActiveField(field);
        const input = linkedFieldRefs.current[field];
        if (input) input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      if (data.type === 'CV_FIELD_UPDATE') {
        const field = String(data.field || '').trim();
        if (!field) return;
        updateFieldValue(field, data.value);
      }
    };

    window.addEventListener('message', handlePreviewBridge);
    return () => window.removeEventListener('message', handlePreviewBridge);
  }, [updateFieldValue]);

  const readErrorMessage = async (res, fallback) => {
    try {
      const data = await res.json();
      return data?.error || fallback;
    } catch {
      try {
        const txt = await res.text();
        const snippet = String(txt || '').replace(/\s+/g, ' ').trim().slice(0, 200);
        return snippet ? `${fallback} (HTTP ${res.status}): ${snippet}` : `${fallback} (HTTP ${res.status})`;
      } catch {
        return `${fallback} (HTTP ${res.status})`;
      }
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      const stripHtml = (html = '') => html
        .replace(/<br\s*\/?\s*>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const formatRange = (start, end) => {
        const s = String(start || '').trim();
        const e = String(end || '').trim();
        if (s && e) return `${s} - ${e}`;
        if (s) return s;
        if (e) return e;
        return '';
      };

      const fillFromLists = (p) => {
        if (!experience && Array.isArray(p.workList) && p.workList.length) {
          const lines = p.workList.map((w) => {
            const main = [w.position, w.company].filter(Boolean).join(' - ');
            const time = formatRange(w.start || `${w.startMonth || ''}/${w.startYear || ''}`, w.isCurrentlyWorking ? 'HIỆN TẠI' : (w.end || `${w.endMonth || ''}/${w.endYear || ''}`));
            const desc = stripHtml(w.descriptionHtml || w.description || '');
            return [main, time, desc].filter(Boolean).join(' | ');
          }).filter(Boolean).join('\n');
          if (lines) setExperience(lines);
        }

        if (!education && Array.isArray(p.educationList) && p.educationList.length) {
          const lines = p.educationList.map((ed) => {
            const main = [ed.university, ed.level].filter(Boolean).join(' - ');
            const major = ed.major ? `Ngành: ${ed.major}` : '';
            const time = formatRange(ed.start || `${ed.startMonth || ''}/${ed.startYear || ''}`, ed.isCurrentlyStudying ? 'HIỆN TẠI' : (ed.end || `${ed.endMonth || ''}/${ed.endYear || ''}`));
            const desc = ed.description ? stripHtml(ed.description) : '';
            return [main, major, time, desc].filter(Boolean).join(' | ');
          }).filter(Boolean).join('\n');
          if (lines) setEducation(lines);
        }

        if (!languages && Array.isArray(p.languageList) && p.languageList.length) {
          const lines = p.languageList.map((l) => [l.language, l.level && `(${l.level})`].filter(Boolean).join(' ')).filter(Boolean).join('\n');
          if (lines) setLanguages(lines);
        }
      };

      try {
        const res = await fetch(`/users/profile/${encodeURIComponent(userId)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) return;

        const p = data.profile || {};
        setProfile(p);
        if (!summary && p.introHtml) setSummary(stripHtml(p.introHtml));
        fillFromLists(p);
      } catch {
        setProfile(null);
      }
    };

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const fetchExistingOnlineCv = async () => {
      if (!userId || !cvId) return;
      setLoading(true);

      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const isTransientHttp = (status) => status === 502 || status === 503 || status === 504;

      try {
        const url = `/api/cvs/online/${encodeURIComponent(cvId)}?userId=${encodeURIComponent(userId)}`;
        let lastError = null;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const res = await fetch(url);
            if (!res.ok) {
              const msg = await readErrorMessage(res, 'Không tải được CV online');
              const err = new Error(msg);
              err.__status = res.status;
              throw err;
            }

            const data = await res.json().catch(() => ({}));
            if (!data.success) throw new Error(data.error || 'Không tải được CV online');

            setTitle(data.cv?.title || 'CV Online');
            setSummary(data.cv?.summary || '');
            setSkills(data.cv?.content?.skills || '');
            setExperience(data.cv?.content?.experience || '');
            setEducation(data.cv?.content?.education || '');
            setLanguages(data.cv?.content?.languages || '');
            setProjects(data.cv?.content?.projects || '');
            return;
          } catch (e) {
            lastError = e;
            const status = e?.__status;
            const transient = status ? isTransientHttp(status) : true;
            if (!transient || attempt === 2) break;
            await sleep(500 * (attempt + 1));
          }
        }

        throw lastError || new Error('Không tải được CV online');
      } catch (err) {
        const now = Date.now();
        if (now >= suppressLoadErrorsUntilRef.current) {
          notify({ type: 'error', message: err.message || 'Không tải được CV online' });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchExistingOnlineCv();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvId, userId]);

  const buildHtml = () => {
    const p = profile || {};
    const pick = (...vals) => vals.find((v) => String(v || '').trim()) || '';

    const useSample = isNewCv && !cvId;

    const name = escapeHtml(pick(p.fullName, p.HoTen, p.hoTen, user?.name, user?.HoTen, user?.hoTen, useSample ? 'Nguyễn Văn A' : 'Ứng viên'));
    const position = escapeHtml(pick(p.position, p.viTriMongMuon, p.ViTriMongMuon, useSample ? 'Chuyên viên Marketing' : ''));
    const email = escapeHtml(pick(p.email, p.Email, user?.email, user?.Email, useSample ? 'ungvien@example.com' : ''));
    const phone = escapeHtml(pick(p.phone, p.SoDienThoai, p.soDienThoai, useSample ? '0987654321' : ''));
    const birthday = escapeHtml(pick(p.birthday, p.NgaySinh, p.ngaySinh, useSample ? '15/03/1998' : ''));
    const address = escapeHtml(pick(p.address, p.DiaChi, p.diaChi, useSample ? '123 Đường ABC, Quận 1' : ''));
    const city = escapeHtml(pick(p.city, p.ThanhPho, p.thanhPho, useSample ? 'Hồ Chí Minh' : ''));
    const link = escapeHtml(pick(p.personalLink, p.LinkCaNhan, p.linkCaNhan, useSample ? 'linkedin.com/in/nguyenvana' : ''));
    const avatarUrl = pick(p.avatarUrl, p.AnhDaiDien, p.anhDaiDien, p.avatar, '');

    const editableBlock = (fieldKey, body, placeholder, multiline = true, className = '') => {
      const t = String(body || '').replace(/\r/g, '');
      const safe = escapeHtml(t.trim()).replace(/\n/g, '<br/>');
      const empty = !String(t || '').trim();
      const cls = ['cv-live-editable', className, empty ? 'is-empty' : ''].filter(Boolean).join(' ');
      const safePlaceholder = escapeHtml(String(placeholder || 'Nhập nội dung...'));

      return `<div class="${cls}" data-cv-field="${fieldKey}" data-cv-multiline="${multiline ? '1' : '0'}" data-cv-empty="${empty ? '1' : '0'}" data-cv-placeholder="${safePlaceholder}">${empty ? '' : safe}</div>`;
    };

    const contactRow = (label, value) => {
      const v = String(value || '').trim();
      if (!v) return '';
      return `<div class="live-contact-row"><span class="live-contact-label">${label}</span><span class="live-contact-value">${escapeHtml(v)}</span></div>`;
    };

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title || 'CV Online')}</title>
<style>
  :root{--accent:#0f766e; --sidebar:#134e4a; --bg:#ecfeff;}
  *{box-sizing:border-box;}
  body{margin:0; padding:26px; background:radial-gradient(circle at 20% 20%, #ccfbf1 0, transparent 48%), radial-gradient(circle at 85% 10%, #e0f2fe 0, transparent 45%), var(--bg); font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#0f172a;}
  .live-shell{max-width:1020px; margin:0 auto; display:grid; grid-template-columns:300px 1fr; border-radius:22px; overflow:hidden; border:1px solid rgba(15,23,42,.12); box-shadow:0 28px 70px rgba(15,23,42,.16); background:#fff;}
  .live-rail{background:linear-gradient(170deg, var(--sidebar) 0%, #0f766e 45%, #115e59 100%); color:#f8fafc; padding:28px 22px; position:relative; overflow:hidden;}
  .live-rail::before{content:''; position:absolute; width:220px; height:220px; border-radius:999px; background:rgba(255,255,255,.11); top:-140px; right:-120px;}
  .live-rail::after{content:''; position:absolute; width:170px; height:170px; border-radius:999px; background:rgba(255,255,255,.08); bottom:-90px; left:-100px;}
  .live-photo{width:118px; height:118px; border-radius:18px; overflow:hidden; background:rgba(248,250,252,.25); border:2px solid rgba(248,250,252,.35); display:flex; align-items:center; justify-content:center; margin-bottom:16px; position:relative; z-index:1;}
  .live-photo img{width:100%; height:100%; object-fit:cover; display:block;}
  .live-photo-ph{font-size:12px; opacity:.9;}
  .live-name{font-size:28px; line-height:1.08; font-weight:700; margin:0; letter-spacing:.4px; position:relative; z-index:1;}
  .live-role{margin-top:8px; font-size:13px; letter-spacing:1.3px; text-transform:uppercase; opacity:.92; font-weight:600; position:relative; z-index:1;}
  .live-contact{margin-top:18px; position:relative; z-index:1;}
  .live-contact-row{margin-bottom:9px;}
  .live-contact-label{display:block; font-size:11px; opacity:.78; letter-spacing:.6px; text-transform:uppercase;}
  .live-contact-value{display:block; font-size:13px; line-height:1.5; font-weight:600; margin-top:2px; word-break:break-word;}
  .live-tip{margin-top:16px; padding:10px 12px; border-radius:12px; background:rgba(15,23,42,.22); font-size:11px; line-height:1.55; position:relative; z-index:1;}
  .live-main{padding:28px 30px 32px; background:#fff;}
  .live-top{padding-bottom:16px; border-bottom:1px solid #e2e8f0;}
  .live-kicker{font-size:11px; font-weight:700; letter-spacing:1.3px; text-transform:uppercase; color:#0f766e;}
  .live-top-title{font-size:30px; font-weight:700; color:#0f172a; margin-top:8px; line-height:1.2;}
  .live-grid{display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:18px;}
  .live-card{border:1px solid #dbe2ea; border-radius:14px; padding:14px 14px 12px; background:#f8fafc;}
  .live-card.full{grid-column:1/-1;}
  .live-card h3{margin:0 0 8px; font-size:12px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:#0f766e;}
  .cv-live-editable{min-height:20px; color:#0f172a; font-size:13.5px; line-height:1.6; word-break:break-word; white-space:pre-wrap;}
  .cv-live-editable.live-top-title{font-size:30px; line-height:1.2; font-weight:700;}
  @media (max-width:900px){
    body{padding:14px;}
    .live-shell{grid-template-columns:1fr;}
    .live-main{padding:20px 16px 22px;}
    .live-grid{grid-template-columns:1fr;}
  }
  @media print{
    body{padding:0; background:#fff;}
    .live-shell{border:none; border-radius:0; box-shadow:none;}
  }
</style>
</head>
<body>
  <div class="live-shell">
    <aside class="live-rail">
      <div class="live-photo">
        ${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="avatar" />` : `<div class="live-photo-ph">Ảnh hồ sơ</div>`}
      </div>
      <h1 class="live-name">${name}</h1>
      ${position ? `<div class="live-role">${position}</div>` : ''}

      <div class="live-contact">
        ${contactRow('Điện thoại', phone)}
        ${contactRow('Email', email)}
        ${contactRow('Ngày sinh', birthday)}
        ${contactRow('Địa chỉ', address || city)}
        ${contactRow('Liên kết', link)}
      </div>

      <div class="live-tip">Click trực tiếp vào phần nội dung bên phải để chỉnh sửa tại chỗ. Khi rời ô, nội dung sẽ tự đồng bộ vào form.</div>
    </aside>

    <main class="live-main">
      <div class="live-top">
        <div class="live-kicker">Interactive CV Template</div>
        ${editableBlock('title', title, 'Nhập tiêu đề CV của bạn', false, 'live-top-title')}
      </div>

      <div class="live-grid">
        <section class="live-card full">
          <h3>Mục tiêu nghề nghiệp</h3>
          ${editableBlock('summary', summary, 'Mô tả ngắn mục tiêu nghề nghiệp và định hướng phát triển.')}
        </section>

        <section class="live-card">
          <h3>Kỹ năng</h3>
          ${editableBlock('skills', skills, 'Liệt kê các kỹ năng mạnh nhất của bạn.')}
        </section>

        <section class="live-card">
          <h3>Ngoại ngữ</h3>
          ${editableBlock('languages', languages, 'Ví dụ: Tiếng Anh - IELTS 7.0')}
        </section>

        <section class="live-card full">
          <h3>Kinh nghiệm làm việc</h3>
          ${editableBlock('experience', experience, 'Mô tả vị trí, công ty, thời gian và thành tựu chính.')}
        </section>

        <section class="live-card">
          <h3>Học vấn</h3>
          ${editableBlock('education', education, 'Trường, chuyên ngành, thời gian học.')}
        </section>

        <section class="live-card">
          <h3>Dự án nổi bật</h3>
          ${editableBlock('projects', projects, 'Dự án, vai trò, công nghệ và kết quả nổi bật.')}
        </section>
      </div>
    </main>
  </div>
</body>
</html>`;
  };

  const onSave = async () => {
    if (!userId) {
      notify({ type: 'error', message: 'Bạn cần đăng nhập để tạo CV online.' });
      return;
    }

    const t = String(title || '').trim();
    if (!t) {
      notify({ type: 'error', message: 'Vui lòng nhập tiêu đề CV.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        userId,
        title: t,
        summary: String(summary || ''),
        templateKey: normalizeTemplateKey(templateKey),
        content: {
          skills: String(skills || ''),
          experience: String(experience || ''),
          projects: String(projects || ''),
          education: String(education || ''),
          languages: String(languages || ''),
        },
        html: buildHtml(),
        cvId: cvId || null,
      };

      const res = await fetch('/api/cvs/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await readErrorMessage(res, 'Không thể lưu CV online');
        throw new Error(msg);
      }

      const data = await res.json().catch(() => ({}));
      if (!data.success) throw new Error(data.error || 'Không thể lưu CV online');

      notify({ type: 'success', message: 'Đã lưu CV online.' });
      suppressLoadErrorsUntilRef.current = Date.now() + 8000;

      const newId = data.cv?.id;
      if (newId && !cvId) {
        navigate(`/create-cv/online-editor?cvId=${encodeURIComponent(newId)}&template=${SINGLE_TEMPLATE_KEY}`, { replace: true });
      }
    } catch (err) {
      notify({ type: 'error', message: err.message || 'Không thể lưu CV online' });
    } finally {
      setSaving(false);
    }
  };

  const onPrint = () => {
    const html = buildHtml();
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const previewHtml = injectPreviewEditorScript(buildHtml());

  if (!userId) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning mb-0">Bạn cần đăng nhập để tạo CV online.</div>
      </div>
    );
  }

  return (
    <div className="container py-4 online-cv-editor-page">
      <div className="cv-editor-header">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h3><i className="bi bi-file-earmark-text me-2"></i>CV Online</h3>
            <div className="text-muted">Mẫu CV duy nhất hỗ trợ chỉnh sửa trực tiếp ngay trên bản xem trước.</div>
          </div>
          <div className="cv-editor-actions">
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/create-cv')}>
              <i className="bi bi-arrow-left-circle me-2"></i>Về Tạo CV
            </button>
            <button type="button" className="btn btn-outline-primary" onClick={onPrint}>
              <i className="bi bi-download me-2"></i>Tải PDF (In)
            </button>
            <button type="button" className="btn btn-success" onClick={onSave} disabled={saving || loading}>
              <i className="bi bi-check-circle me-2"></i>{saving ? 'Đang lưu...' : 'Lưu CV Online'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="cv-editor-loading">
          <i className="bi bi-hourglass-split d-block"></i>
          Đang tải CV...
        </div>
      ) : null}

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="cv-editor-form-card">
            <div className="card-body">
              <div className="cv-editor-form-group">
                <label className="cv-editor-label">
                  <i className="bi bi-palette"></i>Mẫu CV
                </label>
                <select className="form-select cv-editor-select cv-editor-template-select" value={templateKey} disabled>
                  {TEMPLATE_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className={`cv-editor-form-group ${activeField === 'title' ? 'is-linked' : ''}`}>
                <label className="cv-editor-label"><i className="bi bi-type"></i>Tiêu đề CV</label>
                <input
                  ref={bindLinkedFieldRef('title')}
                  className="form-control cv-editor-input"
                  value={title}
                  onFocus={() => setActiveField('title')}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Lập trình viên Frontend"
                />
              </div>

              <div className={`cv-editor-form-group ${activeField === 'summary' ? 'is-linked' : ''}`}>
                <label className="cv-editor-label"><i className="bi bi-person-badge"></i>Tóm tắt / Mục tiêu nghề nghiệp</label>
                <textarea
                  ref={bindLinkedFieldRef('summary')}
                  className="form-control cv-editor-textarea"
                  rows={3}
                  value={summary}
                  onFocus={() => setActiveField('summary')}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Giới thiệu ngắn gọn về bản thân và mục tiêu nghề nghiệp..."
                />
              </div>

              <div className={`cv-editor-form-group ${activeField === 'skills' ? 'is-linked' : ''}`}>
                <label className="cv-editor-label"><i className="bi bi-star"></i>Kỹ năng</label>
                <textarea
                  ref={bindLinkedFieldRef('skills')}
                  className="form-control cv-editor-textarea"
                  rows={4}
                  value={skills}
                  onFocus={() => setActiveField('skills')}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="Ví dụ: React, Node.js, SQL..."
                />
              </div>

              <div className={`cv-editor-form-group ${activeField === 'experience' ? 'is-linked' : ''}`}>
                <label className="cv-editor-label"><i className="bi bi-briefcase"></i>Kinh nghiệm làm việc</label>
                <textarea
                  ref={bindLinkedFieldRef('experience')}
                  className="form-control cv-editor-textarea"
                  rows={5}
                  value={experience}
                  onFocus={() => setActiveField('experience')}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="Vị trí | Công ty | Thời gian | Mô tả công việc"
                />
              </div>

              <div className={`cv-editor-form-group ${activeField === 'projects' ? 'is-linked' : ''}`}>
                <label className="cv-editor-label"><i className="bi bi-kanban"></i>Dự án đã làm</label>
                <textarea
                  ref={bindLinkedFieldRef('projects')}
                  className="form-control cv-editor-textarea"
                  rows={5}
                  value={projects}
                  onFocus={() => setActiveField('projects')}
                  onChange={(e) => setProjects(e.target.value)}
                  placeholder="Tên dự án | Vai trò | Công nghệ | Kết quả"
                />
              </div>

              <div className={`cv-editor-form-group ${activeField === 'education' ? 'is-linked' : ''}`}>
                <label className="cv-editor-label"><i className="bi bi-mortarboard"></i>Học vấn</label>
                <textarea
                  ref={bindLinkedFieldRef('education')}
                  className="form-control cv-editor-textarea"
                  rows={4}
                  value={education}
                  onFocus={() => setActiveField('education')}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="Trường | Bằng cấp | Thời gian"
                />
              </div>

              <div className={`cv-editor-form-group ${activeField === 'languages' ? 'is-linked' : ''}`}>
                <label className="cv-editor-label"><i className="bi bi-translate"></i>Ngoại ngữ</label>
                <textarea
                  ref={bindLinkedFieldRef('languages')}
                  className="form-control cv-editor-textarea"
                  rows={3}
                  value={languages}
                  onFocus={() => setActiveField('languages')}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder="Ví dụ: Tiếng Anh (IELTS 7.0)"
                />
              </div>

              <div className="cv-editor-hint">
                <i className="bi bi-info-circle"></i>
                <span>Click trực tiếp vào nội dung trong phần xem trước để sửa tại chỗ, dữ liệu sẽ tự đồng bộ về form.</span>
              </div>
              <div className="cv-editor-hint">
                <i className="bi bi-person-vcard"></i>
                <span>Tên, email, số điện thoại và thành phố lấy từ Hồ sơ cá nhân (trang Profile).</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="cv-editor-preview-card">
            <div className="cv-editor-preview-header">
              <i className="bi bi-eye"></i>
              <div className="fw-semibold">Xem trước CV</div>
            </div>
            <div className="cv-editor-preview-body">
              <iframe
                title="CV Preview"
                className="cv-editor-preview-iframe"
                srcDoc={previewHtml}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineCvEditor;
