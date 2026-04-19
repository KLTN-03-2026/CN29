import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const EXCLUDED_CONTENT_SELECTORS = [
  '[data-i18n-skip="true"]',
  '[contenteditable="true"]',
  '.post-detail-content',
  '.cg-featured-post h2',
  '.cg-featured-post p',
  '.cg-post-card h3',
  '.cg-post-card p',
  '.cg-post-category',
  '.cg-post-meta',
  '.cg-post-footer',
  '.cg-read-link',
  '.cg-card-link',
  '.job-detail-rich-block',
  '.job-detail-title',
  '.job-detail-info-list__value',
  '.job-detail-pill',
  '.job-detail-company-name',
  '.job-detail-company-location',
  '.job-detail-company-description',
  '.job-detail-comment-item',
  '.job-detail-cv-option',
  '.cv-gallery-thumb-shell',
  '.cv-gallery-list-thumb-shell',
  '.cv-grid-template-modal-preview',
  '.admin-template-preview-pane',
  '.admin-template-preview-frame',
  '.admin-template-code-input',
  '.online-cv-editor-iframe',
  '.cv-live-preview-iframe'
].join(',');

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE']);
const ATTRIBUTES_TO_TRANSLATE = ['placeholder', 'title', 'aria-label'];

const normalizePhrase = (value) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const flattenTranslationMap = (object, prefix = '', output = {}) => {
  if (!object || typeof object !== 'object') return output;

  Object.entries(object).forEach(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      output[nextKey] = value;
      return;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenTranslationMap(value, nextKey, output);
    }
  });

  return output;
};

const buildPhraseKeyMap = (bundle) => {
  const byExact = new Map();
  const byNormalized = new Map();

  const flattened = flattenTranslationMap(bundle || {});
  Object.entries(flattened).forEach(([key, phrase]) => {
    const text = String(phrase || '');
    if (!text) return;

    const normalized = normalizePhrase(text);
    if (!normalized) return;

    if (!byExact.has(text)) {
      byExact.set(text, key);
    }

    if (!byNormalized.has(normalized)) {
      byNormalized.set(normalized, key);
    }
  });

  return {
    getKeyByPhrase: (phrase) => {
      const raw = String(phrase || '');
      return byExact.get(raw) || byNormalized.get(normalizePhrase(raw)) || '';
    }
  };
};

const hasTranslatableLetters = (value) => /[A-Za-z\u00C0-\u1EF9]/.test(value);

const shouldTranslateText = (value) => {
  const text = String(value || '').trim();
  if (!text) return false;
  if (text.length < 2) return false;
  if (/^(https?:\/\/|www\.)/i.test(text)) return false;
  if (/^[\d\s.,:/%()+\-]+$/.test(text)) return false;
  if (!hasTranslatableLetters(text)) return false;
  return true;
};

const splitWhitespace = (value) => {
  const raw = String(value || '');
  const leading = (raw.match(/^\s*/) || [''])[0];
  const trailing = (raw.match(/\s*$/) || [''])[0];
  const core = raw.trim();
  return { leading, core, trailing };
};

const isExcludedElement = (element) => {
  if (!element || !(element instanceof Element)) return true;
  if (element.closest(EXCLUDED_CONTENT_SELECTORS)) return true;

  const tagName = String(element.tagName || '').toUpperCase();
  if (SKIP_TAGS.has(tagName)) return true;

  return false;
};

const getTextParentElement = (node) => {
  if (!node) return null;
  if (node.parentElement) return node.parentElement;
  const parent = node.parentNode;
  return parent instanceof Element ? parent : null;
};

const I18nGlobalAutoTranslate = () => {
  const location = useLocation();
  const { i18n } = useTranslation();

  const nodeSourceMapRef = useRef(new WeakMap());
  const attrSourceMapRef = useRef(new WeakMap());

  const phraseMaps = useMemo(() => {
    const viBundle = i18n.getResourceBundle('vi', 'translation') || {};
    const enBundle = i18n.getResourceBundle('en', 'translation') || {};

    return {
      vi: buildPhraseKeyMap(viBundle),
      en: buildPhraseKeyMap(enBundle)
    };
  }, [i18n]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    const currentLanguage = String(i18n.resolvedLanguage || i18n.language || 'vi').slice(0, 2).toLowerCase();

    const resolveTranslation = (sourceText) => {
      const source = String(sourceText || '');
      if (!source) return source;

      if (currentLanguage === 'vi') {
        return source;
      }

      const mappedKey = phraseMaps.vi.getKeyByPhrase(source) || phraseMaps.en.getKeyByPhrase(source);
      if (mappedKey) {
        const mappedValue = i18n.t(mappedKey, { defaultValue: source });
        if (typeof mappedValue === 'string' && mappedValue.trim()) {
          return mappedValue;
        }
      }

      const directValue = i18n.t(source, {
        defaultValue: source,
        keySeparator: false,
        nsSeparator: false
      });

      if (typeof directValue === 'string' && directValue.trim()) {
        return directValue;
      }

      return source;
    };

    const applyTextNodeTranslations = () => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const textNodes = [];

      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }

      textNodes.forEach((textNode) => {
        const parentElement = getTextParentElement(textNode);
        if (!parentElement || isExcludedElement(parentElement)) return;

        const currentText = String(textNode.nodeValue || '');
        const { leading, core, trailing } = splitWhitespace(currentText);
        if (!shouldTranslateText(core)) return;

        const existingSource = nodeSourceMapRef.current.get(textNode);
        const sourceText = existingSource || core;
        nodeSourceMapRef.current.set(textNode, sourceText);

        const translated = resolveTranslation(sourceText);
        const nextValue = `${leading}${translated}${trailing}`;

        if (nextValue !== currentText) {
          textNode.nodeValue = nextValue;
        }
      });
    };

    const applyAttributeTranslations = () => {
      const selector = ATTRIBUTES_TO_TRANSLATE.map((attr) => `[${attr}]`).join(',');
      const elements = root.querySelectorAll(selector);

      elements.forEach((element) => {
        if (isExcludedElement(element)) return;

        let sourceMap = attrSourceMapRef.current.get(element);
        if (!sourceMap) {
          sourceMap = new Map();
          attrSourceMapRef.current.set(element, sourceMap);
        }

        ATTRIBUTES_TO_TRANSLATE.forEach((attributeName) => {
          const currentValue = element.getAttribute(attributeName);
          if (!shouldTranslateText(currentValue)) return;

          const sourceValue = sourceMap.get(attributeName) || currentValue;
          sourceMap.set(attributeName, sourceValue);

          const translated = resolveTranslation(sourceValue);
          if (translated && translated !== currentValue) {
            element.setAttribute(attributeName, translated);
          }
        });
      });
    };

    let frameId = null;

    const run = () => {
      frameId = null;
      applyTextNodeTranslations();
      applyAttributeTranslations();
    };

    const schedule = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(run);
    };

    schedule();

    const observer = new MutationObserver(() => {
      schedule();
    });

    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRIBUTES_TO_TRANSLATE, 'data-i18n-skip']
    });

    return () => {
      observer.disconnect();
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [i18n, i18n.language, i18n.resolvedLanguage, location.pathname, location.search, phraseMaps]);

  return null;
};

export default I18nGlobalAutoTranslate;
