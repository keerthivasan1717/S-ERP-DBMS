import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

async function captureScreens() {
  const screensDir = path.resolve(process.cwd(), 'docs/screens/prototype');
  if (!fs.existsSync(screensDir)) {
    fs.mkdirSync(screensDir, { recursive: true });
  }

  console.log('Launching Puppeteer to capture real screenshots from http://localhost:3000...');

  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  try {
    // 1. Login Page
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    const loginPath = path.join(screensDir, '01_login_page.png');
    await page.screenshot({ path: loginPath });
    console.log(`Saved: ${loginPath}`);

    // Helper to sign in
    const loginAs = async (username: string, password: string) => {
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
      await page.waitForSelector('#username');
      // Clear and type username
      await page.$eval('#username', (el: any) => (el.value = ''));
      await page.type('#username', username);
      // Clear and type password
      await page.$eval('#password', (el: any) => (el.value = ''));
      await page.type('#password', password);
      // Click sign in
      await page.click('button[type="submit"]');
      await page.waitForSelector('header', { timeout: 5000 });
      await new Promise((r) => setTimeout(r, 1000));
    }

    // 2. Administrator Dashboard & Users
    console.log('Capturing Administrator screens...');
    await loginAs('admin', '1234');
    const adminDashPath = path.join(screensDir, '02_admin_dashboard.png');
    await page.screenshot({ path: adminDashPath });
    console.log(`Saved: ${adminDashPath}`);

    // Navigate to User Accounts
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('aside div'));
      const userItem = items.find((el) => el.textContent?.trim() === 'User Accounts') as HTMLElement;
      if (userItem) userItem.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    const adminUsersPath = path.join(screensDir, '03_admin_users.png');
    await page.screenshot({ path: adminUsersPath });
    console.log(`Saved: ${adminUsersPath}`);

    // 3. Tactical Manager Projects & Processes
    console.log('Capturing Tactical Manager screens...');
    await loginAs('tactical', '1234');
    // Projects
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('aside div'));
      const projItem = items.find((el) => el.textContent?.trim() === 'Projects & Tasks') as HTMLElement;
      if (projItem) projItem.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    // Click inspect on S-ERP Rollout
    await page.evaluate(() => {
      const inspectBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Inspect');
      if (inspectBtn) inspectBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    const tacticalProjPath = path.join(screensDir, '04_tactical_projects.png');
    await page.screenshot({ path: tacticalProjPath });
    console.log(`Saved: ${tacticalProjPath}`);

    // Processes
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('aside div'));
      const procItem = items.find((el) => el.textContent?.trim() === 'Business Processes') as HTMLElement;
      if (procItem) procItem.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    const tacticalProcPath = path.join(screensDir, '05_tactical_processes.png');
    await page.screenshot({ path: tacticalProcPath });
    console.log(`Saved: ${tacticalProcPath}`);

    // 4. Strategic Manager
    console.log('Capturing Strategic Manager screens...');
    await loginAs('strategic', '1234');
    const stratDashPath = path.join(screensDir, '06_strategic_dashboard.png');
    await page.screenshot({ path: stratDashPath });
    console.log(`Saved: ${stratDashPath}`);

    // Indicators view
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('aside div'));
      const indItem = items.find((el) => el.textContent?.trim() === 'Indicators & Metrics') as HTMLElement;
      if (indItem) indItem.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    // Click view history on Water
    await page.evaluate(() => {
      const historyBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'View History');
      if (historyBtn) historyBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    const stratIndPath = path.join(screensDir, '07_indicators_detail.png');
    await page.screenshot({ path: stratIndPath });
    console.log(`Saved: ${stratIndPath}`);

    // 5. Operational User
    console.log('Capturing Operational User screens...');
    await loginAs('operator', '1234');
    // Enter Measurement
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('aside div'));
      const opItem = items.find((el) => el.textContent?.trim() === 'Enter Measurement') as HTMLElement;
      if (opItem) opItem.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    const operMeasPath = path.join(screensDir, '08_operator_measurement.png');
    await page.screenshot({ path: operMeasPath });
    console.log(`Saved: ${operMeasPath}`);

    console.log('All real application screenshots successfully captured!');
  } finally {
    await browser.close();
  }
}

captureScreens().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
