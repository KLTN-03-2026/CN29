const pickExcelNamespace = (moduleValue) => {
  if (!moduleValue || typeof moduleValue !== 'object') return null;

  const direct = moduleValue.Workbook ? moduleValue : null;
  if (direct) return direct;

  const defaultValue = moduleValue.default;
  if (defaultValue && typeof defaultValue === 'object' && defaultValue.Workbook) {
    return defaultValue;
  }

  if (moduleValue.ExcelJS && typeof moduleValue.ExcelJS === 'object' && moduleValue.ExcelJS.Workbook) {
    return moduleValue.ExcelJS;
  }

  return null;
};

export const loadExcelJs = async () => {
  if (typeof window !== 'undefined' && window.ExcelJS?.Workbook) {
    return window.ExcelJS;
  }

  let lastError = null;

  try {
    const importedModule = await import('exceljs');
    const excelNamespace = pickExcelNamespace(importedModule);
    if (excelNamespace?.Workbook && typeof excelNamespace.Workbook === 'function') {
      return excelNamespace;
    }
  } catch (error) {
    lastError = error;
  }

  try {
    const importedModule = await import('exceljs/dist/exceljs.min.js');
    const excelNamespace = pickExcelNamespace(importedModule);
    if (excelNamespace?.Workbook && typeof excelNamespace.Workbook === 'function') {
      return excelNamespace;
    }
  } catch (error) {
    lastError = error;
  }

  try {
    const importedModule = await import('exceljs/dist/exceljs.js');
    const excelNamespace = pickExcelNamespace(importedModule);
    if (excelNamespace?.Workbook && typeof excelNamespace.Workbook === 'function') {
      return excelNamespace;
    }
  } catch (error) {
    lastError = error;
  }

  const failError = new Error('Không thể tải thư viện Excel. Vui lòng tải lại trang và thử lại.');
  failError.cause = lastError;
  throw failError;
};

export const downloadBlobFile = (blob, fileName) => {
  if (!(blob instanceof Blob)) {
    throw new Error('Dữ liệu tải xuống không hợp lệ.');
  }

  if (typeof window === 'undefined') return;

  if (window.navigator && typeof window.navigator.msSaveOrOpenBlob === 'function') {
    window.navigator.msSaveOrOpenBlob(blob, fileName);
    return;
  }

  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 1800);
};
