import React, { useState } from 'react';
import { ChevronRight, Download, FileStack } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { downloadBlobFile, loadExcelJs } from '../../../utils/excelExport';

const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const buildFileToken = (date = new Date()) => {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

const styleSheetHeader = (row) => {
    row.eachCell((cell) => {
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
};

const AdminOverviewPage = ({ currentAdminName, statsCards, recentTemplateActivities, popularTemplates }) => {
    const { t, i18n } = useTranslation();
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');

    const locale = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase().startsWith('en')
        ? 'en-US'
        : 'vi-VN';

    const handleExportDashboardExcel = async () => {
        if (exporting) return;

        setExporting(true);
        setExportError('');

        try {
            const ExcelJS = await loadExcelJs();
            const workbook = new ExcelJS.Workbook();

            workbook.creator = 'JobFinder';
            workbook.lastModifiedBy = 'JobFinder Admin';
            workbook.created = new Date();
            workbook.modified = new Date();

            const summarySheet = workbook.addWorksheet(t('admin.overview.excel.summarySheet'));
            summarySheet.columns = [
                { width: 34 },
                { width: 18 },
                { width: 52 }
            ];

            summarySheet.mergeCells('A1:C1');
            summarySheet.getCell('A1').value = t('admin.overview.excel.reportTitle');
            summarySheet.getCell('A1').font = { bold: true, size: 15, color: { argb: 'FF0F172A' } };
            summarySheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };

            summarySheet.addRow([t('admin.overview.excel.adminLabel'), currentAdminName || t('admin.greetingDefault'), '']);
            summarySheet.addRow([t('admin.overview.excel.exportDateLabel'), new Date().toLocaleString(locale), '']);
            summarySheet.addRow([]);

            const summaryHeader = summarySheet.addRow([
                t('admin.overview.excel.metricHeader'),
                t('admin.overview.excel.valueHeader'),
                t('admin.overview.excel.noteHeader')
            ]);
            styleSheetHeader(summaryHeader);

            (statsCards || []).forEach((card) => {
                const valueNumber = Number(card?.value);
                summarySheet.addRow([
                    String(card?.title || '-'),
                    Number.isFinite(valueNumber) ? valueNumber : String(card?.value || 0),
                    String(card?.meta || '-')
                ]);
            });

            if ((statsCards || []).length === 0) {
                summarySheet.addRow([t('admin.overview.excel.noStats'), '-', '-']);
            }

            const recentSheet = workbook.addWorksheet(t('admin.overview.excel.recentSheet'));
            recentSheet.columns = [
                { width: 8 },
                { width: 34 },
                { width: 28 },
                { width: 24 }
            ];
            const recentHeader = recentSheet.addRow([
                t('admin.overview.excel.indexHeader'),
                t('admin.overview.excel.templateNameHeader'),
                t('admin.overview.excel.exactTimeHeader'),
                t('admin.overview.excel.relativeTimeHeader')
            ]);
            styleSheetHeader(recentHeader);

            if ((recentTemplateActivities || []).length > 0) {
                recentTemplateActivities.forEach((item, index) => {
                    recentSheet.addRow([
                        index + 1,
                        String(item?.name || '-'),
                        String(item?.exactTime || '-'),
                        String(item?.relativeTime || '-')
                    ]);
                });
            } else {
                recentSheet.addRow([1, t('admin.overview.excel.noRecent'), '-', '-']);
            }

            const popularSheet = workbook.addWorksheet(t('admin.overview.excel.popularSheet'));
            popularSheet.columns = [
                { width: 8 },
                { width: 34 },
                { width: 16 },
                { width: 16 }
            ];
            const popularHeader = popularSheet.addRow([
                t('admin.overview.excel.indexHeader'),
                t('admin.overview.excel.templateNameHeader'),
                t('admin.overview.excel.usageHeader'),
                t('admin.overview.excel.progressHeader')
            ]);
            styleSheetHeader(popularHeader);

            if ((popularTemplates || []).length > 0) {
                popularTemplates.forEach((item, index) => {
                    popularSheet.addRow([
                        index + 1,
                        String(item?.name || '-'),
                        Number(item?.usage || 0),
                        Number(item?.progress || 0)
                    ]);
                });
            } else {
                popularSheet.addRow([1, t('admin.overview.excel.noPopular'), 0, 0]);
            }

            const fileName = `jobfinder-dashboard-${buildFileToken(new Date())}.xlsx`;
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: EXCEL_MIME_TYPE });
            downloadBlobFile(blob, fileName);
        } catch (error) {
            setExportError(error?.message || t('admin.overview.exportError'));
        } finally {
            setExporting(false);
        }
    };

    return (
        <>
            <section className="admin-hero-banner">
                <div className="admin-hero-banner-head">
                    <p className="admin-hero-chip">{t('admin.overview.heroChip')}</p>
                    <button
                        type="button"
                        className="btn btn-light btn-sm admin-hero-export-btn"
                        onClick={handleExportDashboardExcel}
                        disabled={exporting}
                    >
                        <Download size={14} />
                        <span>{exporting ? t('admin.overview.exporting') : t('admin.overview.export')}</span>
                    </button>
                </div>
                <h1>{t('admin.overview.heroTitle', { name: currentAdminName || t('admin.greetingDefault') })}</h1>
                <p>{t('admin.overview.heroSubtitle')}</p>
            </section>

            {exportError ? <div className="alert alert-danger admin-feedback mb-0">{exportError}</div> : null}

            <section className="admin-stats-grid">
                {statsCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <article key={card.key} className="admin-stat-card">
                            <div className={`admin-stat-icon ${card.iconClass}`}>
                                <Icon size={18} />
                            </div>
                            <div className="admin-stat-content">
                                <div className="admin-stat-title">{card.title}</div>
                                <div className="admin-stat-value">{card.value.toLocaleString(locale)}</div>
                                <div className="admin-stat-meta">{card.meta}</div>
                            </div>
                        </article>
                    );
                })}
            </section>

            <section className="admin-panels-grid">
                <article className="admin-panel-card">
                    <div className="admin-panel-head">
                        <h3>{t('admin.overview.recentTitle')}</h3>
                        <span>{t('admin.overview.recentSubtitle')}</span>
                    </div>

                    {recentTemplateActivities.length > 0 ? (
                        <div className="admin-activity-list">
                            {recentTemplateActivities.map((item) => (
                                <div key={item.id} className="admin-activity-item">
                                    <div className="admin-activity-icon">
                                        <FileStack size={15} />
                                    </div>
                                    <div className="admin-activity-content">
                                        <div className="admin-activity-title">{item.name}</div>
                                        <div className="admin-activity-subtitle">{item.exactTime}</div>
                                    </div>
                                    <div className="admin-activity-tail">
                                        <span>{item.relativeTime}</span>
                                        <ChevronRight size={14} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="admin-empty-state">{t('admin.overview.recentEmpty')}</div>
                    )}
                </article>

                <article className="admin-panel-card">
                    <div className="admin-panel-head">
                        <h3>{t('admin.overview.popularTitle')}</h3>
                        <span>{t('admin.overview.popularSubtitle')}</span>
                    </div>

                    {popularTemplates.length > 0 ? (
                        <div className="admin-popular-list">
                            {popularTemplates.map((item) => (
                                <div key={item.id} className="admin-popular-item">
                                    <div className="admin-popular-row">
                                        <span className="admin-popular-name">{item.name}</span>
                                        <span className="admin-popular-usage">{t('admin.overview.usageCount', { count: item.usage })}</span>
                                    </div>
                                    <div className="admin-progress-track">
                                        <div
                                            className="admin-progress-fill"
                                            style={{ width: `${item.progress}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="admin-empty-state">{t('admin.overview.popularEmpty')}</div>
                    )}
                </article>
            </section>
        </>
    );
};

export default AdminOverviewPage;
