import React, { useEffect, useState } from 'react';
import { Download, History, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SmartPagination from '../../../components/SmartPagination';
import { downloadBlobFile, loadExcelJs } from '../../../utils/excelExport';

const PAGE_LIMIT = 30;
const EXPORT_BATCH_LIMIT = 200;
const JOBFINDER_LOGO_PATH = '/images/logo.png';
const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const buildExportFileToken = (date = new Date()) => {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result);
            return;
        }
        reject(new Error('Unable to convert logo to base64.'));
    };
    reader.onerror = () => reject(reader.error || new Error('Unable to read JobFinder logo.'));
    reader.readAsDataURL(blob);
});

const loadJobFinderLogoAsset = async () => {
    try {
        const response = await fetch(JOBFINDER_LOGO_PATH, { cache: 'no-cache' });
        if (!response.ok) return null;

        const blob = await response.blob();
        const mimeType = String(blob.type || '').toLowerCase();
        const extension = mimeType.includes('png') ? 'png' : 'jpeg';
        const dataUrl = await blobToDataUrl(blob);
        return { extension, dataUrl };
    } catch {
        return null;
    }
};

const formatDateTime = (value, locale = 'vi-VN') => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString(locale);
};

const formatUserLabel = (row, t) => {
    const name = String(row?.user_name || '').trim();
    if (name) return name;

    const email = String(row?.user_email || '').trim();
    if (email) return email;

    if (row?.user_id != null) return t('admin.auditLogsPage.fallback.userWithId', { id: row.user_id });
    return t('admin.auditLogsPage.fallback.system');
};

const formatObjectRef = (row, t) => {
    const object = String(row?.entity_type || '').trim();
    const objectId = row?.entity_id != null ? String(row.entity_id).trim() : '';
    if (!object && !objectId) return '-';
    if (!objectId) return object || '-';
    return `${object || t('admin.auditLogsPage.fallback.object')} #${objectId}`;
};

const AdminAuditLogsPage = ({ API_BASE, authHeaders, requestConfirm }) => {
    const { t, i18n } = useTranslation();
    const [offset, setOffset] = useState(0);
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState(false);

    const page = Math.floor(offset / PAGE_LIMIT) + 1;
    const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / PAGE_LIMIT));
    const fromRecord = total === 0 ? 0 : offset + 1;
    const toRecord = total === 0 ? 0 : Math.min(offset + Math.max(1, logs.length), total);
    const locale = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase().startsWith('en')
        ? 'en-US'
        : 'vi-VN';

    const fetchLogs = async () => {
        setLoading(true);
        setError('');

        try {
            const query = new URLSearchParams();
            query.set('limit', String(PAGE_LIMIT));
            query.set('offset', String(Math.max(0, offset)));

            const response = await fetch(`${API_BASE}/api/admin/audit-logs?${query.toString()}`, {
                headers: authHeaders
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success) {
                throw new Error(data.error || t('admin.auditLogsPage.messages.loadFailed'));
            }

            setLogs(Array.isArray(data.logs) ? data.logs : []);
            setTotal(Number(data?.pagination?.total || 0));
        } catch (err) {
            setLogs([]);
            setTotal(0);
            setError(err?.message || t('admin.auditLogsPage.messages.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    const fetchAllLogsForExport = async () => {
        const allLogs = [];
        let nextOffset = 0;
        let totalRows = null;

        while (true) {
            const query = new URLSearchParams();
            query.set('limit', String(EXPORT_BATCH_LIMIT));
            query.set('offset', String(Math.max(0, nextOffset)));

            const response = await fetch(`${API_BASE}/api/admin/audit-logs?${query.toString()}`, {
                headers: authHeaders
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data?.success) {
                throw new Error(data?.error || t('admin.auditLogsPage.messages.exportLoadFailed'));
            }

            const rows = Array.isArray(data.logs) ? data.logs : [];
            const serverTotal = Number(data?.pagination?.total);
            if (Number.isFinite(serverTotal) && serverTotal >= 0) {
                totalRows = serverTotal;
            }

            allLogs.push(...rows);
            nextOffset += rows.length;

            const reachedEndByRows = rows.length === 0 || rows.length < EXPORT_BATCH_LIMIT;
            const reachedEndByTotal = Number.isFinite(totalRows) ? nextOffset >= totalRows : false;

            if (reachedEndByRows || reachedEndByTotal) {
                break;
            }
        }

        return allLogs;
    };

    const handleExportExcel = async () => {
        if (exporting) return;

        setExporting(true);
        setError('');

        try {
            const exportRows = await fetchAllLogsForExport();
            if (!exportRows.length) {
                throw new Error(t('admin.auditLogsPage.messages.exportEmpty'));
            }

            const ExcelJS = await loadExcelJs();
            const workbook = new ExcelJS.Workbook();

            workbook.creator = 'JobFinder';
            workbook.lastModifiedBy = 'JobFinder Admin';
            workbook.created = new Date();
            workbook.modified = new Date();

            const sheet = workbook.addWorksheet(t('admin.auditLogsPage.export.sheetName'));
            sheet.views = [{ state: 'frozen', ySplit: 5 }];
            sheet.properties.defaultRowHeight = 22;
            sheet.columns = [
                { width: 8 },
                { width: 10 },
                { width: 26 },
                { width: 32 },
                { width: 34 },
                { width: 24 },
                { width: 22 }
            ];

            const logoAsset = await loadJobFinderLogoAsset();
            if (logoAsset) {
                const imageId = workbook.addImage({
                    base64: logoAsset.dataUrl,
                    extension: logoAsset.extension
                });
                sheet.addImage(imageId, {
                    tl: { col: 0, row: 0 },
                    ext: { width: 64, height: 64 }
                });
            } else {
                const fallbackCell = sheet.getCell('A1');
                fallbackCell.value = 'JobFinder';
                fallbackCell.font = { bold: true, color: { argb: 'FF1D4ED8' }, size: 12 };
            }

            sheet.mergeCells('B1:G1');
            sheet.mergeCells('B2:G2');
            sheet.mergeCells('B3:G3');

            const titleCell = sheet.getCell('B1');
            titleCell.value = t('admin.auditLogsPage.export.title');
            titleCell.font = { bold: true, size: 16, color: { argb: 'FF0F172A' } };
            titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

            const subtitleCell = sheet.getCell('B2');
            subtitleCell.value = t('admin.auditLogsPage.export.exportedAt', { value: new Date().toLocaleString(locale) });
            subtitleCell.font = { size: 11, color: { argb: 'FF334155' } };
            subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' };

            const noteCell = sheet.getCell('B3');
            noteCell.value = t('admin.auditLogsPage.export.totalNote', {
                total: exportRows.length.toLocaleString(locale)
            });
            noteCell.font = { italic: true, size: 10, color: { argb: 'FF475569' } };
            noteCell.alignment = { vertical: 'middle', horizontal: 'left' };

            const headerRowIndex = 5;
            const headerRow = sheet.getRow(headerRowIndex);
            headerRow.values = [
                t('admin.auditLogsPage.export.columns.no'),
                t('admin.auditLogsPage.export.columns.id'),
                t('admin.auditLogsPage.export.columns.actor'),
                t('admin.auditLogsPage.export.columns.email'),
                t('admin.auditLogsPage.export.columns.action'),
                t('admin.auditLogsPage.export.columns.object'),
                t('admin.auditLogsPage.export.columns.timestamp')
            ];
            headerRow.height = 26;

            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF1E3A8A' }
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };
            });

            exportRows.forEach((row, index) => {
                const excelRow = sheet.addRow([
                    index + 1,
                    row?.id ?? '-',
                    formatUserLabel(row, t),
                    row?.user_email || '-',
                    String(row?.action || '-'),
                    formatObjectRef(row, t),
                    formatDateTime(row?.timestamp, locale)
                ]);

                excelRow.eachCell((cell, colNumber) => {
                    const isCenterColumn = colNumber === 1 || colNumber === 2 || colNumber === 7;
                    cell.alignment = {
                        vertical: 'middle',
                        horizontal: isCenterColumn ? 'center' : 'left',
                        wrapText: true
                    };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };
                });
            });

            sheet.autoFilter = `A${headerRowIndex}:G${headerRowIndex}`;

            const footerRowIndex = sheet.lastRow.number + 2;
            sheet.mergeCells(`A${footerRowIndex}:G${footerRowIndex}`);
            const footerCell = sheet.getCell(`A${footerRowIndex}`);
            footerCell.value = t('admin.auditLogsPage.export.footer');
            footerCell.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
            footerCell.alignment = { vertical: 'middle', horizontal: 'left' };

            const fileName = `jobfinder-audit-logs-${buildExportFileToken(new Date())}.xlsx`;
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: EXCEL_MIME_TYPE });
            downloadBlobFile(blob, fileName);
        } catch (err) {
            setError(err?.message || t('admin.auditLogsPage.messages.exportFailed'));
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        if (!API_BASE) return;
        fetchLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [API_BASE, authHeaders, offset]);

    const handleDeleteLog = async (row) => {
        const targetId = Number(row?.id);
        if (!Number.isFinite(targetId)) return;
        if (typeof requestConfirm !== 'function') return;

        const approved = await requestConfirm({
            title: t('admin.auditLogsPage.actions.delete'),
            message: t('admin.auditLogsPage.confirm.deleteMessage', { id: targetId }),
            confirmText: t('common.delete'),
            cancelText: t('common.cancel')
        });
        if (!approved) return;

        setDeletingId(targetId);
        setError('');

        try {
            const response = await fetch(`${API_BASE}/api/admin/audit-logs/${targetId}`, {
                method: 'DELETE',
                headers: authHeaders
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success) {
                throw new Error(data.error || t('admin.auditLogsPage.messages.deleteFailed'));
            }

            const isDeletingLastRowInPage = logs.length === 1 && offset > 0;
            if (isDeletingLastRowInPage) {
                setOffset((prev) => Math.max(0, prev - PAGE_LIMIT));
            } else {
                await fetchLogs();
            }
        } catch (err) {
            setError(err?.message || t('admin.auditLogsPage.messages.deleteFailed'));
        } finally {
            setDeletingId(null);
        }
    };

    const handlePageChange = (nextPage) => {
        const safePage = Math.max(1, Math.min(totalPages, Number(nextPage) || 1));
        setOffset((safePage - 1) * PAGE_LIMIT);
    };

    return (
        <div className="card border-0 shadow-sm admin-module-card mb-4">
            <div className="card-header bg-white border-0 py-3 admin-audit-toolbar">
                <h5 className="mb-0 d-flex align-items-center gap-2">
                    <History size={18} />
                    <span>{t('admin.auditLogsPage.title')}</span>
                </h5>
                <button
                    type="button"
                    className="btn btn-success btn-sm d-inline-flex align-items-center gap-1"
                    onClick={handleExportExcel}
                    disabled={loading || exporting}
                >
                    <Download size={14} />
                    <span>{exporting ? t('admin.auditLogsPage.export.exporting') : t('admin.auditLogsPage.export.downloadButton')}</span>
                </button>
            </div>

            <div className="card-body pt-2 pb-3">
                <div className="admin-audit-meta">
                    <span>{t('admin.auditLogsPage.meta.total')}: <strong>{total.toLocaleString(locale)}</strong></span>
                    <span>{t('admin.auditLogsPage.meta.page')}: <strong>{page}/{totalPages}</strong></span>
                </div>

                {error ? <div className="alert alert-danger mt-3 mb-0">{error}</div> : null}

                <div className="table-responsive mt-3">
                    <table className="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th style={{ width: 90 }}>ID</th>
                                <th style={{ width: 220 }}>{t('admin.auditLogsPage.columns.actor')}</th>
                                <th style={{ width: 240 }}>{t('admin.auditLogsPage.columns.action')}</th>
                                <th style={{ width: 180 }}>{t('admin.auditLogsPage.columns.object')}</th>
                                <th style={{ width: 190 }}>{t('admin.auditLogsPage.columns.timestamp')}</th>
                                <th style={{ width: 130 }}>{t('admin.auditLogsPage.columns.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center text-muted py-4">{t('admin.auditLogsPage.empty')}</td>
                                </tr>
                            ) : null}

                            {logs.map((row, index) => (
                                <tr key={row.id}>
                                    <td>{offset + index + 1}</td>
                                    <td>
                                        <div className="fw-semibold">{formatUserLabel(row, t)}</div>
                                        {row.user_email ? <small className="text-muted">{row.user_email}</small> : null}
                                    </td>
                                    <td>{String(row.action || '-')}</td>
                                    <td>{formatObjectRef(row, t)}</td>
                                    <td>{formatDateTime(row.timestamp, locale)}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() => handleDeleteLog(row)}
                                            disabled={loading || deletingId === row.id}
                                            title={t('admin.auditLogsPage.actions.delete')}
                                            aria-label={t('admin.auditLogsPage.actions.delete')}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="d-flex justify-content-between align-items-center gap-2 mt-3 flex-wrap">
                    <SmartPagination
                        from={fromRecord}
                        to={toRecord}
                        currentPage={page}
                        totalItems={total}
                        pageSize={PAGE_LIMIT}
                        onPageChange={handlePageChange}
                        loading={loading}
                    />
                </div>
            </div>
        </div>
    );
};

export default AdminAuditLogsPage;
