import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './CareerGuide.css';

const TOPIC_FILTERS = [
  { key: 'all', labelKey: 'careerGuide.topics.all', keywords: [] },
  { key: 'cv', labelKey: 'careerGuide.topics.cvProfile', keywords: ['cv', 'hồ sơ', 'resume', 'portfolio'] },
  { key: 'interview', labelKey: 'careerGuide.topics.interview', keywords: ['phỏng vấn', 'interview', 'câu hỏi'] },
  { key: 'salary', labelKey: 'careerGuide.topics.salary', keywords: ['lương', 'thưởng', 'đãi ngộ', 'offer'] },
  { key: 'career', labelKey: 'careerGuide.topics.careerPath', keywords: ['career', 'lộ trình', 'phát triển', 'chuyển việc'] },
  { key: 'skills', labelKey: 'careerGuide.topics.workSkills', keywords: ['kỹ năng', 'giao tiếp', 'thuyết trình', 'teamwork'] }
];

const normalizeRoleValue = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

function CareerGuide() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language?.startsWith('en') ? 'en-US' : 'vi-VN';
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [activeTopic, setActiveTopic] = useState('all');
  const [sortMode, setSortMode] = useState('latest');

  const normalizedUserRole = useMemo(
    () => normalizeRoleValue(
      user?.role
      || user?.vaiTro
      || user?.VaiTro
      || user?.LoaiNguoiDung
      || ''
    ),
    [user]
  );

  const canCreatePost = useMemo(() => {
    if (!user) return false;

    const isSuperAdmin = (
      user?.isSuperAdmin === true
      || user?.isSuperAdmin === 1
      || user?.isSuperAdmin === '1'
      || user?.IsSuperAdmin === true
      || user?.IsSuperAdmin === 1
      || user?.IsSuperAdmin === '1'
    );

    if (isSuperAdmin) return true;

    return (
      normalizedUserRole === 'ung vien'
      || normalizedUserRole === 'nha tuyen dung'
      || normalizedUserRole === 'quan tri'
      || normalizedUserRole === 'sieu quan tri vien'
    );
  }, [normalizedUserRole, user]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchPosts();
  }, [currentPage]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/career-guide?page=${currentPage}&limit=9`);
      const data = await response.json();
      
      if (data.success) {
        setPosts(data.posts);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError(t('careerGuide.errors.loadPosts'));
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(t('careerGuide.errors.fetchPosts'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(currentLocale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const truncateContent = (content, maxLength = 150) => {
    const text = String(content || '').replace(/<[^>]*>/g, '');
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const getPostExcerpt = (post, maxLength = 150) => {
    const rawExcerpt = String(post?.excerpt || '').trim();
    if (rawExcerpt) {
      return rawExcerpt.length > maxLength
        ? `${rawExcerpt.slice(0, maxLength)}...`
        : rawExcerpt;
    }
    return truncateContent(post?.content, maxLength);
  };

  const getPostPath = (post) => `/career-guide/${encodeURIComponent(post?.slug || post?.id)}`;

  const getReadingTime = (content) => {
    const rawText = String(content || '').replace(/<[^>]*>/g, ' ').trim();
    if (!rawText) return t('careerGuide.readingTime.minutes', { count: 1 });
    const words = rawText.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 220));
    return t('careerGuide.readingTime.minutes', { count: minutes });
  };

  const filteredPosts = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase().trim();
    const selectedTopic = TOPIC_FILTERS.find((item) => item.key === activeTopic);

    const list = posts.filter((post) => {
      const title = String(post.title || '').toLowerCase();
      const content = String(post.content || '').toLowerCase();

      const matchesSearch = !normalizedSearch
        || title.includes(normalizedSearch)
        || content.includes(normalizedSearch);

      if (!matchesSearch) return false;
      if (!selectedTopic || selectedTopic.key === 'all') return true;

      const searchableText = `${title} ${content}`;
      return selectedTopic.keywords.some((keyword) => searchableText.includes(keyword));
    });

    return [...list].sort((a, b) => {
      if (sortMode === 'views') {
        return Number(b.views || 0) - Number(a.views || 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [posts, searchTerm, activeTopic, sortMode]);

  const featuredPost = filteredPosts.length > 0 ? filteredPosts[0] : null;
  const secondaryPosts = featuredPost ? filteredPosts.slice(1) : [];
  const totalViews = posts.reduce((sum, post) => sum + Number(post.views || 0), 0);
  const avgViews = posts.length > 0 ? Math.round(totalViews / posts.length) : 0;

  return (
    <div className="career-guide-page">
      <section className="cg-hero">
        <div className="cg-shell cg-hero-grid">
          <div className="cg-hero-content">
            <p className="cg-hero-eyebrow">{t('careerGuide.hero.eyebrow')}</p>
            <h1>{t('careerGuide.hero.title')}</h1>
            <p className="cg-hero-subtitle">
              {t('careerGuide.hero.subtitle')}
            </p>

            <div className="cg-search-wrap">
              <i className="bi bi-search"></i>
              <input
                type="text"
                placeholder={t('careerGuide.search.placeholder')}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="cg-topic-chips" role="group" aria-label={t('careerGuide.topics.ariaLabel')}>
              {TOPIC_FILTERS.map((topic) => (
                <button
                  key={topic.key}
                  type="button"
                  className={`cg-topic-chip ${activeTopic === topic.key ? 'is-active' : ''}`}
                  onClick={() => setActiveTopic(topic.key)}
                  aria-pressed={activeTopic === topic.key}
                >
                  {t(topic.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <aside className="cg-hero-insight" aria-label={t('careerGuide.overview.ariaLabel')}>
            <h2>{t('careerGuide.overview.title')}</h2>
            <ul>
              <li>
                <strong>{posts.length}</strong>
                <span>{t('careerGuide.overview.postsInCurrentPage')}</span>
              </li>
              <li>
                <strong>{avgViews}</strong>
                <span>{t('careerGuide.overview.avgViews')}</span>
              </li>
              <li>
                <strong>{totalPages}</strong>
                <span>{t('careerGuide.overview.totalPages')}</span>
              </li>
            </ul>
          </aside>
        </div>
      </section>

      <div className="cg-shell cg-main-content">
        {loading ? (
          <div className="cg-loading">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">{t('careerGuide.states.loading')}</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger cg-alert">{error}</div>
        ) : (
          <div className="cg-layout">
            <section className="cg-feed" aria-label={t('careerGuide.feed.ariaLabel')}>
              {featuredPost ? (
                <article className="cg-featured-post">
                  <span className="cg-featured-label">{t('careerGuide.feed.featured')}</span>

                  {featuredPost.coverImage && (
                    <div className="cg-featured-cover-wrap">
                      <img
                        src={featuredPost.coverImage}
                        alt={featuredPost.title}
                        className="cg-featured-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <h2 data-i18n-skip="true">
                    <Link to={getPostPath(featuredPost)}>{featuredPost.title}</Link>
                  </h2>

                  {featuredPost.category && <span className="cg-post-category" data-i18n-skip="true">{featuredPost.category}</span>}

                  <p data-i18n-skip="true">{getPostExcerpt(featuredPost, 220)}</p>

                  <div className="cg-featured-meta" data-i18n-skip="true">
                    <span data-i18n-skip="true">
                      <i className="bi bi-person-circle"></i>
                      {featuredPost.authorName || t('careerGuide.meta.anonymous')}
                    </span>
                    <span data-i18n-skip="true">
                      <i className="bi bi-calendar3"></i>
                      {formatDate(featuredPost.createdAt)}
                    </span>
                    <span data-i18n-skip="true">
                      <i className="bi bi-eye"></i>
                      {t('careerGuide.meta.views', { count: featuredPost.views || 0 })}
                    </span>
                    <span data-i18n-skip="true">
                      <i className="bi bi-clock-history"></i>
                      {getReadingTime(featuredPost.content)}
                    </span>
                  </div>

                  <Link to={getPostPath(featuredPost)} className="cg-read-link">
                    {t('careerGuide.actions.readFeatured')}
                    <i className="bi bi-arrow-right"></i>
                  </Link>
                </article>
              ) : (
                <div className="cg-empty-state">
                  <i className="bi bi-inbox"></i>
                  <p>{t('careerGuide.states.noPostsFound')}</p>
                </div>
              )}

              <div className="cg-feed-toolbar">
                <div className="cg-feed-count">
                  <strong>{filteredPosts.length}</strong> {t('careerGuide.feed.matchingPosts')}
                  <span>{t('careerGuide.feed.pageInfo', { current: currentPage, total: totalPages })}</span>
                </div>
                <div className="cg-sort-group" role="group" aria-label={t('careerGuide.sort.ariaLabel')}>
                  <button
                    type="button"
                    className={`cg-sort-btn ${sortMode === 'latest' ? 'is-active' : ''}`}
                    onClick={() => setSortMode('latest')}
                  >
                    {t('careerGuide.sort.latest')}
                  </button>
                  <button
                    type="button"
                    className={`cg-sort-btn ${sortMode === 'views' ? 'is-active' : ''}`}
                    onClick={() => setSortMode('views')}
                  >
                    {t('careerGuide.sort.mostViewed')}
                  </button>
                </div>
              </div>

              {secondaryPosts.length > 0 && (
                <div className="cg-post-grid">
                  {secondaryPosts.map((post) => (
                    <article key={post.id} className="cg-post-card">
                      {post.coverImage && (
                        <div className="cg-post-cover-wrap">
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="cg-post-cover"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {post.category && <span className="cg-post-category" data-i18n-skip="true">{post.category}</span>}

                      <div className="cg-post-meta" data-i18n-skip="true">
                        <span data-i18n-skip="true">
                          <i className="bi bi-person-circle"></i>
                          {post.authorName || t('careerGuide.meta.anonymous')}
                        </span>
                        <span data-i18n-skip="true">
                          <i className="bi bi-calendar3"></i>
                          {formatDate(post.createdAt)}
                        </span>
                      </div>

                      <h3 data-i18n-skip="true">
                        <Link to={getPostPath(post)}>{post.title}</Link>
                      </h3>

                      <p data-i18n-skip="true">{getPostExcerpt(post, 150)}</p>

                      <div className="cg-post-footer" data-i18n-skip="true">
                        <span data-i18n-skip="true">
                          <i className="bi bi-eye"></i>
                          {t('careerGuide.meta.views', { count: post.views || 0 })}
                        </span>
                        <span data-i18n-skip="true">
                          <i className="bi bi-clock-history"></i>
                          {getReadingTime(post.content)}
                        </span>
                      </div>

                      <Link to={getPostPath(post)} className="cg-card-link">
                        {t('careerGuide.actions.viewDetail')}
                        <i className="bi bi-arrow-right"></i>
                      </Link>
                    </article>
                  ))}
                </div>
              )}

            {totalPages > 1 && (
              <div className="cg-pagination-wrapper">
                <nav aria-label={t('careerGuide.pagination.ariaLabel')} className="cg-pagination-nav">
                  <ul className="cg-pagination-list">
                    <li className={`cg-page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="cg-page-link"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <i className="bi bi-chevron-left"></i>
                      </button>
                    </li>

                    {[...Array(totalPages)].map((_, index) => (
                      <li
                        key={index + 1}
                        className={`cg-page-item ${currentPage === index + 1 ? 'active' : ''}`}
                      >
                        <button
                          className="cg-page-link"
                          onClick={() => setCurrentPage(index + 1)}
                        >
                          {index + 1}
                        </button>
                      </li>
                    ))}

                    <li className={`cg-page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="cg-page-link"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}

            </section>

            <aside className="cg-sidebar" aria-label={t('careerGuide.sidebar.ariaLabel')}>
              <div className="cg-sidebar-card">
                <h3>{t('careerGuide.sidebar.roadmapTitle')}</h3>
                <ul>
                  <li>{t('careerGuide.sidebar.roadmapItem1')}</li>
                  <li>{t('careerGuide.sidebar.roadmapItem2')}</li>
                  <li>{t('careerGuide.sidebar.roadmapItem3')}</li>
                  <li>{t('careerGuide.sidebar.roadmapItem4')}</li>
                </ul>
              </div>

              <div className="cg-sidebar-card cg-sidebar-cta">
                <h3>{t('careerGuide.sidebar.exploreJobsTitle')}</h3>
                <p>{t('careerGuide.sidebar.exploreJobsDesc')}</p>
                <div className="cg-sidebar-links">
                  <Link to="/jobs">{t('careerGuide.sidebar.viewJobs')}</Link>
                  <Link to="/create-cv">{t('careerGuide.sidebar.createCvOnline')}</Link>
                </div>
              </div>

              {user && canCreatePost ? (
                <div className="cg-author-actions">
                  <button
                    type="button"
                    className="cg-create-post-btn"
                    onClick={() => navigate('/career-guide/create')}
                  >
                    <i className="bi bi-plus-circle"></i>
                    {t('careerGuide.actions.writePost')}
                  </button>
                  <button
                    type="button"
                    className="cg-manage-post-btn"
                    onClick={() => navigate('/career-guide/my-posts')}
                  >
                    <i className="bi bi-journal-text"></i>
                    {t('careerGuide.actions.managePosts')}
                  </button>
                </div>
              ) : user ? (
                <div className="cg-sidebar-card cg-sidebar-auth">
                  <h3>{t('careerGuide.sidebar.yourPermissionsTitle')}</h3>
                  <p>{t('careerGuide.sidebar.yourPermissionsDesc')}</p>
                </div>
              ) : (
                <div className="cg-sidebar-card cg-sidebar-auth">
                  <h3>{t('careerGuide.sidebar.loginToWriteTitle')}</h3>
                  <p>{t('careerGuide.sidebar.loginToWriteDesc')}</p>
                  <Link to="/login" className="cg-auth-link">{t('careerGuide.actions.loginNow')}</Link>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>

      {user && canCreatePost && (
        <button
          className="cg-fab-create-post"
          onClick={() => navigate('/career-guide/create')}
          title={t('careerGuide.actions.createNewPostTitle')}
        >
          <i className="bi bi-plus-lg"></i>
        </button>
      )}
    </div>
  );
}

export default CareerGuide;
