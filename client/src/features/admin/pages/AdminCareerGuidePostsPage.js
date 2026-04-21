import React, { useState } from 'react';
import { BookOpen, ExternalLink, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SmartPagination from '../../../components/SmartPagination';

const toText = (value) => String(value || '').trim();

const formatDateTime = (value, locale = 'vi-VN') => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString(locale);
};

const formatCode = (prefix, value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '-';
    return `${prefix}-${raw}`;
};

const formatAuthorType = (value, t) => {
    const type = toText(value).toLowerCase();
    if (!type) return '-';
    if (type === 'candidate') return t('admin.careerGuidePostsPage.authorType.candidate');
    if (type === 'employer') return t('admin.careerGuidePostsPage.authorType.employer');
    if (type === 'admin') return t('admin.careerGuidePostsPage.authorType.admin');
    return value;
};

const resolvePostId = (post) => {
    const raw = post?.MaBaiViet ?? post?.id;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const isSamplePost = (post) => Boolean(post?.IsSample || post?.isSample || !resolvePostId(post));

const getPostTitle = (post) => toText(post?.TieuDe || post?.title);
const getPostAuthor = (post) => post?.MaTacGia ?? post?.authorId ?? post?.author;
const getPostAuthorType = (post) => post?.LoaiTacGia ?? post?.authorType;
const getPostCreatedAt = (post) => post?.NgayTao ?? post?.createdAt ?? post?.publishedAt;
const getPostUpdatedAt = (post) => post?.NgayCapNhat ?? post?.updatedAt ?? post?.publishedAt;
const getPostViews = (post) => Number(post?.LuotXem ?? post?.views ?? 0);
const getPostSlug = (post) => toText(post?.Slug || post?.slug);

const buildPostPath = (post) => {
    const slug = getPostSlug(post);
    if (slug) return `/career-guide/${encodeURIComponent(slug)}`;

    const id = resolvePostId(post);
    if (!id) return '';
    return `/career-guide/${encodeURIComponent(String(id))}`;
};

const AdminCareerGuidePostsPage = ({
    posts,
    pagination,
    loading,
    onRangeChange,
    onDeletePost,
    requestConfirm
}) => {
    const { t, i18n } = useTranslation();
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState('');

    const locale = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase().startsWith('en')
        ? 'en-US'
        : 'vi-VN';

    const totalItems = Math.max(0, Number(pagination?.total) || posts.length || 0);
    const perPage = Math.max(1, Number(pagination?.limit) || 10);
    const fromDisplay = totalItems > 0 ? Math.max(1, Number(pagination?.from) || 1) : 0;
    const toDisplay = totalItems > 0
        ? Math.max(fromDisplay, Math.min(totalItems, Number(pagination?.to) || (fromDisplay + posts.length - 1)))
        : 0;

    const handleDeletePost = async (post) => {
        const postId = resolvePostId(post);
        if (!postId || isSamplePost(post)) return;
        if (typeof requestConfirm !== 'function') return;

        const confirmMessage = t('admin.careerGuidePostsPage.confirm.deleteMessage', { id: postId });
        const approved = await requestConfirm({
            title: t('admin.careerGuidePostsPage.confirm.deleteTitle'),
            message: confirmMessage,
            confirmText: t('admin.careerGuidePostsPage.confirm.deleteButton'),
            cancelText: t('common.cancel')
        });
        if (!approved) return;

        setDeletingId(postId);
        setError('');

        try {
            await onDeletePost(postId);
        } catch (err) {
            setError(err?.message || t('admin.careerGuidePostsPage.messages.deleteFailed'));
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="card border-0 shadow-sm admin-module-card mb-4">
            <div className="card-header bg-white border-0 py-3">
                <h5 className="mb-0 d-flex align-items-center gap-2">
                    <BookOpen size={18} />
                    <span>{t('admin.careerGuidePostsPage.title')}</span>
                </h5>
            </div>

            <div className="card-body py-2">
                {error ? <div className="alert alert-danger mb-2">{error}</div> : null}
            </div>

            <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th style={{ width: 100 }}>ID</th>
                            <th style={{ width: 220 }}>{t('admin.careerGuidePostsPage.columns.title')}</th>
                            <th style={{ width: 130 }}>{t('admin.careerGuidePostsPage.columns.author')}</th>
                            <th style={{ width: 150 }}>{t('admin.careerGuidePostsPage.columns.authorType')}</th>
                            <th style={{ width: 185 }}>{t('admin.careerGuidePostsPage.columns.createdAt')}</th>
                            <th style={{ width: 185 }}>{t('admin.careerGuidePostsPage.columns.updatedAt')}</th>
                            <th style={{ width: 100 }}>{t('admin.careerGuidePostsPage.columns.views')}</th>
                            <th style={{ width: 110 }}>{t('admin.careerGuidePostsPage.columns.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {posts.map((post, index) => {
                            const postId = resolvePostId(post);
                            const isSample = isSamplePost(post);
                            const postPath = buildPostPath(post);
                            const rowKey = String(post?.MaBaiViet ?? post?.id ?? `sample-${index}`);
                            return (
                                <tr key={rowKey}>
                                    <td>{fromDisplay + index}</td>
                                    <td className="admin-career-post-title">
                                        {getPostTitle(post) || '-'}
                                        {isSample ? <span className="badge bg-secondary ms-2">{t('admin.careerGuidePostsPage.sampleBadge')}</span> : null}
                                    </td>
                                    <td><span className="admin-code-chip">{formatCode('TG', getPostAuthor(post))}</span></td>
                                    <td>{formatAuthorType(getPostAuthorType(post), t)}</td>
                                    <td>{formatDateTime(getPostCreatedAt(post), locale)}</td>
                                    <td>{formatDateTime(getPostUpdatedAt(post), locale)}</td>
                                    <td>{getPostViews(post).toLocaleString(locale)}</td>
                                    <td>
                                        <div className="admin-career-row-actions">
                                            <a
                                                href={postPath || '#'}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-sm btn-outline-primary admin-action-icon-btn"
                                                title={t('admin.careerGuidePostsPage.actions.openPost')}
                                                aria-label={t('admin.careerGuidePostsPage.actions.openPost')}
                                                onClick={(event) => {
                                                    if (!postPath) event.preventDefault();
                                                }}
                                            >
                                                <ExternalLink size={14} />
                                            </a>

                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger admin-action-icon-btn"
                                                title={isSample ? t('admin.careerGuidePostsPage.actions.deleteDisabledSample') : t('admin.careerGuidePostsPage.actions.delete')}
                                                aria-label={isSample ? t('admin.careerGuidePostsPage.actions.deleteDisabledSample') : t('admin.careerGuidePostsPage.actions.delete')}
                                                disabled={isSample || deletingId === postId}
                                                onClick={() => handleDeletePost(post)}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {posts.length === 0 && !loading && (
                            <tr><td colSpan={8} className="text-center text-muted py-4">{t('admin.careerGuidePostsPage.empty')}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalItems > 0 ? (
                <div className="d-flex justify-content-end p-3 border-top bg-white">
                    <SmartPagination
                        from={fromDisplay}
                        to={toDisplay}
                        pageSize={perPage}
                        perPage={perPage}
                        totalItems={totalItems}
                        loading={loading}
                        onRangeChange={(nextFrom, nextTo) => {
                            if (typeof onRangeChange === 'function') {
                                onRangeChange(nextFrom, nextTo);
                            }
                        }}
                    />
                </div>
            ) : null}
        </div>
    );
};

export default AdminCareerGuidePostsPage;
