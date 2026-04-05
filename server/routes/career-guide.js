const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const articleSamples = require('../mocks/articleSamples');

const getSortedSamples = () => [...articleSamples]
  .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

const mapSamplePost = (sample) => ({
  id: sample.id,
  slug: sample.slug,
  title: sample.title,
  excerpt: sample.excerpt,
  category: sample.category,
  tags: sample.tags,
  coverImage: sample.coverImage,
  content: sample.content,
  authorId: 0,
  authorType: 'admin',
  createdAt: sample.publishedAt,
  updatedAt: sample.publishedAt,
  views: Number(sample.views || 0),
  authorName: sample.author || 'Ban biên tập JobFinder',
  isSample: true
});

const findSamplePost = (idOrSlug) => articleSamples.find((sample) => (
  String(sample.id) === String(idOrSlug) || sample.slug === idOrSlug
));

// Get all career guide posts with pagination
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    // Get total count
    db.get('SELECT COUNT(*) as total FROM CamNangNgheNghiep', [], (err, countRow) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Lỗi database' });
      }

      if (!countRow?.total) {
        const samples = getSortedSamples();
        const pagedSamples = samples.slice(offset, offset + limit).map(mapSamplePost);

        return res.json({
          success: true,
          posts: pagedSamples,
          pagination: {
            page,
            limit,
            total: samples.length,
            totalPages: Math.max(1, Math.ceil(samples.length / limit))
          }
        });
      }

      // Get posts with author info
      const sql = `
        SELECT 
          cg.MaBaiViet as id,
          cg.TieuDe as title,
          cg.NoiDung as content,
          cg.MaTacGia as authorId,
          cg.LoaiTacGia as authorType,
          cg.NgayTao as createdAt,
          cg.NgayCapNhat as updatedAt,
          cg.LuotXem as views,
          NULL as slug,
          NULL as excerpt,
          NULL as category,
          NULL as tags,
          NULL as coverImage,
          0 as isSample,
          CASE 
            WHEN cg.LoaiTacGia = 'candidate' THEN COALESCE(u.HoTen, 'Ẩn danh')
            WHEN cg.LoaiTacGia = 'employer' THEN COALESCE(ntd.TenCongTy, u.HoTen, 'Nhà tuyển dụng')
            ELSE 'Admin'
          END as authorName
        FROM CamNangNgheNghiep cg
        LEFT JOIN NguoiDung u ON cg.MaTacGia = u.MaNguoiDung
        LEFT JOIN NhaTuyenDung ntd ON ntd.MaNguoiDung = u.MaNguoiDung
        ORDER BY cg.NgayTao DESC
        LIMIT ? OFFSET ?
      `;

      db.all(sql, [limit, offset], (err, rows) => {
        if (err) {
          return res.status(500).json({ success: false, error: 'Lỗi database' });
        }

        res.json({
          success: true,
          posts: rows,
          pagination: {
            page,
            limit,
            total: countRow.total,
            totalPages: Math.ceil(countRow.total / limit)
          }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single post with comments
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      cg.MaBaiViet as id,
      cg.TieuDe as title,
      cg.NoiDung as content,
      cg.MaTacGia as authorId,
      cg.LoaiTacGia as authorType,
      cg.NgayTao as createdAt,
      cg.NgayCapNhat as updatedAt,
      cg.LuotXem as views,
      NULL as slug,
      NULL as excerpt,
      NULL as category,
      NULL as tags,
      NULL as coverImage,
      0 as isSample,
      CASE 
        WHEN cg.LoaiTacGia = 'candidate' THEN COALESCE(u.HoTen, 'Ẩn danh')
        WHEN cg.LoaiTacGia = 'employer' THEN COALESCE(ntd.TenCongTy, u.HoTen, 'Nhà tuyển dụng')
        ELSE 'Admin'
      END as authorName
    FROM CamNangNgheNghiep cg
    LEFT JOIN NguoiDung u ON cg.MaTacGia = u.MaNguoiDung
    LEFT JOIN NhaTuyenDung ntd ON ntd.MaNguoiDung = u.MaNguoiDung
    WHERE cg.MaBaiViet = ?
  `;

  db.get(sql, [id], (err, post) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Lỗi database' });
    }

    if (!post) {
      const samplePost = findSamplePost(id);
      if (!samplePost) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });
      }

      return res.json({
        success: true,
        post: mapSamplePost(samplePost),
        comments: []
      });
    }

    // Update view count
    db.run('UPDATE CamNangNgheNghiep SET LuotXem = LuotXem + 1 WHERE MaBaiViet = ?', [id]);

    // Get comments
    const commentSql = `
      SELECT 
        cgc.MaBinhLuan as id,
        cgc.NoiDung as content,
        cgc.MaNguoiDung as userId,
        cgc.LoaiNguoiDung as userType,
        cgc.NgayTao as createdAt,
        CASE 
          WHEN cgc.LoaiNguoiDung = 'candidate' THEN COALESCE(u.HoTen, 'Ẩn danh')
          WHEN cgc.LoaiNguoiDung = 'employer' THEN COALESCE(ntd.TenCongTy, u.HoTen, 'Nhà tuyển dụng')
          ELSE 'Admin'
        END as userName
      FROM BinhLuanCamNangNgheNghiep cgc
      LEFT JOIN NguoiDung u ON cgc.MaNguoiDung = u.MaNguoiDung
      LEFT JOIN NhaTuyenDung ntd ON ntd.MaNguoiDung = u.MaNguoiDung
      WHERE cgc.MaBaiViet = ?
      ORDER BY cgc.NgayTao DESC
    `;

    db.all(commentSql, [id], (err, comments) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Lỗi khi tải bình luận' });
      }

      res.json({
        success: true,
        post: { ...post, views: post.views + 1 },
        comments: comments || []
      });
    });
  });
});

// Create new post (authenticated)
router.post('/', authenticateToken, (req, res) => {
  const { title, content } = req.body;
  
  // Get user info from JWT token
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // Determine userType based on role
  let userType = 'candidate';
  if (userRole === 'Nhà tuyển dụng') {
    userType = 'employer';
  } else if (userRole === 'Quản trị' || userRole === 'Siêu quản trị viên') {
    userType = 'admin';
  }

  if (!title || !content) {
    return res.status(400).json({ success: false, error: 'Thiếu thông tin bài viết' });
  }

  const sql = `
    INSERT INTO CamNangNgheNghiep (TieuDe, NoiDung, MaTacGia, LoaiTacGia, NgayTao, NgayCapNhat, LuotXem)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), 0)
  `;

  db.run(sql, [title, content, userId, userType], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: 'Lỗi khi tạo bài viết' });
    }

    res.json({ success: true, postId: this.lastID, message: 'Đăng bài thành công' });
  });
});

// Add comment (authenticated)
router.post('/:id/comments', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  
  // Get user info from JWT token
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // Determine userType based on role
  let userType = 'candidate';
  if (userRole === 'Nhà tuyển dụng') {
    userType = 'employer';
  } else if (userRole === 'Quản trị' || userRole === 'Siêu quản trị viên') {
    userType = 'admin';
  }

  if (!content) {
    return res.status(400).json({ success: false, error: 'Nội dung bình luận không được để trống' });
  }

  const sql = `
    INSERT INTO BinhLuanCamNangNgheNghiep (MaBaiViet, MaNguoiDung, LoaiNguoiDung, NoiDung, NgayTao)
    VALUES (?, ?, ?, ?, datetime('now'))
  `;

  db.run(sql, [id, userId, userType, content], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: 'Lỗi khi thêm bình luận' });
    }

    res.json({ success: true, commentId: this.lastID, message: 'Bình luận thành công' });
  });
});

// Delete post (admin or author)
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  // Get user info from JWT token
  const userId = req.user.id;
  const userRole = req.user.role;
  const isAdmin = userRole === 'Quản trị' || userRole === 'Siêu quản trị viên';
  
  // Determine userType based on role
  let userType = 'candidate';
  if (userRole === 'Nhà tuyển dụng') {
    userType = 'employer';
  } else if (isAdmin) {
    userType = 'admin';
  }

  // Check if user is author or admin
  const checkSql = 'SELECT MaTacGia as authorId, LoaiTacGia as authorType FROM CamNangNgheNghiep WHERE MaBaiViet = ?';
  
  db.get(checkSql, [id], (err, post) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Lỗi database' });
    }

    if (!post) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });
    }

    const isAuthor = Number(post.authorId) === Number(userId) && post.authorType === userType;
    
    if (!isAdmin && !isAuthor) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền xóa bài viết này' });
    }

    // Delete comments first
    db.run('DELETE FROM BinhLuanCamNangNgheNghiep WHERE MaBaiViet = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Lỗi khi xóa bình luận' });
      }

      // Delete post
      db.run('DELETE FROM CamNangNgheNghiep WHERE MaBaiViet = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ success: false, error: 'Lỗi khi xóa bài viết' });
        }
        res.json({ success: true, message: 'Xóa bài viết thành công' });
      });
    });
  });
});

// Delete comment (admin or author)
router.delete('/:postId/comments/:commentId', authenticateToken, (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;
  const isAdmin = userRole === 'Quản trị' || userRole === 'Siêu quản trị viên';

  let userType = 'candidate';
  if (userRole === 'Nhà tuyển dụng') {
    userType = 'employer';
  } else if (isAdmin) {
    userType = 'admin';
  }

  const checkSql = 'SELECT MaNguoiDung as userId, LoaiNguoiDung as userType FROM BinhLuanCamNangNgheNghiep WHERE MaBinhLuan = ?';
  
  db.get(checkSql, [commentId], (err, comment) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Lỗi database' });
    }

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy bình luận' });
    }

    const isAuthor = Number(comment.userId) === Number(userId) && comment.userType === userType;
    
    if (!isAdmin && !isAuthor) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền xóa bình luận này' });
    }

    db.run('DELETE FROM BinhLuanCamNangNgheNghiep WHERE MaBinhLuan = ?', [commentId], function(err) {
      if (err) {
        return res.status(500).json({ success: false, error: 'Lỗi khi xóa bình luận' });
      }

      res.json({ success: true, message: 'Xóa bình luận thành công' });
    });
  });
});

module.exports = router;
