-- TiDB schema refactor script (2026-04-17)
-- Purpose:
-- 1) Normalize NhatKyQuanTri columns to Ma... naming.
-- 2) Drop unneeded columns requested by product.
--
-- Notes:
-- - Run this script in the target database context.
-- - Script is idempotent: each step checks current schema before applying.

SET @schema_name = DATABASE();

-- ------------------------------------------------------------
-- 2) Normalize NhatKyQuanTri columns
-- ------------------------------------------------------------
SET @table_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'NhatKyQuanTri'
);

SET @old_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'NhatKyQuanTri' AND COLUMN_NAME = 'id'
);
SET @new_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'NhatKyQuanTri' AND COLUMN_NAME = 'MaNhatKyQuanTri'
);
SET @sql = IF(
  @table_exists > 0 AND @old_exists > 0 AND @new_exists = 0,
  'ALTER TABLE `NhatKyQuanTri` CHANGE COLUMN `id` `MaNhatKyQuanTri` INT NOT NULL AUTO_INCREMENT',
  'SELECT "skip: id -> MaNhatKyQuanTri"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @old_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'NhatKyQuanTri' AND COLUMN_NAME = 'user_id'
);
SET @new_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'NhatKyQuanTri' AND COLUMN_NAME = 'MaNguoiDung'
);
SET @sql = IF(
  @table_exists > 0 AND @old_exists > 0 AND @new_exists = 0,
  'ALTER TABLE `NhatKyQuanTri` CHANGE COLUMN `user_id` `MaNguoiDung` INT NULL',
  'SELECT "skip: user_id -> MaNguoiDung"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @old_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'NhatKyQuanTri' AND COLUMN_NAME = 'action'
);
SET @new_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'NhatKyQuanTri' AND COLUMN_NAME = 'HanhDong'
);
SET @sql = IF(
  @table_exists > 0 AND @old_exists > 0 AND @new_exists = 0,
  'ALTER TABLE `NhatKyQuanTri` CHANGE COLUMN `action` `HanhDong` VARCHAR(100) NULL',
  'SELECT "skip: action -> HanhDong"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @old_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'NhatKyQuanTri' AND COLUMN_NAME = 'entity_type'
);
SET @new_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'NhatKyQuanTri' AND COLUMN_NAME = 'LoaiDoiTuong'
);
SET @sql = IF(
  @table_exists > 0 AND @old_exists > 0 AND @new_exists = 0,
  'ALTER TABLE `NhatKyQuanTri` CHANGE COLUMN `entity_type` `LoaiDoiTuong` VARCHAR(100) NULL',
  'SELECT "skip: entity_type -> LoaiDoiTuong"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @old_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'NhatKyQuanTri' AND COLUMN_NAME = 'entity_id'
);
SET @new_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'NhatKyQuanTri' AND COLUMN_NAME = 'MaDoiTuong'
);
SET @sql = IF(
  @table_exists > 0 AND @old_exists > 0 AND @new_exists = 0,
  'ALTER TABLE `NhatKyQuanTri` CHANGE COLUMN `entity_id` `MaDoiTuong` INT NULL',
  'SELECT "skip: entity_id -> MaDoiTuong"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @old_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'NhatKyQuanTri' AND COLUMN_NAME = 'timestamp'
);
SET @new_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'NhatKyQuanTri' AND COLUMN_NAME = 'ThoiGianThaoTac'
);
SET @sql = IF(
  @table_exists > 0 AND @old_exists > 0 AND @new_exists = 0,
  'ALTER TABLE `NhatKyQuanTri` CHANGE COLUMN `timestamp` `ThoiGianThaoTac` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
  'SELECT "skip: timestamp -> ThoiGianThaoTac"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Reconcile index names in NhatKyQuanTri
SET @new_idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'NhatKyQuanTri'
    AND INDEX_NAME = 'IDX_NhatKyQuanTri_MaNguoiDung'
);
SET @sql = IF(
  @table_exists > 0 AND @new_idx_exists = 0,
  'ALTER TABLE `NhatKyQuanTri` ADD INDEX `IDX_NhatKyQuanTri_MaNguoiDung` (`MaNguoiDung`)',
  'SELECT "skip: add IDX_NhatKyQuanTri_MaNguoiDung"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @new_idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'NhatKyQuanTri'
    AND INDEX_NAME = 'IDX_NhatKyQuanTri_ThoiGianThaoTac'
);
SET @sql = IF(
  @table_exists > 0 AND @new_idx_exists = 0,
  'ALTER TABLE `NhatKyQuanTri` ADD INDEX `IDX_NhatKyQuanTri_ThoiGianThaoTac` (`ThoiGianThaoTac`)',
  'SELECT "skip: add IDX_NhatKyQuanTri_ThoiGianThaoTac"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @old_idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'NhatKyQuanTri'
    AND INDEX_NAME = 'IDX_NhatKyQuanTri_user_id'
);
SET @sql = IF(
  @old_idx_exists > 0,
  'ALTER TABLE `NhatKyQuanTri` DROP INDEX `IDX_NhatKyQuanTri_user_id`',
  'SELECT "skip: drop IDX_NhatKyQuanTri_user_id"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @old_idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'NhatKyQuanTri'
    AND INDEX_NAME = 'IDX_NhatKyQuanTri_timestamp'
);
SET @sql = IF(
  @old_idx_exists > 0,
  'ALTER TABLE `NhatKyQuanTri` DROP INDEX `IDX_NhatKyQuanTri_timestamp`',
  'SELECT "skip: drop IDX_NhatKyQuanTri_timestamp"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 3) Drop unneeded columns
-- ------------------------------------------------------------
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'HoSoUngVien' AND COLUMN_NAME = 'DanhSachHocVanJson'
);
SET @sql = IF(
  @col_exists > 0,
  'ALTER TABLE `HoSoUngVien` DROP COLUMN `DanhSachHocVanJson`',
  'SELECT "skip: drop HoSoUngVien.DanhSachHocVanJson"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'HoSoUngVien' AND COLUMN_NAME = 'DanhSachKinhNghiemJson'
);
SET @sql = IF(
  @col_exists > 0,
  'ALTER TABLE `HoSoUngVien` DROP COLUMN `DanhSachKinhNghiemJson`',
  'SELECT "skip: drop HoSoUngVien.DanhSachKinhNghiemJson"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'HoSoUngVien' AND COLUMN_NAME = 'DanhSachNgoaiNguJson'
);
SET @sql = IF(
  @col_exists > 0,
  'ALTER TABLE `HoSoUngVien` DROP COLUMN `DanhSachNgoaiNguJson`',
  'SELECT "skip: drop HoSoUngVien.DanhSachNgoaiNguJson"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'HoSoUngVien' AND COLUMN_NAME = 'SoNamKinhNghiem'
);
SET @sql = IF(
  @col_exists > 0,
  'ALTER TABLE `HoSoUngVien` DROP COLUMN `SoNamKinhNghiem`',
  'SELECT "skip: drop HoSoUngVien.SoNamKinhNghiem"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'UngTuyen' AND COLUMN_NAME = 'ThuGioiThieu'
);
SET @sql = IF(
  @col_exists > 0,
  'ALTER TABLE `UngTuyen` DROP COLUMN `ThuGioiThieu`',
  'SELECT "skip: drop UngTuyen.ThuGioiThieu"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'TinNhan' AND COLUMN_NAME = 'DaDoc'
);
SET @sql = IF(
  @col_exists > 0,
  'ALTER TABLE `TinNhan` DROP COLUMN `DaDoc`',
  'SELECT "skip: drop TinNhan.DaDoc"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Completed.
SELECT 'TiDB schema refactor completed.' AS result;
