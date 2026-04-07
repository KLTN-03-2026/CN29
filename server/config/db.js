const mysql = require('mysql2/promise');

const databaseUrl = process.env.DATABASE_URL || '';
const useMysql = /^mysql:\/\//i.test(databaseUrl);

const normalizeSql = (sql) => {
  let normalized = String(sql || '');

  normalized = normalized.replace(/\bINSERT\s+OR\s+REPLACE\s+INTO\b/gi, 'REPLACE INTO');
  normalized = normalized.replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/gi, 'INSERT IGNORE INTO');
  normalized = normalized.replace(/datetime\(\s*['"]now['"]\s*,\s*['"]localtime['"]\s*\)/gi, 'NOW()');
  normalized = normalized.replace(/datetime\(\s*['"]now['"]\s*\)/gi, 'NOW()');
  normalized = normalized.replace(/datetime\(\s*([A-Za-z0-9_$.]+)\s*\)/gi, '$1');

  return normalized;
};

const normalizeParams = (params, callback) => {
  if (typeof params === 'function') {
    return { params: [], callback: params };
  }

  if (params == null) {
    return { params: [], callback };
  }

  return { params: Array.isArray(params) ? params : [params], callback };
};

const normalizeBindValue = (value) => (typeof value === 'undefined' ? null : value);

if (!useMysql) {
  const sqliteDb = require('./sqlite');

  module.exports = {
    get: (...args) => sqliteDb.get(...args),
    all: (...args) => sqliteDb.all(...args),
    run: (...args) => sqliteDb.run(...args),
    serialize: (fn) => {
      if (typeof fn === 'function') fn();
    },
    close: () => {}
  };
  return;
}

const url = new URL(databaseUrl);
const sslaccept = url.searchParams.get('sslaccept') || url.searchParams.get('ssl');
const ssl = sslaccept === 'strict' ? { rejectUnauthorized: true } : { rejectUnauthorized: true };

const pool = mysql.createPool({
  host: url.hostname,
  port: url.port ? Number(url.port) : 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.replace(/^\/+/, '')),
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
  ssl,
  multipleStatements: false
});

const HO_SO_UNG_VIEN_TABLE = 'HoSoUngVien';
const HO_SO_JSON_COLUMN_MAPPINGS = [
  { english: 'EducationListJson', vietnamese: 'DanhSachHocVanJson' },
  { english: 'WorkListJson', vietnamese: 'DanhSachKinhNghiemJson' },
  { english: 'LanguageListJson', vietnamese: 'DanhSachNgoaiNguJson' }
];

const quoteIdentifier = (value) => `\`${String(value || '').replace(/`/g, '``')}\``;

const ensureCandidateProfileJsonColumns = async () => {
  const [tableRows] = await pool.query(
    'SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1',
    [HO_SO_UNG_VIEN_TABLE]
  );

  if (!Array.isArray(tableRows) || tableRows.length === 0) {
    return;
  }

  const [columnRows] = await pool.query(
    'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [HO_SO_UNG_VIEN_TABLE]
  );

  const existingColumns = new Set(
    (Array.isArray(columnRows) ? columnRows : [])
      .map((row) => String(row?.COLUMN_NAME || '').trim())
      .filter(Boolean)
  );

  for (const mapping of HO_SO_JSON_COLUMN_MAPPINGS) {
    const hasVietnamese = existingColumns.has(mapping.vietnamese);
    const hasEnglish = existingColumns.has(mapping.english);

    if (!hasVietnamese && hasEnglish) {
      await pool.query(
        `ALTER TABLE ${quoteIdentifier(HO_SO_UNG_VIEN_TABLE)} CHANGE COLUMN ${quoteIdentifier(mapping.english)} ${quoteIdentifier(mapping.vietnamese)} LONGTEXT NULL`
      );
      existingColumns.delete(mapping.english);
      existingColumns.add(mapping.vietnamese);
      continue;
    }

    if (!hasVietnamese && !hasEnglish) {
      await pool.query(
        `ALTER TABLE ${quoteIdentifier(HO_SO_UNG_VIEN_TABLE)} ADD COLUMN ${quoteIdentifier(mapping.vietnamese)} LONGTEXT NULL`
      );
      existingColumns.add(mapping.vietnamese);
      continue;
    }

    if (hasVietnamese && hasEnglish) {
      await pool.query(
        `UPDATE ${quoteIdentifier(HO_SO_UNG_VIEN_TABLE)}
         SET ${quoteIdentifier(mapping.vietnamese)} = COALESCE(NULLIF(${quoteIdentifier(mapping.vietnamese)}, ''), ${quoteIdentifier(mapping.english)})
         WHERE (${quoteIdentifier(mapping.vietnamese)} IS NULL OR ${quoteIdentifier(mapping.vietnamese)} = '')
           AND ${quoteIdentifier(mapping.english)} IS NOT NULL`
      );
    }
  }
};

let ensureMysqlSchemaPromise = null;
const ensureMysqlSchemaReady = async () => {
  if (!ensureMysqlSchemaPromise) {
    ensureMysqlSchemaPromise = (async () => {
      try {
        await ensureCandidateProfileJsonColumns();
      } catch (err) {
        console.warn('[db] Skip MySQL schema normalization:', err?.message || err);
      }
    })();
  }

  return ensureMysqlSchemaPromise;
};

const getRows = async (sql, params = []) => {
  await ensureMysqlSchemaReady();
  const safeParams = Array.isArray(params) ? params.map(normalizeBindValue) : params;
  const [rows] = await pool.query(normalizeSql(sql), safeParams);
  return rows;
};

const runStatement = async (sql, params = []) => {
  await ensureMysqlSchemaReady();
  const safeParams = Array.isArray(params) ? params.map(normalizeBindValue) : params;
  const [result] = await pool.execute(normalizeSql(sql), safeParams);
  return {
    lastID: result?.insertId || 0,
    changes: result?.affectedRows || 0
  };
};

const db = {
  get(sql, params, callback) {
    const normalized = normalizeParams(params, callback);
    const promise = getRows(sql, normalized.params).then((rows) => rows[0] || null);

    if (typeof normalized.callback === 'function') {
      promise.then((row) => normalized.callback(null, row)).catch((err) => normalized.callback(err));
      return;
    }

    return promise;
  },

  all(sql, params, callback) {
    const normalized = normalizeParams(params, callback);
    const promise = getRows(sql, normalized.params);

    if (typeof normalized.callback === 'function') {
      promise.then((rows) => normalized.callback(null, rows)).catch((err) => normalized.callback(err));
      return;
    }

    return promise;
  },

  run(sql, params, callback) {
    const normalized = normalizeParams(params, callback);
    const promise = runStatement(sql, normalized.params);

    if (typeof normalized.callback === 'function') {
      promise
        .then((result) => normalized.callback.call(result, null))
        .catch((err) => normalized.callback(err));
      return;
    }

    return promise;
  },

  serialize(fn) {
    if (typeof fn === 'function') fn();
  },

  close() {
    return undefined;
  }
};

module.exports = db;