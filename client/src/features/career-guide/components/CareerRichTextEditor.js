import React, { useEffect, useMemo, useRef, useState } from 'react';
import './CareerRichTextEditor.css';

const TOOLBAR_ITEMS = [
  { command: 'formatBlock', value: 'h2', icon: 'bi-type-h2', label: 'Tiêu đề lớn' },
  { command: 'formatBlock', value: 'h3', icon: 'bi-type-h3', label: 'Tiêu đề nhỏ' },
  { command: 'bold', icon: 'bi-type-bold', label: 'Đậm' },
  { command: 'italic', icon: 'bi-type-italic', label: 'Nghiêng' },
  { command: 'insertUnorderedList', icon: 'bi-list-ul', label: 'Danh sách' },
  { command: 'insertOrderedList', icon: 'bi-list-ol', label: 'Đánh số' },
  { command: 'blockquote', icon: 'bi-blockquote-left', label: 'Trích dẫn' },
  { command: 'createLink', icon: 'bi-link-45deg', label: 'Chèn liên kết' },
  { command: 'unlink', icon: 'bi-link-break', label: 'Bỏ liên kết' },
  { command: 'removeFormat', icon: 'bi-eraser', label: 'Xóa định dạng' }
];

function CareerRichTextEditor({
  value,
  onChange,
  initialValue = '',
  placeholder = 'Viết nội dung bài viết...',
  minHeight = 300,
  className = ''
}) {
  const editorRef = useRef(null);
  const [focused, setFocused] = useState(false);

  const normalizedValue = useMemo(() => {
    if (typeof value === 'string') return value;
    if (typeof initialValue === 'string') return initialValue;
    return '';
  }, [value, initialValue]);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML === normalizedValue) return;
    editorRef.current.innerHTML = normalizedValue;
  }, [normalizedValue]);

  const emitChange = () => {
    if (!editorRef.current || typeof onChange !== 'function') return;
    onChange(editorRef.current.innerHTML);
  };

  const focusEditor = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const applyCommand = (command, commandValue) => {
    focusEditor();

    if (command === 'blockquote') {
      document.execCommand('formatBlock', false, 'blockquote');
      emitChange();
      return;
    }

    if (command === 'createLink') {
      const url = window.prompt('Nhập liên kết (https://...)');
      if (url && url.trim()) {
        document.execCommand('createLink', false, url.trim());
        emitChange();
      }
      return;
    }

    if (command === 'formatBlock') {
      document.execCommand('formatBlock', false, commandValue || 'p');
      emitChange();
      return;
    }

    document.execCommand(command, false, commandValue || null);
    emitChange();
  };

  return (
    <div className={`cgrte ${focused ? 'is-focused' : ''} ${className}`.trim()}>
      <div className="cgrte-toolbar" role="toolbar" aria-label="Công cụ định dạng nội dung">
        {TOOLBAR_ITEMS.map((item) => (
          <button
            key={item.command + (item.value || '')}
            type="button"
            className="cgrte-toolbar-btn"
            title={item.label}
            aria-label={item.label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommand(item.command, item.value)}
          >
            <i className={`bi ${item.icon}`} aria-hidden="true"></i>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div
        ref={editorRef}
        className="cgrte-content"
        contentEditable
        role="textbox"
        aria-label="Trình soạn thảo nội dung bài viết"
        aria-multiline="true"
        data-placeholder={placeholder}
        style={{ minHeight }}
        suppressContentEditableWarning
        onInput={emitChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

export default CareerRichTextEditor;
