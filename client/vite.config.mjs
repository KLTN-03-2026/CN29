import { defineConfig, loadEnv, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';

const PROXY_PATHS = [
  '/auth',
  '/api',
  '/users',
  '/applications',
  '/cvs',
  '/images/avatars',
  '/images/company-logos'
];

const normalizeBaseUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(raw)) {
    return raw.replace(/\/+$/, '');
  }

  if (raw.startsWith('//')) {
    return `https:${raw}`.replace(/\/+$/, '');
  }

  if (raw.startsWith('localhost') || raw.startsWith('127.0.0.1')) {
    return `http://${raw}`.replace(/\/+$/, '');
  }

  return `https://${raw}`.replace(/\/+$/, '');
};

const pickClientEnv = (env, mode) => {
  const picked = Object.fromEntries(
    Object.entries(env).filter(([key]) => key.startsWith('REACT_APP_') || key.startsWith('VITE_'))
  );

  picked.NODE_ENV = mode;
  picked.PUBLIC_URL = '';
  return picked;
};

const createProxyConfig = (target) => {
  if (!target) return undefined;

  return Object.fromEntries(
    PROXY_PATHS.map((path) => [
      path,
      {
        target,
        changeOrigin: true,
        secure: false
      }
    ])
  );
};

const jsxInJsSourcePlugin = () => ({
  name: 'jobfinder-jsx-in-js-source',
  enforce: 'pre',
  async transform(code, id) {
    const cleanId = String(id || '').split('?')[0];
    const isSourceJs = /[\\/]src[\\/].*\.js$/.test(cleanId) && !/node_modules/.test(cleanId);
    if (!isSourceJs) return null;

    return transformWithEsbuild(code, cleanId, {
      loader: 'jsx',
      jsx: 'automatic'
    });
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = normalizeBaseUrl(env.REACT_APP_API_BASE || env.VITE_API_BASE || 'http://localhost:3001');
  const clientEnv = pickClientEnv(env, mode);

  return {
    plugins: [
      jsxInJsSourcePlugin(),
      react({
        include: /\.[jt]sx?$/,
        exclude: /node_modules/
      })
    ],
    define: {
      'process.env': clientEnv,
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.PUBLIC_URL': JSON.stringify('')
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx'
        }
      }
    },
    server: {
      proxy: createProxyConfig(apiTarget)
    },
    preview: {
      proxy: createProxyConfig(apiTarget)
    },
    build: {
      outDir: 'build',
      emptyOutDir: true
    }
  };
});
