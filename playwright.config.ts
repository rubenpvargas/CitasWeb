import { defineConfig, devices } from '@playwright/test';

/**
 * E2E contra la SPA desplegada y una citas-api real sembrada por Flyway V5.
 * - E2E_BASE_URL: URL de la SPA (por defecto http://localhost:5173). La SPA
 *   obtiene la URL de la API de su propio assets/runtime-config.json.
 * - E2E_DEMO_PASSWORD: contraseña de los usuarios demo de V5 (obligatoria;
 *   nunca se versiona).
 * Los escenarios comparten datos de la API, por eso se ejecutan en serie.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.e2e\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:5173',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
