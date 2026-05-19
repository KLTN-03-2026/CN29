const path = require('path');

const sanitizeHtmlForReadOnly = (html = '') => {
  if (!html || typeof html !== 'string') return '';
  let cleaned = String(html);

  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/\s+contenteditable\s*=\s*"[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s+contenteditable\s*=\s*'[^']*'/gi, '');
  cleaned = cleaned.replace(/\s+contenteditable\s*=\s*[^\s>]+/gi, '');
  cleaned = cleaned.replace(/\s+contenteditable(?=[\s>])/gi, '');
  cleaned = cleaned.replace(/\s+data-editable\s*=\s*"[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s+data-editable\s*=\s*'[^']*'/gi, '');
  cleaned = cleaned.replace(/\s+data-editable\s*=\s*[^\s>]+/gi, '');
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '');

  const lockdown = `
<style id="__cv_readonly_lockdown__">
  [contenteditable],
  [data-editable],
  [data-cv-field] {
    outline: none !important;
    cursor: default !important;
    -webkit-user-modify: read-only !important;
    user-select: text !important;
  }
  .section-tools,
  .section-tools *,
  .tool-btn,
  .section-item-add-btn,
  .section-add-btn,
  .cv-live-add-slot,
  .cv-live-add-section-btn,
  .cv-live-remove-section-btn,
  .toolbar,
  .toolbar.no-print,
  .avatar-overlay,
  #resetBtn,
  [data-cv-runtime="1"] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
  .avatar-wrap,
  .avatar-wrap.no-print {
    cursor: default !important;
    pointer-events: none !important;
  }
</style>
<script id="__cv_readonly_runtime__">
  (function () {
    function lock() {
      document.designMode = 'off';
      document.querySelectorAll('[contenteditable], [data-editable]').forEach(function (node) {
        node.removeAttribute('contenteditable');
        node.removeAttribute('data-editable');
      });
      document.querySelectorAll('.section-tools,.tool-btn,.section-item-add-btn,.section-add-btn,.cv-live-add-slot,.cv-live-add-section-btn,.cv-live-remove-section-btn,.toolbar,#resetBtn,[data-cv-runtime="1"]').forEach(function (node) {
        node.remove();
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lock);
    else lock();
  })();
</script>`;

  if (/<\/head>/i.test(cleaned)) {
    return cleaned.replace(/<\/head>/i, `${lockdown}</head>`);
  }

  return `${cleaned}${lockdown}`;
};

const toSafeCvFilename = (value) => path.basename(String(value || '').trim().replace(/\\/g, '/'));

module.exports = {
  sanitizeHtmlForReadOnly,
  toSafeCvFilename
};
