import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureM3Screens() {
  const screensDir = path.resolve(process.cwd(), 'docs/screens/m3');
  if (!fs.existsSync(screensDir)) {
    fs.mkdirSync(screensDir, { recursive: true });
  }

  console.log('Starting S-ERP server on port 3000...');
  const serverProc = spawn('node', ['dist/server/index.js'], {
    env: { ...process.env, PORT: '3000' },
    stdio: 'inherit',
  });

  // Wait for server to come up
  await wait(2500);

  console.log('Launching Puppeteer to capture real M3 screenshots...');
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1366, height: 820 },
  });

  const page = await browser.newPage();

  try {
    // Helper to clear cookies and load login page
    const resetToLogin = async () => {
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
      await wait(1000);
    };

    // Helper to sign in
    const loginAs = async (username: string, engine: 'mysql' | 'mongodb' = 'mysql') => {
      await resetToLogin();
      // Select engine
      await page.evaluate((eng) => {
        const labels = Array.from(document.querySelectorAll('strong'));
        const targetLabel = labels.find((l) =>
          eng === 'mysql' ? l.textContent?.includes('MySQL') : l.textContent?.includes('MongoDB')
        );
        if (targetLabel) {
          (targetLabel.closest('div[style*="cursor"]') as HTMLElement)?.click();
        }
      }, engine);
      await wait(300);

      // Fill credentials
      await page.$eval('#username', (el: any) => (el.value = ''));
      await page.type('#username', username);
      await page.$eval('#password', (el: any) => (el.value = ''));
      await page.type('#password', '1234');

      // Click sign in
      await page.click('button[type="submit"]');
      await page.waitForSelector('header', { timeout: 8000 });
      await wait(1000);
    };

    // 1. Login Page with MySQL
    console.log('1. Capturing 01_login_mysql.png...');
    await resetToLogin();
    await page.screenshot({ path: path.join(screensDir, '01_login_mysql.png') });

    // 2. Login Page with MongoDB selected
    console.log('2. Capturing 02_login_mongodb.png...');
    await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('strong'));
      const mongoLabel = labels.find((l) => l.textContent?.includes('MongoDB'));
      if (mongoLabel) {
        (mongoLabel.closest('div[style*="cursor"]') as HTMLElement)?.click();
      }
    });
    await wait(500);
    await page.screenshot({ path: path.join(screensDir, '02_login_mongodb.png') });

    // 3. Administrator Shell
    console.log('3. Capturing 03_shell_admin.png...');
    await loginAs('admin', 'mysql');
    await page.screenshot({ path: path.join(screensDir, '03_shell_admin.png') });

    // 4. Strategic Manager Shell
    console.log('4. Capturing 04_shell_strategic.png...');
    await loginAs('strategic', 'mongodb');
    await page.screenshot({ path: path.join(screensDir, '04_shell_strategic.png') });

    // 5. Tactical Manager Shell
    console.log('5. Capturing 05_shell_tactical.png...');
    await loginAs('tactical', 'mysql');
    await page.screenshot({ path: path.join(screensDir, '05_shell_tactical.png') });

    // 6. Operational User Shell
    console.log('6. Capturing 06_shell_operator.png...');
    await loginAs('operator', 'mongodb');
    await page.screenshot({ path: path.join(screensDir, '06_shell_operator.png') });

    // 7. Shared Component: DataTable with Sort & Filter
    console.log('7. Capturing 07_components_datatable.png...');
    await loginAs('admin', 'mysql');
    // Navigate to Departments or Users table
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('aside div'));
      const deptLink = links.find((l) => l.textContent?.trim() === 'Departments') as HTMLElement;
      if (deptLink) deptLink.click();
    });
    await wait(1000);
    await page.screenshot({ path: path.join(screensDir, '07_components_datatable.png') });

    console.log('Successfully captured all M3 screenshots into docs/screens/m3/!');
  } catch (err) {
    console.error('Error capturing screenshots:', err);
    throw err;
  } finally {
    await browser.close();
    serverProc.kill();
  }
}

captureM3Screens()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

