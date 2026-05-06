/**
 * Shared activity-log helper. Writes a row into the NhatKyQuanTri table
 * (re-used as the unified "Nhật ký hoạt động") whenever a user performs
 * a meaningful action — posting a job, replying to a message, etc.
 *
 * Other route files import `logActivity` and fire-and-forget; failures
 * are swallowed so audit failures never break the user-facing request.
 *
 * Schema reminder (NhatKyQuanTri):
 *   MaNhatKyQuanTri  PK auto increment
 *   MaNguoiDung      INT, the actor
 *   HanhDong         TEXT, Vietnamese label e.g. "Đăng bài viết hướng nghiệp"
 *   LoaiDoiTuong     TEXT, e.g. "BaiVietHuongNghiep" / "TinTuyenDung"
 *   MaDoiTuong       INT, id of the affected entity
 *   ThoiGianThaoTac  DATETIME
 */
const db = require('../config/db');

const dbRun = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });

const isMysql = /^mysql:\/\//i.test(process.env.DATABASE_URL || '');
const nowSql = isMysql ? 'NOW()' : "datetime('now', 'localtime')";

const toNumberOrNull = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

/**
 * Insert a row into NhatKyQuanTri. Resolves on success, never throws.
 * @param {Object} payload
 * @param {number|string} [payload.userId]    Actor id (the user performing the action).
 * @param {number|string} [payload.adminId]   Fallback id when userId is missing.
 * @param {string}        payload.action       Vietnamese action label.
 * @param {string}        payload.entityType   Entity type (e.g. "TinTuyenDung").
 * @param {number|string} [payload.entityId]   Affected entity id.
 */
const logActivity = async (payload = {}) => {
    try {
        const action = String(payload.action || '').trim();
        const entityType = String(payload.entityType || payload.object || '').trim();
        if (!action || !entityType) return;

        const userId = toNumberOrNull(payload.userId) ?? toNumberOrNull(payload.adminId);
        const entityId = toNumberOrNull(payload.entityId) ?? toNumberOrNull(payload.objectId);

        await dbRun(
            `INSERT INTO NhatKyQuanTri (MaNguoiDung, HanhDong, LoaiDoiTuong, MaDoiTuong, ThoiGianThaoTac)
             VALUES (?, ?, ?, ?, ${nowSql})`,
            [userId, action, entityType, entityId]
        );
    } catch (err) {
        console.warn('[activityLog] failed:', err?.message || err);
    }
};

module.exports = { logActivity };
