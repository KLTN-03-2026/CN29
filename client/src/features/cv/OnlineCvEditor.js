import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotification } from '../../components/NotificationProvider';
import { API_BASE } from '../../config/apiBase';
import './OnlineCvEditor.css';

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

const stripScriptsFromHtml = (html = '') => String(html).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

const normalizeTemplateDocumentHtml = (html = '') => {
  const raw = String(html || '').trim();
  if (!raw) return '';

  const doctypeIndex = raw.search(/<!doctype\s+html/i);
  const htmlIndex = raw.search(/<html[\s>]/i);
  let startIndex = 0;

  if (doctypeIndex >= 0) startIndex = doctypeIndex;
  else if (htmlIndex >= 0) startIndex = htmlIndex;

  const sliced = raw.slice(startIndex).trimStart();
  const closeMatch = sliced.match(/<\/html\s*>/i);
  if (!closeMatch || typeof closeMatch.index !== 'number') return sliced;

  return sliced.slice(0, closeMatch.index + closeMatch[0].length);
};

const DEFAULT_AVATAR_DATA_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" viewBox="0 0 420 420" fill="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f766e"/><stop offset="100%" stop-color="#38bdf8"/></linearGradient></defs><rect width="420" height="420" rx="48" fill="url(#g)"/><circle cx="210" cy="156" r="72" fill="rgba(255,255,255,0.92)"/><path d="M86 338c24-58 76-86 124-86s100 28 124 86" fill="rgba(255,255,255,0.92)"/></svg>'
)}`;

const AVATAR_NODE_SELECTOR = '#avatarImage,[data-cv-avatar="1"],img[data-image-editable="avatarImage"]';
const AVATAR_TRIGGER_SELECTOR = '#avatarButton,[data-cv-avatar-trigger="1"],.avatar-wrap,.avatarWrap,#avatarImage,[data-cv-avatar="1"],img[data-image-editable="avatarImage"]';

const normalizeAvatarUrl = (value) => String(value || '').trim();

const resolveAvatarFromProfile = (profileData, userData) => {
  const p = profileData || {};
  const u = userData || {};
  const pick = (...vals) => vals.find((v) => String(v || '').trim()) || '';
  return normalizeAvatarUrl(
    pick(
      p.avatarUrl,
      p.AnhDaiDien,
      p.anhDaiDien,
      p.avatar,
      u.avatarUrl,
      u.AnhDaiDien,
      u.anhDaiDien,
      u.avatar,
      u.photoURL,
      u.photoUrl,
    ),
  );
};

const extractAvatarUrlFromHtml = (html) => {
  const markup = String(html || '').trim();
  if (!markup) return '';

  const tags = markup.match(/<img\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const isAvatarTag =
      /\bid\s*=\s*["']avatarImage["']/i.test(tag) ||
      /\bdata-cv-avatar\s*=\s*["']1["']/i.test(tag) ||
      /\bdata-image-editable\s*=\s*["']avatarImage["']/i.test(tag);
    if (!isAvatarTag) continue;

    const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      return normalizeAvatarUrl(srcMatch[1]);
    }
  }

  return '';
};

const applyAvatarUrlToHtml = (html, avatarUrl) => {
  const markup = String(html || '');
  if (!markup.trim()) return markup;

  const safeAvatar = escapeHtml(normalizeAvatarUrl(avatarUrl) || DEFAULT_AVATAR_DATA_URI);
  let touched = false;

  const updated = markup.replace(/<img\b[^>]*>/gi, (tag) => {
    const isAvatarTag =
      /\bid\s*=\s*["']avatarImage["']/i.test(tag) ||
      /\bdata-cv-avatar\s*=\s*["']1["']/i.test(tag) ||
      /\bdata-image-editable\s*=\s*["']avatarImage["']/i.test(tag);
    if (!isAvatarTag) return tag;

    touched = true;
    if (/\bsrc\s*=\s*["'][^"']*["']/i.test(tag)) {
      return tag.replace(/\bsrc\s*=\s*["'][^"']*["']/i, `src="${safeAvatar}"`);
    }
    return tag.replace(/<img/i, `<img src="${safeAvatar}"`);
  });

  return touched ? updated : markup;
};

const injectPreviewEditorScript = (html) => {
  if (!html || typeof html !== 'string') return html;
  const baseHtml = String(html)
    .replace(/<style\b[^>]*id=["']__cv_live_editor_style__["'][\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*id=["']__cv_live_editor_hook__["'][\s\S]*?<\/script>/gi, '');

  const script = `
<script id="__cv_live_editor_hook__">
(function () {
  if (window.__cvLiveEditorHooked) return;
  window.__cvLiveEditorHooked = true;

  function post(type, payload) {
    window.parent.postMessage(Object.assign({ __cv_editor: true, type: type }, payload || {}), '*');
  }

  var style = document.createElement('style');
  style.id = '__cv_live_editor_style__';
  style.textContent =
    'body{padding-left:16px!important;padding-right:16px!important;box-sizing:border-box;}' +
    '@media print{body{padding-left:0!important;padding-right:0!important;}}' +
    '.toolbar,.toolbar.no-print,#resetBtn{display:none!important;}' +
    '.shell{padding-top:0!important;padding-bottom:0!important;}' +
    '.stage{max-width:none!important;display:flex!important;justify-content:center!important;overflow:auto!important;padding:0!important;}' +
    '.cv-page{margin-left:auto!important;margin-right:auto!important;}' +
    '.note,.note-badge{display:none!important;}' +
    '.contact-strip{grid-template-columns:repeat(2,minmax(0,1fr))!important;}' +
    '.contact-chip{min-width:0!important;}' +
    '.contact-value{overflow-wrap:anywhere;word-break:break-word;}' +
    '[data-cv-field],[data-editable="true"]{outline:2px dashed transparent;outline-offset:2px;cursor:text;transition:outline .15s ease, background .15s ease;}' +
    '[data-cv-field]:hover,[data-editable="true"]:hover{outline-color:#0f766e!important;background:rgba(15,118,110,.08)!important;}' +
    '[data-cv-field].cv-editing,[data-editable="true"].cv-editing{outline-color:#115e59!important;background:rgba(15,118,110,.14)!important;}' +
    '[data-cv-field][data-cv-empty="1"]:not(.cv-editing)::before,[data-editable="true"][data-cv-empty="1"]:not(.cv-editing)::before{content:attr(data-cv-placeholder);color:#94a3b8;font-style:italic;}' +
    '.cv-live-add-slot{display:flex;justify-content:center;align-items:center;margin:10px 0 16px;}' +
    '.cv-live-add-section-btn{width:34px;height:34px;border:2px solid #fdba74;border-radius:999px;background:#fff7ed;color:#f97316;font-size:28px;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;}' +
    '.cv-live-add-section-btn:hover{background:#fff1e5;transform:translateY(-1px);}' +
    '.cv-live-custom-section{position:relative;}' +
    '.cv-live-remove-section-btn{margin-top:10px;border:1px solid #f2c2cc;background:#fff3f6;color:#9f1d35;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;}';
  document.head.appendChild(style);

  var active = null;
  var customSectionCount = 0;
  var avatarInputEl = null;
  var DEFAULT_AVATAR = '${DEFAULT_AVATAR_DATA_URI}';

  function asElement(target) {
    if (!target) return null;
    if (target.nodeType === 1) return target;
    return target.parentElement || null;
  }

  function getFieldKey(node) {
    if (!node) return '';
    return node.getAttribute('data-cv-field') || node.getAttribute('data-field') || '';
  }

  function isSingleLine(node) {
    if (!node) return false;
    if (node.getAttribute('data-single-line') === 'true') return true;
    if (node.getAttribute('data-cv-single-line') === '1') return true;
    return node.getAttribute('data-cv-multiline') !== '1';
  }

  function getFieldNode(target) {
    var el = asElement(target);
    if (!el || !el.closest) return null;
    return el.closest('[data-cv-field], [data-editable="true"]');
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
    if (!node.getAttribute('data-cv-placeholder')) {
      var fallbackPlaceholder = node.getAttribute('data-placeholder') || 'Nhập nội dung';
      node.setAttribute('data-cv-placeholder', fallbackPlaceholder);
    }
  }

  function markEditable(node, field, placeholder, singleLine) {
    if (!node) return;
    node.setAttribute('contenteditable', 'true');
    node.setAttribute('data-editable', 'true');
    node.setAttribute('spellcheck', 'false');
    node.style.pointerEvents = 'auto';
    node.style.cursor = 'text';

    if (field && !node.getAttribute('data-field') && !node.getAttribute('data-cv-field')) {
      node.setAttribute('data-field', field);
    }

    if (placeholder && !node.getAttribute('data-placeholder')) {
      node.setAttribute('data-placeholder', placeholder);
    }

    if (singleLine && !node.getAttribute('data-single-line')) {
      node.setAttribute('data-single-line', 'true');
    }

    setEmptyState(node);
  }

  function normalizeForMatch(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\\s+/g, ' ')
      .trim();
  }

  function findContactValueByLabel(tokens) {
    var chips = Array.prototype.slice.call(document.querySelectorAll('.contact-chip,.contact-item,.contact-card,.contact-row'));

    for (var i = 0; i < chips.length; i += 1) {
      var chip = chips[i];
      var labelNode = chip.querySelector('.contact-label,[data-contact-label],label,strong,.label') || chip.firstElementChild;
      var labelText = normalizeForMatch(labelNode ? labelNode.textContent : chip.textContent);

      var matched = tokens.some(function (token) {
        return labelText.indexOf(token) >= 0;
      });

      if (!matched) continue;

      var valueNode = chip.querySelector('.contact-value,[data-field],[data-cv-field],a,span,p,div:last-child');
      if (valueNode && valueNode !== labelNode) return valueNode;
    }

    return null;
  }

  function ensureContactEditable() {
    try {
      var defs = [
        {
          selector: '.contact-value,[data-field="phone"],[data-cv-field="phone"],[data-contact="phone"],[data-key="phone"],a[href^="tel:"]',
          field: 'phone',
          placeholder: 'Nhập số điện thoại',
          labelTokens: ['so dien thoai', 'dien thoai', 'phone']
        },
        {
          selector: '[data-field="email"],[data-cv-field="email"],[data-contact="email"],[data-key="email"],a[href^="mailto:"]',
          field: 'email',
          placeholder: 'Nhập email',
          labelTokens: ['email', 'e-mail', 'mail']
        },
        {
          selector: '[data-field="address"],[data-cv-field="address"],[data-contact="address"],[data-key="address"],[data-contact="diachi"]',
          field: 'address',
          placeholder: 'Nhập địa chỉ',
          labelTokens: ['dia chi', 'address', 'noi o']
        },
        {
          selector: '[data-field="linkedin"],[data-cv-field="linkedin"],[data-contact="linkedin"],[data-key="linkedin"],a[href*="linkedin.com" i],a[href*="linked.in" i]',
          field: 'linkedin',
          placeholder: 'LinkedIn (nếu có)',
          labelTokens: ['linkedin', 'linked in']
        }
      ];

      defs.forEach(function (def) {
        try {
          document.querySelectorAll(def.selector).forEach(function (node) {
            markEditable(node, def.field, def.placeholder, true);
          });

          var fallbackNode = findContactValueByLabel(def.labelTokens || []);
          if (fallbackNode) {
            markEditable(fallbackNode, def.field, def.placeholder, true);
          }
        } catch (e) {}
      });

      document.querySelectorAll('a[data-field],a[data-cv-field],.contact-chip a').forEach(function (anchor) {
        anchor.addEventListener('click', function (event) {
          event.preventDefault();
        });
      });

      document.querySelectorAll('[data-field="phone"],[data-cv-field="phone"],[data-field="email"],[data-cv-field="email"],[data-field="address"],[data-cv-field="address"],[data-field="linkedin"],[data-cv-field="linkedin"],a[href^="tel:"],a[href^="mailto:"],a[href*="linkedin.com" i],a[href*="linked.in" i]').forEach(function (node) {
        var field = node.getAttribute('data-field') || node.getAttribute('data-cv-field') || '';
        if (!field) {
          var href = String(node.getAttribute('href') || '').toLowerCase();
          if (href.indexOf('tel:') === 0) field = 'phone';
          else if (href.indexOf('mailto:') === 0) field = 'email';
          else if (href.indexOf('linkedin') >= 0 || href.indexOf('linked.in') >= 0) field = 'linkedin';
          else field = 'address';
        }

        var placeholderMap = {
          phone: 'Nhập số điện thoại',
          email: 'Nhập email',
          address: 'Nhập địa chỉ',
          linkedin: 'LinkedIn (nếu có)'
        };

        markEditable(node, field, placeholderMap[field] || 'Nhập thông tin liên hệ', true);
        node.addEventListener('click', function (event) {
          var tag = String(node.tagName || '').toLowerCase();
          if (tag === 'a') {
            event.preventDefault();
          }
        });
      });
    } catch (e) {}
  }

  function getAvatarImageNode() {
    var node = document.querySelector('${AVATAR_NODE_SELECTOR}');
    if (node) return node;

    var candidates = Array.prototype.slice.call(document.querySelectorAll('img'));
    for (var i = 0; i < candidates.length; i += 1) {
      var img = candidates[i];
      var cls = String(img.className || '').toLowerCase();
      var id = String(img.id || '').toLowerCase();
      var alt = String(img.getAttribute('alt') || '').toLowerCase();
      if (cls.indexOf('avatar') >= 0 || id.indexOf('avatar') >= 0 || alt.indexOf('avatar') >= 0) {
        return img;
      }
    }

    return null;
  }

  function ensureAvatarFallback(img) {
    if (!img) return;

    var src = String(img.getAttribute('src') || '').trim();
    if (!src || src === 'about:blank') {
      img.setAttribute('src', DEFAULT_AVATAR);
    }

    img.addEventListener('error', function () {
      img.setAttribute('src', DEFAULT_AVATAR);
    });
  }

  function ensureAvatarPicker() {
    if (!avatarInputEl || !document.body.contains(avatarInputEl)) {
      avatarInputEl = document.getElementById('__cv_live_avatar_picker__');
    }

    if (!avatarInputEl) {
      avatarInputEl = document.createElement('input');
      avatarInputEl.id = '__cv_live_avatar_picker__';
      avatarInputEl.type = 'file';
      avatarInputEl.accept = 'image/*';
      avatarInputEl.style.display = 'none';
      avatarInputEl.setAttribute('data-cv-runtime', '1');
      document.body.appendChild(avatarInputEl);
    }

    if (!avatarInputEl.getAttribute('data-cv-bound')) {
      avatarInputEl.setAttribute('data-cv-bound', '1');
      avatarInputEl.addEventListener('change', function () {
        var file = avatarInputEl.files && avatarInputEl.files[0];
        if (!file) return;
        if (!String(file.type || '').toLowerCase().startsWith('image/')) return;
        if (file.size > 4 * 1024 * 1024) return;

        var reader = new FileReader();
        reader.onload = function (ev) {
          var img = getAvatarImageNode();
          if (!img) return;
          var src = ev && ev.target && typeof ev.target.result === 'string' ? ev.target.result : '';
          if (!src) return;
          img.setAttribute('src', src);
        };
        reader.readAsDataURL(file);
      });
    }

    return avatarInputEl;
  }

  function ensureAvatarEditable() {
    try {
      var imgNodes = document.querySelectorAll('${AVATAR_NODE_SELECTOR}');
      imgNodes.forEach(function (img) {
        img.setAttribute('data-cv-avatar', '1');
        img.setAttribute('data-image-editable', 'avatarImage');
        ensureAvatarFallback(img);
      });

      var triggers = document.querySelectorAll('${AVATAR_TRIGGER_SELECTOR}');
      if (!triggers || triggers.length === 0) {
        var defaultImg = getAvatarImageNode();
        if (defaultImg) {
          var defaultTrigger = defaultImg.closest('${AVATAR_TRIGGER_SELECTOR},button,label,div') || defaultImg;
          triggers = [defaultTrigger];
        }
      }

      triggers.forEach(function (trigger) {
        if (!trigger) return;

        trigger.setAttribute('data-cv-avatar-trigger', '1');
        trigger.style.cursor = 'pointer';
        
        trigger.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          
          var relatedImg = trigger.tagName.toLowerCase() === 'img' ? trigger : trigger.querySelector('img');
          relatedImg = relatedImg || getAvatarImageNode() || trigger;
          var currentAvatar = String((relatedImg.getAttribute('src') || '')).trim();
          
          if (window.parent && window.parent !== window) {
            post('CV_AVATAR_PICK_REQUEST', { currentAvatar: currentAvatar });
            return;
          }

          var picker = ensureAvatarPicker();
          if (!picker) return;
          picker.value = '';
          picker.click();
        }, true);
      });
    } catch (e) {}
  }

  window.addEventListener('message', function (event) {
    var data = event && event.data;
    if (!data || data.__cv_editor_parent !== true) return;
    if (data.type !== 'CV_AVATAR_SET') return;

    var img = getAvatarImageNode();
    if (!img) return;

    var nextUrl = String(data.url || '').trim();
    img.setAttribute('src', nextUrl || DEFAULT_AVATAR);
    ensureAvatarFallback(img);
  });

  function stripTemplateToolbar() {
    try {
      document.querySelectorAll('#resetBtn').forEach(function (node) {
        node.remove();
      });
      document.querySelectorAll('.toolbar, .toolbar.no-print').forEach(function (node) {
        node.remove();
      });
    } catch (e) {}
  }

  function centerCvLayout() {
    try {
      var root = document.querySelector('#cvPage')
        || document.querySelector('.cv-page')
        || document.querySelector('.resume-page')
        || document.querySelector('.shell')
        || document.querySelector('.stage');

      if (!root) {
        var candidates = Array.prototype.slice.call(document.body.children || []);
        root = candidates.find(function (node) {
          var tag = String(node.tagName || '').toLowerCase();
          return tag && tag !== 'script' && tag !== 'style' && !node.classList.contains('cv-live-add-section-btn') && !node.classList.contains('cv-live-add-slot');
        }) || null;
      }

      if (!root) return;
      root.style.marginLeft = 'auto';
      root.style.marginRight = 'auto';
    } catch (e) {}
  }

  function emitFieldUpdate(node) {
    try {
      var field = getFieldKey(node);
      if (!field) return;
      post('CV_FIELD_UPDATE', {
        field: field,
        value: normalizeValue(node.innerText || '')
      });
    } catch (e) {}
  }

  function findInsertContainer() {
    return document.querySelector('.main-column')
      || document.querySelector('.cv-body main')
      || document.querySelector('main')
      || document.querySelector('.cv-body')
      || document.querySelector('.cv-content')
      || document.body;
  }

  function createCustomSection() {
    var container = findInsertContainer();
    if (!container) return;

    customSectionCount += 1;

    var section = document.createElement('section');
    section.className = 'section-card cv-live-custom-section';
    section.setAttribute('data-cv-custom', '1');

    var head = document.createElement('div');
    head.className = 'section-head';

    var title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = 'Thông tin bổ sung';
    markEditable(title, 'custom_title_' + customSectionCount, 'Tiêu đề nội dung', true);
    head.appendChild(title);

    var content = document.createElement('div');
    content.className = 'job-desc';
    content.textContent = 'Nhập nội dung bạn muốn thêm tại đây...';
    markEditable(content, 'custom_content_' + customSectionCount, 'Nhập nội dung thêm', false);

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'cv-live-remove-section-btn no-print';
    removeBtn.textContent = 'Xóa mục này';
    removeBtn.addEventListener('click', function (event) {
      event.preventDefault();
      section.remove();
    });

    section.appendChild(head);
    section.appendChild(content);
    section.appendChild(removeBtn);

    if (container.firstElementChild) {
      container.insertBefore(section, container.firstElementChild);
    } else {
      container.appendChild(section);
    }

    emitFieldUpdate(title);
    emitFieldUpdate(content);
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(function () {
      title.focus();
    }, 0);
  }

  function ensureAddButton() {
    if (document.querySelector('.cv-live-add-section-btn')) return;

    var slot = document.querySelector('.cv-live-add-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'cv-live-add-slot no-print';
      slot.setAttribute('data-cv-runtime', '1');

      var anchor = document.querySelector('.cv-body');
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(slot, anchor);
      } else {
        document.body.appendChild(slot);
      }
    }

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cv-live-add-section-btn no-print';
    btn.setAttribute('aria-label', 'Thêm nội dung mới');
    btn.setAttribute('data-cv-runtime', '1');
    btn.textContent = '+';
    btn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      createCustomSection();
    });
    slot.appendChild(btn);
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
    node.classList.remove('cv-editing');
    setEmptyState(node);

    if (shouldEmit) {
      emitFieldUpdate(node);
    }
  }

  function activate(node) {
    if (!node) return;
    if (active && active !== node) deactivate(active, true);
    active = node;
    node.setAttribute('contenteditable', 'true');
    if (!node.getAttribute('data-editable')) {
      node.setAttribute('data-editable', 'true');
    }
    node.classList.add('cv-editing');
    node.focus();
    placeCaretAtEnd(node);
  }

  try {
    ensureContactEditable();
    ensureAvatarEditable();
    stripTemplateToolbar();
    centerCvLayout();
    ensureAddButton();

    document.querySelectorAll('.note, .note-badge').forEach(function (node) {
      node.remove();
    });

    document.querySelectorAll('[data-cv-field], [data-editable="true"]').forEach(function (node) {
      setEmptyState(node);
      if (!node.getAttribute('contenteditable')) {
        node.setAttribute('contenteditable', 'true');
      }
    });

    document.addEventListener('click', function (event) {
      try {
        var node = getFieldNode(event.target);

        if (!node) {
          if (active) {
            deactivate(active, true);
            active = null;
          }
          return;
        }

        if (active !== node) {
          activate(node);
        }

        post('CV_FIELD_FOCUS', { field: getFieldKey(node) });
      } catch(e) {}
    }, true);

    document.addEventListener('dblclick', function (event) {
      try {
        var node = getFieldNode(event.target);
        if (!node) return;
        activate(node);
      } catch(e) {}
    }, true);

    document.addEventListener('focusout', function (event) {
      try {
        var node = getFieldNode(event.target);
        if (!node || node !== active) return;

        setTimeout(function () {
          var stillInside = node.contains(document.activeElement);
          if (!stillInside) {
            deactivate(node, true);
            active = null;
          }
        }, 0);
      } catch(e) {}
    }, true);

    document.addEventListener('keydown', function (event) {
      try {
        if (!active) return;

        if (event.key === 'Escape') {
          event.preventDefault();
          deactivate(active, false);
          active = null;
          return;
        }

        if (isSingleLine(active) && event.key === 'Enter') {
          event.preventDefault();
          deactivate(active, true);
          active = null;
        }
      } catch(e) {}
    }, true);

    document.addEventListener('input', function (event) {
      try {
        var node = getFieldNode(event.target);
        if (!node) return;
        setEmptyState(node);
      } catch(e) {}
    }, true);
  } catch (err) {
    console.error('CV hook error:', err);
  }
})();
</script>`;

  if (baseHtml.includes('</body>')) {
    return baseHtml.replace('</body>', `${script}</body>`);
  }
  return `${baseHtml}${script}`;
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

const normalizeTemplateKey = (value, fallback = '') => {
  const v = String(value || '').trim();
  if (!v) return fallback;
  return /^[a-z0-9-]{1,120}$/i.test(v) ? v : fallback;
};

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
  const requestedTemplateKey = normalizeTemplateKey(query.get('template') || '', '');
  const isNewCv = !cvId;

  const suppressLoadErrorsUntilRef = useRef(0);
  const previewFrameRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(true);

  const [title, setTitle] = useState(isNewCv ? SAMPLE_DATA.title : 'CV Online');
  const [summary, setSummary] = useState(isNewCv ? SAMPLE_DATA.summary : '');
  const [skills, setSkills] = useState(isNewCv ? SAMPLE_DATA.skills : '');
  const [experience, setExperience] = useState(isNewCv ? SAMPLE_DATA.experience : '');
  const [education, setEducation] = useState(isNewCv ? SAMPLE_DATA.education : '');
  const [languages, setLanguages] = useState(isNewCv ? SAMPLE_DATA.languages : '');
  const [projects, setProjects] = useState(isNewCv ? SAMPLE_DATA.projects : '');
  const [templateKey, setTemplateKey] = useState(requestedTemplateKey || '');
  const [templateOptions, setTemplateOptions] = useState([]);
  const [selectedTemplateHtml, setSelectedTemplateHtml] = useState('');
  const [persistedEditedHtml, setPersistedEditedHtml] = useState('');
  const [avatarImageUrl, setAvatarImageUrl] = useState(DEFAULT_AVATAR_DATA_URI);

  const [profile, setProfile] = useState(null);
  const authToken = useMemo(() => String(localStorage.getItem('token') || '').trim(), []);
  const avatarModalFileInputRef = useRef(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarModalUrl, setAvatarModalUrl] = useState('');
  const [avatarModalPreview, setAvatarModalPreview] = useState(DEFAULT_AVATAR_DATA_URI);
  const [uploadingAvatarToCloudinary, setUploadingAvatarToCloudinary] = useState(false);
  const [avatarModalInputKey, setAvatarModalInputKey] = useState(0);

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

  const applyAvatarUrlToPreview = useCallback((url) => {
    const nextUrl = normalizeAvatarUrl(url) || DEFAULT_AVATAR_DATA_URI;
    setAvatarImageUrl(nextUrl);
    setAvatarModalPreview(nextUrl);

    const iframeWin = previewFrameRef.current?.contentWindow;
    if (iframeWin) {
      iframeWin.postMessage({
        __cv_editor_parent: true,
        type: 'CV_AVATAR_SET',
        url: nextUrl
      }, '*');
    }

    const iframeDoc = previewFrameRef.current?.contentDocument;
    const avatarNode = iframeDoc?.querySelector(AVATAR_NODE_SELECTOR);
    if (avatarNode) {
      avatarNode.setAttribute('src', nextUrl);
    }
  }, []);

  const openAvatarCloudinaryModal = useCallback((currentAvatar) => {
    const incoming = normalizeAvatarUrl(currentAvatar) || normalizeAvatarUrl(avatarImageUrl);
    const preview = incoming || DEFAULT_AVATAR_DATA_URI;

    setAvatarModalUrl(incoming.startsWith('data:image') ? '' : incoming);
    setAvatarModalPreview(preview);
    setAvatarModalOpen(true);
  }, [avatarImageUrl]);

  const bindAvatarTriggerBridge = useCallback(() => {
    const iframe = previewFrameRef.current;
    const iframeDoc = iframe?.contentDocument;
    if (!iframeDoc) return;

    const imgNode = iframeDoc.querySelector(AVATAR_NODE_SELECTOR);
    const triggerNodes = Array.from(iframeDoc.querySelectorAll(AVATAR_TRIGGER_SELECTOR));

    if (imgNode && !triggerNodes.includes(imgNode)) {
      triggerNodes.push(imgNode);
    }

    triggerNodes.forEach((node) => {
      if (!node || node.getAttribute('data-cv-parent-avatar-bound') === '1') return;

      node.setAttribute('data-cv-parent-avatar-bound', '1');
      node.style.cursor = 'pointer';

      node.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const relatedImg = node.tagName?.toLowerCase() === 'img'
          ? node
          : node.querySelector('img') || iframeDoc.querySelector(AVATAR_NODE_SELECTOR);
        const currentAvatar = normalizeAvatarUrl(relatedImg?.getAttribute('src') || avatarImageUrl);
        openAvatarCloudinaryModal(currentAvatar);
      }, true);
    });
  }, [avatarImageUrl, openAvatarCloudinaryModal]);

  const handlePreviewFrameLoad = useCallback(() => {
    window.requestAnimationFrame(() => {
      bindAvatarTriggerBridge();
    });
  }, [bindAvatarTriggerBridge]);

  const closeAvatarCloudinaryModal = useCallback(() => {
    if (uploadingAvatarToCloudinary) return;
    setAvatarModalOpen(false);
  }, [uploadingAvatarToCloudinary]);

  const pickAvatarFileForCloudinary = useCallback(() => {
    if (uploadingAvatarToCloudinary) return;
    avatarModalFileInputRef.current?.click();
  }, [uploadingAvatarToCloudinary]);

  const handleAvatarFileSelected = useCallback(async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!String(file.type || '').startsWith('image/')) {
      notify({ type: 'error', message: 'Chỉ chấp nhận file ảnh để tải lên hệ thống.' });
      setAvatarModalInputKey((prev) => prev + 1);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      notify({ type: 'error', message: 'Ảnh đại diện không được vượt quá 2MB.' });
      setAvatarModalInputKey((prev) => prev + 1);
      return;
    }

    if (!authToken) {
      notify({ type: 'error', message: 'Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.' });
      setAvatarModalInputKey((prev) => prev + 1);
      return;
    }

    setUploadingAvatarToCloudinary(true);

    try {
      const body = new FormData();
      body.append('thumbnail', file);

      const authHeader = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      const res = await fetch(`${API_BASE}/api/admin/templates/upload-thumbnail`, {
        method: 'POST',
        headers: {
          Authorization: authHeader
        },
        body
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Không thể tải ảnh lên hệ thống.');
      }

      const nextUrl = String(data?.thumbnailUrl || data?.thumbnailAbsoluteUrl || '').trim();
      if (!nextUrl) {
        throw new Error(' hệ thống không trả về URL ảnh hợp lệ.');
      }

      setAvatarModalUrl(nextUrl);
      setAvatarModalPreview(nextUrl);
      applyAvatarUrlToPreview(nextUrl);
      notify({ type: 'success', mode: 'toast', message: 'Đã tải ảnh lên.' });
    } catch (err) {
      notify({ type: 'error', message: err?.message || 'Không thể tải ảnh lên hệ thống.' });
    } finally {
      setUploadingAvatarToCloudinary(false);
      setAvatarModalInputKey((prev) => prev + 1);
    }
  }, [applyAvatarUrlToPreview, authToken, notify]);

  const applyAvatarFromModalUrl = useCallback(() => {
    const nextUrl = String(avatarModalUrl || '').trim();
    if (!nextUrl) {
      notify({ type: 'warning', message: 'Vui lòng nhập URL ảnh hoặc tải ảnh lên hệ thống.' });
      return;
    }

    setAvatarModalPreview(nextUrl);
    applyAvatarUrlToPreview(nextUrl);
    setAvatarModalOpen(false);
    notify({ type: 'success', mode: 'toast', message: 'Đã cập nhật ảnh đại diện cho CV.' });
  }, [applyAvatarUrlToPreview, avatarModalUrl, notify]);

  const useDefaultAvatarFromModal = useCallback(() => {
    setAvatarModalUrl('');
    setAvatarModalPreview(DEFAULT_AVATAR_DATA_URI);
    applyAvatarUrlToPreview(DEFAULT_AVATAR_DATA_URI);
    setAvatarModalOpen(false);
    notify({ type: 'info', mode: 'toast', message: 'Đã dùng ảnh đại diện mặc định.' });
  }, [applyAvatarUrlToPreview, notify]);

  useEffect(() => {
    const handlePreviewBridge = (event) => {
      const data = event?.data;
      if (!data || data.__cv_editor !== true) return;

      if (data.type === 'CV_AVATAR_PICK_REQUEST') {
        openAvatarCloudinaryModal(data.currentAvatar);
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
  }, [openAvatarCloudinaryModal, updateFieldValue]);

  useEffect(() => {
    const iframe = previewFrameRef.current;
    if (!iframe) return undefined;

    const bindOnLoad = () => {
      window.requestAnimationFrame(() => {
        bindAvatarTriggerBridge();
      });
    };

    iframe.addEventListener('load', bindOnLoad);
    bindOnLoad();

    return () => {
      iframe.removeEventListener('load', bindOnLoad);
    };
  }, [bindAvatarTriggerBridge]);

  useEffect(() => {
    let active = true;

    const loadTemplateOptions = async () => {
      setTemplateLoading(true);

      try {
        const res = await fetch(`${API_BASE}/api/cvs/templates?limit=120&offset=0`);
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Không tải được danh sách template');
        }

        if (!active) return;

        const rows = Array.isArray(data?.templates) ? data.templates : [];
        const mapped = rows
          .map((row) => ({
            key: normalizeTemplateKey(row?.Slug || row?.MaTemplateCV, ''),
            label: String(row?.TenTemplate || `Template #${row?.MaTemplateCV || ''}`).trim(),
            htmlContent: normalizeTemplateDocumentHtml(String(row?.HtmlContent || ''))
          }))
          .filter((item) => item.key);

        const options = mapped;

        const requested = requestedTemplateKey && options.some((item) => item.key === requestedTemplateKey)
          ? requestedTemplateKey
          : null;

        const fallbackKey = options[0]?.key || '';
        const resolvedKey = requested || fallbackKey;
        const selected = options.find((item) => item.key === resolvedKey) || null;

        setTemplateOptions(options);
        setTemplateKey(resolvedKey);
        setSelectedTemplateHtml(selected?.htmlContent || '');
      } catch (err) {
        if (!active) return;
        setTemplateOptions([]);
        setTemplateKey('');
        setSelectedTemplateHtml('');
      } finally {
        if (active) setTemplateLoading(false);
      }
    };

    loadTemplateOptions();
    return () => {
      active = false;
    };
  }, [requestedTemplateKey]);

  useEffect(() => {
    if (!templateOptions.length) return;
    const selected = templateOptions.find((item) => item.key === templateKey) || templateOptions[0];
    setSelectedTemplateHtml(selected?.htmlContent || '');
  }, [templateOptions, templateKey]);

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
        const profileAvatar = resolveAvatarFromProfile(p, user);
        if (profileAvatar) {
          setAvatarImageUrl((prev) => {
            const current = normalizeAvatarUrl(prev);
            if (current && current !== DEFAULT_AVATAR_DATA_URI) return prev;
            return profileAvatar;
          });
        }
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
    const profileAvatar = resolveAvatarFromProfile(profile, user);
    if (!profileAvatar) return;

    setAvatarImageUrl((prev) => {
      const current = normalizeAvatarUrl(prev);
      if (current && current !== DEFAULT_AVATAR_DATA_URI) return prev;
      return profileAvatar;
    });
  }, [profile, user]);

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

            const savedHtml = String(data.cv?.html || '').trim();
            const normalizedSavedHtml = normalizeTemplateDocumentHtml(savedHtml);
            if (normalizedSavedHtml) {
              setPersistedEditedHtml(normalizedSavedHtml);
            } else {
              setPersistedEditedHtml('');
            }

            const avatarFromMeta = normalizeAvatarUrl(data.cv?.avatarUrl);
            const avatarFromHtml = extractAvatarUrlFromHtml(normalizedSavedHtml);
            const avatarFromProfile = resolveAvatarFromProfile(profile, user);
            const resolvedAvatar = avatarFromMeta || avatarFromHtml || avatarFromProfile || DEFAULT_AVATAR_DATA_URI;
            setAvatarImageUrl(resolvedAvatar);
            setAvatarModalPreview(resolvedAvatar);
            setAvatarModalUrl(resolvedAvatar.startsWith('data:image') ? '' : resolvedAvatar);

            const savedTemplateKey = normalizeTemplateKey(data.cv?.templateKey || '', '');
            if (savedTemplateKey) {
              setTemplateKey(savedTemplateKey);
            }
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
    const avatarUrl = normalizeAvatarUrl(avatarImageUrl) || DEFAULT_AVATAR_DATA_URI;

    const managedTemplateHtml = normalizeTemplateDocumentHtml(
      stripScriptsFromHtml(String(persistedEditedHtml || selectedTemplateHtml || '').trim())
    );
    if (managedTemplateHtml) {
      const tokenMap = {
        title,
        summary,
        skills,
        experience,
        education,
        languages,
        projects,
        name,
        position,
        email,
        phone,
        birthday,
        address,
        city,
        link,
        avatarUrl
      };

      let rendered = managedTemplateHtml;
      Object.entries(tokenMap).forEach(([key, rawValue]) => {
        const safe = escapeHtml(String(rawValue || '')).replace(/\n/g, '<br/>');
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
        rendered = rendered.replace(regex, safe);
      });

      return applyAvatarUrlToHtml(rendered, avatarUrl);
    }

    if (templateLoading) {
      return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;font-family:Segoe UI,Tahoma,sans-serif;color:#334155}
    .loading{padding:24px 30px;border:1px solid #dbeafe;border-radius:16px;background:#ffffff;box-shadow:0 16px 35px rgba(15,23,42,.08);font-weight:600}
  </style>
</head>
<body>
  <div class="loading">Đang tải mẫu CV...</div>
</body>
</html>`;
    }

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;font-family:Segoe UI,Tahoma,sans-serif;color:#334155;padding:24px}
    .empty{max-width:560px;padding:24px;border:1px dashed #cbd5e1;border-radius:16px;background:#ffffff;text-align:center;box-shadow:0 12px 30px rgba(15,23,42,.06)}
    h2{margin:0 0 8px;font-size:20px;color:#0f172a}
    p{margin:0;font-size:14px;line-height:1.6}
  </style>
</head>
<body>
  <div class="empty">
    <h2>Chưa có nội dung mẫu CV</h2>
    <p>Template được chọn chưa có HTML hoặc đã bị xóa. Vui lòng quay lại trang mẫu CV để chọn mẫu khác.</p>
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

    if (!String(persistedEditedHtml || selectedTemplateHtml || '').trim()) {
      notify({ type: 'error', message: 'Template hiện tại không có nội dung HTML. Vui lòng chọn mẫu khác.' });
      return;
    }

    const liveHtml = serializeLivePreviewHtml({ stripToolbar: true });
    const htmlToSave = liveHtml || buildHtml();

    setSaving(true);
    try {
      const payload = {
        userId,
        title: t,
        summary: String(summary || ''),
        templateKey: normalizeTemplateKey(templateKey),
        avatarUrl: normalizeAvatarUrl(avatarImageUrl) || DEFAULT_AVATAR_DATA_URI,
        content: {
          skills: String(skills || ''),
          experience: String(experience || ''),
          projects: String(projects || ''),
          education: String(education || ''),
          languages: String(languages || ''),
        },
        html: htmlToSave,
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
      setPersistedEditedHtml(htmlToSave);
      suppressLoadErrorsUntilRef.current = Date.now() + 8000;

      const newId = data.cv?.id;
      if (newId && !cvId) {
        navigate(`/create-cv/online-editor?cvId=${encodeURIComponent(newId)}&template=${encodeURIComponent(templateKey)}`, { replace: true });
      }
    } catch (err) {
      notify({ type: 'error', message: err.message || 'Không thể lưu CV online' });
    } finally {
      setSaving(false);
    }
  };

  const onPrint = () => {
    const liveHtml = serializeLivePreviewHtml({ stripToolbar: true });
    const html = liveHtml || buildHtml();

    if (!html) {
      notify({ type: 'warning', message: 'Không thể tải nội dung CV để in.' });
      return;
    }

    const w = window.open('', '_blank');
    if (!w) {
      notify({ type: 'warning', message: 'Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép pop-up và thử lại.' });
      return;
    }

    w.document.open();
    w.document.write(html);
    w.document.close();

    const triggerPrint = () => {
      try {
        w.focus();
        w.print();
      } catch (_) {
        notify({ type: 'error', message: 'Không thể mở hộp thoại in PDF. Vui lòng thử lại.' });
      }
    };

    if (w.document.readyState === 'complete') {
      setTimeout(triggerPrint, 180);
      return;
    }

    w.addEventListener('load', () => setTimeout(triggerPrint, 180), { once: true });
  };

  const serializeLivePreviewHtml = useCallback(({ stripToolbar = false } = {}) => {
    const iframeDoc = previewFrameRef.current?.contentDocument;
    const root = iframeDoc?.documentElement;
    if (!root) return '';

    const clone = root.cloneNode(true);
    clone.querySelector('#__cv_live_editor_style__')?.remove();
    clone.querySelector('#__cv_live_editor_hook__')?.remove();
    clone.querySelectorAll('script').forEach((node) => node.remove());
    clone.querySelectorAll('.cv-live-add-slot, .cv-live-add-section-btn, .cv-live-remove-section-btn, [data-cv-runtime="1"]').forEach((node) => node.remove());
    clone.querySelectorAll('.note, .note-badge').forEach((node) => node.remove());

    const avatarNode = clone.querySelector(AVATAR_NODE_SELECTOR);
    const currentAvatar = normalizeAvatarUrl(avatarImageUrl) || DEFAULT_AVATAR_DATA_URI;
    if (avatarNode) {
      avatarNode.setAttribute('src', currentAvatar);
    }

    if (stripToolbar) {
      clone.querySelectorAll('.toolbar, #resetBtn').forEach((node) => node.remove());
    }

    const head = clone.querySelector('head');
    if (head) {
      const exportStyle = clone.ownerDocument.createElement('style');
      exportStyle.id = '__cv_export_fix__';
      exportStyle.textContent =
        '.toolbar,.toolbar.no-print,#resetBtn{display:none!important;}' +
        '.contact-value{overflow-wrap:anywhere;word-break:break-word;}' +
        '@media print{' +
        'body{background:#fff!important;}' +
        '.shell{padding:0!important;}' +
        '.stage{display:block!important;max-width:none!important;overflow:visible!important;padding:0!important;}' +
        '.cv-page{width:210mm!important;min-height:297mm!important;margin:0 auto!important;border:none!important;box-shadow:none!important;}' +
        '.cv-header{grid-template-columns:148px 1fr!important;}' +
        '.avatar-wrap.no-print,.avatar-wrap{display:block!important;}' +
        '.avatar-overlay{display:none!important;}' +
        '.contact-strip{grid-template-columns:repeat(2,minmax(0,1fr))!important;}' +
        '.contact-chip{min-width:0!important;}' +
        '}';
      head.appendChild(exportStyle);
    }

    return `<!doctype html>\n${clone.outerHTML}`;
  }, [avatarImageUrl]);

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
            <div className="text-muted">Bạn có thể chỉnh trực tiếp mọi nội dung hiển thị trong CV.</div>
          </div>
          <div className="cv-editor-actions">
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/create-cv')}>
              <i className="bi bi-arrow-left-circle me-2"></i>Về Tạo CV
            </button>
            <button type="button" className="btn btn-outline-primary" onClick={onPrint}>
              <i className="bi bi-download me-2"></i>Tải PDF
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
        <div className="col-12">
          <div className="cv-editor-preview-card is-full">
            <div className="cv-editor-preview-header">
              <i className="bi bi-eye"></i>
              <div className="fw-semibold">Xem trước CV</div>
            </div>

            <div className="cv-editor-preview-body">
              <iframe
                ref={previewFrameRef}
                title="CV Preview"
                className="cv-editor-preview-iframe"
                srcDoc={previewHtml}
                onLoad={handlePreviewFrameLoad}
              />
            </div>
          </div>
        </div>
      </div>

      {avatarModalOpen ? (
        <div className="cv-editor-avatar-modal-backdrop" onClick={closeAvatarCloudinaryModal}>
          <div className="cv-editor-avatar-modal" onClick={(event) => event.stopPropagation()}>
            <div className="cv-editor-avatar-modal-header">
              <h5 className="mb-0">Đổi ảnh đại diện CV</h5>
              <button
                type="button"
                className="btn-close"
                onClick={closeAvatarCloudinaryModal}
                disabled={uploadingAvatarToCloudinary}
                aria-label="Đóng"
              ></button>
            </div>

            <div className="cv-editor-avatar-modal-body">
              <label className="form-label">Avatar URL</label>
              <input
                type="url"
                className="form-control"
                value={avatarModalUrl}
                onChange={(event) => {
                  const nextUrl = event.target.value;
                  setAvatarModalUrl(nextUrl);
                  setAvatarModalPreview(String(nextUrl || '').trim() || DEFAULT_AVATAR_DATA_URI);
                }}
              />

              <div className="cv-editor-avatar-modal-tools mt-2">
                <input
                  key={avatarModalInputKey}
                  ref={avatarModalFileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarFileSelected}
                />

                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={pickAvatarFileForCloudinary}
                  disabled={uploadingAvatarToCloudinary}
                >
                  <i className="bi bi-upload me-2"></i>
                  {uploadingAvatarToCloudinary ? 'Đang tải ảnh...' : 'Tải ảnh lên hệ thống'}
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={useDefaultAvatarFromModal}
                  disabled={uploadingAvatarToCloudinary}
                >
                  Dùng ảnh mặc định
                </button>
              </div>

              <div className="cv-editor-avatar-modal-preview mt-3">
                <img
                  src={String(avatarModalPreview || '').trim() || DEFAULT_AVATAR_DATA_URI}
                  alt="Avatar preview"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = DEFAULT_AVATAR_DATA_URI;
                  }}
                />
              </div>
            </div>

            <div className="cv-editor-avatar-modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={closeAvatarCloudinaryModal}
                disabled={uploadingAvatarToCloudinary}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={applyAvatarFromModalUrl}
                disabled={uploadingAvatarToCloudinary}
              >
                Dùng ảnh này
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OnlineCvEditor;
