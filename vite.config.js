import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import checker from 'vite-plugin-checker';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '.env') });

const jsxInJsPlugin = () => ({
  name: 'jsx-in-js',
  enforce: 'pre',
  async transform(code, id) {
    if (!id.includes('/src/') || !id.endsWith('.js') || id.includes('node_modules')) {
      return null;
    }
    if (!/<[A-Za-z/!]/.test(code)) {
      return null;
    }

    const result = await transform(code, {
      loader: 'jsx',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      sourcemap: true,
    });

    let output = result.code;
    if (!/\bimport\s+React\b/.test(code) && /\bReact\.(createElement|Fragment)\b/.test(output)) {
      output = `import React from 'react';\n${output}`;
    }

    return { code: output, map: result.map || null };
  },
});

const buildProcessEnvDefines = (mode) => {
  const fileEnv = loadEnv(mode, __dirname, 'REACT_APP_');
  const env = { ...fileEnv };
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('REACT_APP_') && value !== undefined) {
      env[key] = value;
    }
  }
  return Object.fromEntries(Object.entries(env).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value ?? '')]));
};

const resolveHttpsConfig = () => {
  if (process.env.HTTPS !== 'true') return undefined;

  const keyPath = path.resolve(__dirname, process.env.SSL_KEY_FILE || './localhost+2-key.pem');
  const certPath = path.resolve(__dirname, process.env.SSL_CRT_FILE || './localhost+2.pem');
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.warn('HTTPS enabled but SSL certificate files were not found. Falling back to HTTP.');
    return undefined;
  }
  return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
};

export default defineConfig(({ mode }) => ({
  plugins: [
    jsxInJsPlugin(),
    react(),
    mode !== 'test' && checker({
      eslint: {
        lintCommand: 'eslint "./src/**/*.{js,jsx,ts,tsx}" --ignore-pattern "**/*.test.js" --ignore-pattern "**/*.test.jsx" --ignore-pattern "**/*.test.ts" --ignore-pattern "**/*.test.tsx" --ignore-pattern "**/setupTests.js" --quiet',
      },
      overlay: { initialIsOpen: false },
      enableBuild: false,
      terminal: true,
    }),
  ].filter(Boolean),
  optimizeDeps: { rolldownOptions: { moduleTypes: { '.js': 'jsx' } } },
  define: buildProcessEnvDefines(mode),
  envPrefix: 'REACT_APP_',
  resolve: { extensions: ['.mjs', '.js', '.ts', '.tsx', '.jsx', '.json'] },
  publicDir: 'public',
  server: {
    host: true,
    port: Number(process.env.PORT) || 3000,
    https: resolveHttpsConfig(),
    open: false,
    watch: { ignored: ['**/coverage/**'] },
  },
  build: { outDir: 'build', sourcemap: true },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    css: true,
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    server: { deps: { inline: [/src\/config\/admin\//] } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: { lines: 80 },
    },
  },
}));
