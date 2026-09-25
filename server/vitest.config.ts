import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 30000,
    // Database uji terpisah dari dev.db supaya menjalankan test tidak pernah
    // menyentuh data penelitian yang sedang dikumpulkan.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      ADMIN_API_KEY: 'kunci-admin-untuk-pengujian-1234',
      CORS_ORIGIN: 'http://localhost:5173',
    },
    globalSetup: ['tests/setup/globalSetup.ts'],
    // Uji integrasi menulis ke satu berkas SQLite; dijalankan berurutan agar
    // tidak saling mengunci database.
    fileParallelism: false,
  },
});
