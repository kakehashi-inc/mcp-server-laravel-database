import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    target: 'node22',
    ssr: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: [
        /^@modelcontextprotocol/,
        'dotenv',
        'mysql2',
        'pg',
        'mariadb',
        'better-sqlite3',
        'ssh2',
        'yargs',
        'winston',
        /^node:/
      ],
      output: {
        banner: '#!/usr/bin/env node\n'
      }
    }
  }
});
