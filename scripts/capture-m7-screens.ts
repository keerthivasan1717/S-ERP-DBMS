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

async function captureM7Screens() {
  const screensDir = path.resolve(process.cwd(), 'docs/screens/m7');
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
      defaultViewport: { width: 1366, height: 820 },
    });

    const page = await browser.newPage();

    try {
      // Login as Tactical Manager
      console.log('Logging in as Tactical Manager...');
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
      await wait(500);
      await page.$eval('#username', (el: any) => (el.value = ''));
      await page.type('#username', 'tactical');
      await page.$eval('#password', (el: any) => (el.value = ''));
      await page.type('#password', '1234');
      await page.click('button[type="submit"]');
      await page.waitForSelector('header', { timeout: 8000 });
      await wait(1000);

      const navigateTo = async (text: string) => {
        await page.evaluate((t) => {
          const items = Array.from(document.querySelectorAll('aside div'));
          const target = items.find((el) => el.textContent?.trim() === t) as HTMLElement;
          if (target) target.click();
        }, text);
        await wait(1000);
      };

      // 1. Business Processes
      console.log('1. Capturing 01_business_processes_resources.png...');
      await navigateTo('Business Processes');
      await page.screenshot({ path: path.join(screensDir, '01_business_processes_resources.png') });

      // 2. Resources Inventory
      console.log('2. Capturing 02_resources_inventory.png...');
      await navigateTo('Resources');
      await page.screenshot({ path: path.join(screensDir, '02_resources_inventory.png') });

      // 3. Decisions Log
      console.log('3. Capturing 03_decisions_governance_log.png...');
      await navigateTo('Decision Log');
      await page.screenshot({ path: path.join(screensDir, '03_decisions_governance_log.png') });

      // 4. Reports Archive
      console.log('4. Capturing 04_reports_phase_archive.png...');
      await navigateTo('Reports Archive');
      await page.screenshot({ path: path.join(screensDir, '04_reports_phase_archive.png') });

      console.log('Successfully captured all M7 screenshots into docs/screens/m7/!');
      await browser.close();
    } catch (err) {
      await browser.close();
      throw err;
    }
  } finally {
    serverProc.kill();
  }
}

captureM7Screens()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

