require('dotenv').config();

const cors = require('cors');
const db = require('./config/sqlite');
const { bootstrapSuperAdmin } = require('./tools/bootstrap-super-admin');

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const { registerRoutes } = require('./routes/registerRoutes');

var app = express();

// Ensure a Super Admin account exists (idempotent)
bootstrapSuperAdmin().catch((err) => {
  console.error('[bootstrap-super-admin] failed:', err.message || err);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Base path prefix (e.g., '/id'). Can be configured via env BASE_PATH
const BASE_PATH = process.env.BASE_PATH || '/';
// Normalize: ensure leading slash, no trailing slash except root
const normalizeBase = (p) => {
  if (!p) return '/';
  if (!p.startsWith('/')) p = '/' + p;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
};
const BASE = normalizeBase(BASE_PATH);

app.use(cors());
app.use(logger('dev'));
// Increase body size limits because CV Online stores rendered HTML in JSON.
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '5mb' }));
app.use(cookieParser());
// Serve static under base path too
app.use(BASE, express.static(path.join(__dirname, 'public')));

// Mount routers under BASE
// Helper to concatenate paths without double slashes
const mountPath = (sub) => BASE === '/' ? sub : BASE + sub;
registerRoutes(app, mountPath);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
