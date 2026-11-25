import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

const ROOT_DIR = import.meta.dirname;

function smartInventoryAssetsPlugin(apiBaseUrl: string): Plugin {
  const normalizedApiUrl = (apiBaseUrl || '').trim().replace(/\/$/, '');

  return {
    name: 'smart-inventory-static-js',
    configureServer(server) {
      server.middlewares.use('/js/config.js', (_req, res, next) => {
        try {
          const srcPath = path.resolve(ROOT_DIR, 'js/config.js');
          if (!fs.existsSync(srcPath)) return next();
          const raw = fs.readFileSync(srcPath, 'utf8');
          const injected = raw.replace('__VITE_API_BASE_URL__', normalizedApiUrl);
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.end(injected);
        } catch {
          next();
        }
      });
    },
    writeBundle(options) {
      const outDir = options.dir ? path.resolve(options.dir) : path.resolve(ROOT_DIR, 'dist');
      const srcJsDir = path.resolve(ROOT_DIR, 'js');
      const destJsDir = path.join(outDir, 'js');

      if (fs.existsSync(srcJsDir)) {
        fs.mkdirSync(destJsDir, {recursive: true});
        for (const entry of fs.readdirSync(srcJsDir)) {
          if (!entry.endsWith('.js')) continue;
          const srcFile = path.join(srcJsDir, entry);
          const destFile = path.join(destJsDir, entry);
          if (entry === 'config.js') {
            const raw = fs.readFileSync(srcFile, 'utf8');
            fs.writeFileSync(destFile, raw.replace('__VITE_API_BASE_URL__', normalizedApiUrl), 'utf8');
          } else {
            fs.copyFileSync(srcFile, destFile);
          }
        }
      }
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = env.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL || '';

  return {
    plugins: [react(), tailwindcss(), smartInventoryAssetsPlugin(apiBaseUrl)],
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(ROOT_DIR, 'index.html'),
          login: path.resolve(ROOT_DIR, 'login.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(ROOT_DIR, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
