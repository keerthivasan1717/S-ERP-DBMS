import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

const SLUG_MAP: Record<string, string> = {
  M0: 'M0-foundations',
  M1: 'M1-schema',
  M2: 'M2-auth',
  M3: 'M3-shell',
  M4: 'M4-organization',
  M5: 'M5-projects',
  M6: 'M6-sustainability',
  M7: 'M7-processes',
  M8: 'M8-dashboards',
  M9: 'M9-final',
};

async function main() {
  const args = process.argv.slice(2);
  const milestoneArg = args[0] ? args[0].toUpperCase() : '';

  if (!milestoneArg) {
    console.error('Usage: npm run report -- M<n> (e.g. npm run report -- M0)');
    process.exit(1);
  }

  const reportsDir = path.resolve(process.cwd(), 'docs/reports');
  const markdownPath = path.join(reportsDir, `${milestoneArg}.md`);

  if (!fs.existsSync(markdownPath)) {
    console.error(`Error: Report file not found at ${markdownPath}`);
    process.exit(1);
  }

  let gitCommit = 'unknown';
  let gitBranch = 'unknown';
  try {
    gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    // fallback if git fails
  }

  const today = new Date().toISOString().split('T')[0];
  let markdown = fs.readFileSync(markdownPath, 'utf-8');

  // Replace placeholders if any exist
  markdown = markdown
    .replace(/\{\{GIT_COMMIT\}\}/g, gitCommit)
    .replace(/\{\{GIT_BRANCH\}\}/g, gitBranch)
    .replace(/\{\{DATE\}\}/g, today);

  const cssPath = path.join(reportsDir, 'report.css');
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf-8') : '';

  const htmlBody = await marked.parse(markdown);

  const htmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>S-ERP Report: ${milestoneArg}</title>
  <style>
    ${css}
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`;

  const slug = SLUG_MAP[milestoneArg] || `${milestoneArg}-report`;
  const pdfPath = path.join(reportsDir, `${slug}.pdf`);

  console.log(`Generating PDF for ${milestoneArg} -> ${pdfPath}`);

  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    // Resolve relative assets relative to reports directory
    await page.setContent(htmlDocument, {
      waitUntil: 'networkidle0',
    });

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '22mm',
        left: '16mm',
        right: '16mm',
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-family: 'IBM Plex Mono', 'Liberation Mono', Menlo, monospace; font-size: 7pt; color: #5B635E; width: 100%; display: flex; justify-content: space-between; padding: 0 16mm; border-top: 1px solid #D4CFC2; padding-top: 3px;">
          <span>S-ERP DBMS &bull; Milestone ${milestoneArg}</span>
          <span>Commit: ${gitCommit} &bull; ${today}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
    });

    console.log(`✓ Successfully generated ${pdfPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Fatal error during report generation:', err);
  process.exit(1);
});
