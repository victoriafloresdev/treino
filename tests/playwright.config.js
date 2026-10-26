import { defineConfig } from '@playwright/test';

// Serve a raiz do app (pasta acima de tests/) com tests/serve.js e roda no Chromium e no WebKit.
export default defineConfig({
  testDir: './e2e',
  outputDir: './output/results',
  fullyParallel: true,
  workers: 4,
  timeout: 120000,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:8123', serviceWorkers: 'block' },
  // Chromium (exigido pelo CLAUDE.md) e WebKit, o motor do Safari do iPhone
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit', isMobile: true, hasTouch: true, deviceScaleFactor: 3 } }
  ],
  webServer: {
    command: 'node serve.js 8123',
    url: 'http://localhost:8123/index.html',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'ignore'
  }
});
