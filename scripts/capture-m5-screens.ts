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
      // ignore retry
    }
    await wait(300);
  }
  throw new Error(`Server failed to start at ${url} within ${timeoutMs}ms`);
}

async function captureM5Screens() {
  const screensDir = path.resolve(process.cwd(), 'docs/screens/m5');
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

      // 1. Projects Portfolio
      console.log('1. Capturing 01_projects_portfolio.png...');
      await navigateTo('Projects & Tasks');
      await page.screenshot({ path: path.join(screensDir, '01_projects_portfolio.png') });

      // 2. Open Project Detail (Project 1)
      console.log('2. Opening Project 1 Detail...');
      await page.evaluate(() => {
        const tableRows = Array.from(document.querySelectorAll('tbody tr'));
        if (tableRows.length > 0) {
          const btn = tableRows[0].querySelector('button') as HTMLElement;
          if (btn) btn.click();
        }
      });
      await wait(1200);
      await page.screenshot({ path: path.join(screensDir, '02_project_details_tasks_phases.png') });

      // 3. Scroll to Team and Risks
      console.log('3. Capturing 03_project_team_allocation_risks.png...');
      await page.evaluate(() => {
        window.scrollBy(0, 450);
      });
      await wait(500);
      await page.screenshot({ path: path.join(screensDir, '03_project_team_allocation_risks.png') });

      console.log('Successfully captured all M5 screenshots into docs/screens/m5/!');
      await browser.close();
    } catch (err) {
      await browser.close();
      throw err;
    }
  } finally {
    serverProc.kill();
  }
}

captureM5Screens()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
