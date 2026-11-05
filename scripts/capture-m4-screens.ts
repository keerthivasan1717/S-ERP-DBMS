import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureM4Screens() {
  const screensDir = path.resolve(process.cwd(), 'docs/screens/m4');
  if (!fs.existsSync(screensDir)) {
    fs.mkdirSync(screensDir, { recursive: true });
  }

  console.log('Starting S-ERP server on port 3000...');
  const serverProc = spawn('node', ['dist/server/index.js'], {
    env: { ...process.env, PORT: '3000' },
    stdio: 'inherit',
  });

  await wait(2500);

  console.log('Launching Puppeteer to capture real M4 screenshots...');
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1366, height: 820 },
  });

  const page = await browser.newPage();

  try {
    // Login as Admin
    console.log('Logging in as Administrator...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await wait(800);
    await page.$eval('#username', (el: any) => (el.value = ''));
    await page.type('#username', 'admin');
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

    // 1. Organization Profile & Dimensions (G1)
    console.log('1. Capturing 01_organization_profile.png...');
    await navigateTo('Organization Profile');
    await page.screenshot({ path: path.join(screensDir, '01_organization_profile.png') });

    // 2. Departments with Tree & Ledger
    console.log('2. Capturing 02_departments_tree_and_ledger.png...');
    await navigateTo('Departments');
    await page.screenshot({ path: path.join(screensDir, '02_departments_tree_and_ledger.png') });

    // 3. Employees Directory
    console.log('3. Capturing 03_employees_directory.png...');
    await navigateTo('Employees');
    await page.screenshot({ path: path.join(screensDir, '03_employees_directory.png') });

    // 4. User Accounts Management
    console.log('4. Capturing 04_user_accounts.png...');
    await navigateTo('User Accounts');
    await page.screenshot({ path: path.join(screensDir, '04_user_accounts.png') });

    // 5. Delete Department Conflict Modal
    console.log('5. Capturing 05_department_delete_conflict.png...');
    await navigateTo('Departments');
    // Click Delete on first department (Engineering)
    await page.evaluate(() => {
      const deleteBtn = document.querySelector('button.btn-danger') as HTMLElement;
      if (deleteBtn) deleteBtn.click();
    });
    await wait(500);
    await page.screenshot({ path: path.join(screensDir, '05_department_delete_conflict.png') });

    console.log('Successfully captured all M4 screenshots into docs/screens/m4/!');
  } catch (err) {
    console.error('Error capturing screenshots:', err);
    throw err;
  } finally {
    await browser.close();
    serverProc.kill();
  }
}

captureM4Screens()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
