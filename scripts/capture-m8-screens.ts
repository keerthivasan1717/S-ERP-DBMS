import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await wait(300);
  }
  throw new Error(`Server failed to start at ${url} within ${timeoutMs}ms`);
}

async function captureM8Screens() {
  const screensDir = path.resolve(process.cwd(), 'docs/screens/m8');
  if (!fs.existsSync(screensDir)) {
    fs.mkdirSync(screensDir, { recursive: true });
  }

  console.log('Starting S-ERP server on port 3000...');
  const serverProc = spawn('node', ['dist/server/index.js'], {
    env: { ...process.env, PORT: '3000' },
    stdio: 'inherit',
  });

  try {
    await waitForServer('http://localhost:3000/api/health', 15000);
    console.log('Server is healthy! Launching Puppeteer...');

    const browser = await puppeteer.launch({
      headless: 'shell',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 1366, height: 850 },
    });

    const page = await browser.newPage();

    try {
      const loginAs = async (user: string) => {
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        await wait(600);
        await page.waitForSelector('#username', { timeout: 8000 });
        await page.$eval('#username', (el: any) => (el.value = ''));
        await page.type('#username', user);
        await page.$eval('#password', (el: any) => (el.value = ''));
        await page.type('#password', '1234');
        await page.click('button[type="submit"]');
        await page.waitForSelector('header', { timeout: 8000 });
        await wait(1200);
      };

      const logout = async () => {
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('header button')).find(
            (b) => b.textContent?.includes('Sign out')
          ) as HTMLElement;
          if (btn) btn.click();
        });
        await page.waitForSelector('#username', { timeout: 8000 });
        await wait(500);
      };

      // 1. Strategic Dashboard
      console.log('1. Logging in as Strategic Manager & Capturing 01_strategic_dashboard.png...');
      await loginAs('strategic');
      await page.screenshot({ path: path.join(screensDir, '01_strategic_dashboard.png') });

      // 2. Open Dual-Engine Inspector
      console.log('2. Opening Dual-Engine Inspector & Capturing 04_dual_engine_inspector.png...');
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          (b) => b.textContent?.includes('Dual-Engine Parity Inspector')
        ) as HTMLElement;
        if (btn) btn.click();
      });
      await wait(1000);
      await page.screenshot({ path: path.join(screensDir, '04_dual_engine_inspector.png') });

      // Close inspector
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          (b) => b.textContent === 'Close'
        ) as HTMLElement;
        if (btn) btn.click();
      });
      await wait(500);
      await logout();

      // 3. Tactical Dashboard & Workload
      console.log('3. Logging in as Tactical Manager & Capturing 02_tactical_dashboard_workload.png...');
      await loginAs('tactical');
      await page.screenshot({ path: path.join(screensDir, '02_tactical_dashboard_workload.png') });
      await logout();

      // 4. Operational Dashboard
      console.log('4. Logging in as Operator & Capturing 03_operational_dashboard.png...');
      await loginAs('operator');
      await page.screenshot({ path: path.join(screensDir, '03_operational_dashboard.png') });

      console.log('Successfully captured all M8 screenshots into docs/screens/m8/!');
      await browser.close();
    } catch (err) {
      await browser.close();
      throw err;
    }
  } finally {
    serverProc.kill();
  }
}

captureM8Screens()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

