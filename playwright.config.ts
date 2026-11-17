import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  workers: 1,
  timeout: 150_000,
  use: {
    baseURL: 'http://127.0.0.1:5173/Dexters_Sanctum/',
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH,
      args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
    },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --strictPort',
    url: 'http://127.0.0.1:5173/Dexters_Sanctum/',
    reuseExistingServer: !process.env.CI,
  },
});
