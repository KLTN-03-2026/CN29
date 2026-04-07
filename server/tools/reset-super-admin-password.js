// Usage:
//   node tools/reset-super-admin-password.js --email superadmin@jobfinder.local --password NewPass123
//   node tools/reset-super-admin-password.js --email superadmin@jobfinder.local
//
// If --password is omitted, a strong temporary password is generated and printed.
// You can also pass --database-url to point directly at a TiDB/MySQL connection string.

const crypto = require('crypto');

const cliArgs = process.argv.slice(2);
const cliOptions = {};

for (let i = 0; i < cliArgs.length; i += 1) {
  const arg = cliArgs[i];
  if (!arg.startsWith('--')) continue;

  const equalsIndex = arg.indexOf('=');
  if (equalsIndex !== -1) {
    const key = arg.slice(2, equalsIndex).trim();
    const value = arg.slice(equalsIndex + 1);
    cliOptions[key] = value;
    continue;
  }

  const key = arg.slice(2).trim();
  const nextValue = cliArgs[i + 1];
  if (nextValue && !nextValue.startsWith('--')) {
    cliOptions[key] = nextValue;
    i += 1;
  } else {
    cliOptions[key] = 'true';
  }
}

if (cliOptions['database-url'] && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = cliOptions['database-url'];
}

if (!process.env.DATABASE_URL) {
  console.error('[reset-super-admin] Missing DATABASE_URL. Pass --database-url <tidb-url> or set DATABASE_URL in the environment.');
  process.exit(1);
}

const positionalArgs = cliArgs.filter((arg) => !arg.startsWith('--'));

const bcrypt = require('bcryptjs');
const db = require('../config/db');

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

const ensureColumn = (sql) =>
  new Promise((resolve) => {
    db.run(sql, (err) => {
      if (err && !/duplicate column/i.test(String(err.message || ''))) {
        console.error('[reset-super-admin] schema error:', err.message);
      }
      resolve();
    });
  });

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const validatePassword = (password) => {
  const value = String(password || '').trim();
  if (value.length < 8) {
    throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự.');
  }

  const hasLetter = /[a-zA-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  if (!hasLetter || !hasNumber) {
    throw new Error('Mật khẩu mới phải bao gồm cả chữ và số.');
  }

  return value;
};

const generatePassword = (length = 16) => {
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i += 1) {
    password += PASSWORD_ALPHABET[bytes[i] % PASSWORD_ALPHABET.length];
  }
  return password;
};

async function resetSuperAdminPassword({ email, password } = {}) {
  await ensureColumn('ALTER TABLE NguoiDung ADD COLUMN IsSuperAdmin INTEGER DEFAULT 0');

  const targetEmail = normalizeEmail(email);
  if (!targetEmail) {
    throw new Error('Thiếu email superadmin.');
  }

  const finalPassword = validatePassword(password || generatePassword());
  const hashedPassword = await bcrypt.hash(finalPassword, 10);

  const existingUser = await dbGet('SELECT MaNguoiDung FROM NguoiDung WHERE lower(Email) = ? LIMIT 1', [targetEmail]);

  if (existingUser?.MaNguoiDung) {
    await dbRun(
      `UPDATE NguoiDung
       SET MatKhau = ?, VaiTro = 'Quản trị', TrangThai = 1, IsSuperAdmin = 1,
           NgayCapNhat = datetime('now','localtime')
       WHERE MaNguoiDung = ?`,
      [hashedPassword, existingUser.MaNguoiDung]
    );

    return {
      action: 'updated',
      email: targetEmail,
      password: finalPassword
    };
  }

  await dbRun(
    `INSERT INTO NguoiDung (
      Email, MatKhau, VaiTro, HoTen, TrangThai, IsSuperAdmin
    ) VALUES (?, ?, 'Quản trị', ?, 1, 1)`,
    [targetEmail, hashedPassword, 'Siêu quản trị viên']
  );

  return {
    action: 'created',
    email: targetEmail,
    password: finalPassword
  };
}

async function main() {
  try {
    const email = cliOptions.email || positionalArgs[0] || process.env.SUPER_ADMIN_EMAIL;
    const password = cliOptions.password || positionalArgs[1] || process.env.SUPER_ADMIN_PASSWORD || generatePassword();

    const result = await resetSuperAdminPassword({ email, password });

    console.log(`[reset-super-admin] ${result.action === 'created' ? 'Created' : 'Updated'} account: ${result.email}`);
    console.log(`[reset-super-admin] New password: ${result.password}`);
    console.log('[reset-super-admin] Login with this password, then change it immediately in the app.');
    process.exit(0);
  } catch (err) {
    console.error('[reset-super-admin] failed:', err.message || err);
    process.exit(1);
  }
}

main();
