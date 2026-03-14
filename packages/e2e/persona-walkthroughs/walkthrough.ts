/**
 * Persona Walkthrough Script
 *
 * Runs in headed Chromium against the DEV server (localhost:5173).
 * Logs in as each persona, walks through their key tasks, captures screenshots.
 * Screenshots saved to packages/e2e/persona-walkthroughs/screenshots/
 */
import { chromium, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const BASE_URL = 'http://localhost:5173';
const PASSWORD = 'admin123';

// Ensure screenshots directory exists
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// Clear previous screenshots
for (const f of fs.readdirSync(SCREENSHOTS_DIR)) {
  if (f.endsWith('.png')) fs.unlinkSync(path.join(SCREENSHOTS_DIR, f));
}

interface PersonaConfig {
  name: string;
  email: string;
  role: string;
  flows: { name: string; steps: ((page: Page) => Promise<void>)[] }[];
}

async function login(page: Page, email: string): Promise<void> {
  // Navigate to app first so we can clear storage
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);

  // Clear session
  await page.context().clearCookies();
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });

  // Reload login page fresh
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Wait for the login form
  await page.waitForSelector('input', { timeout: 10000 });

  const emailInput = page.getByLabel('Email');
  if (await emailInput.isVisible({ timeout: 5000 })) {
    await emailInput.fill(email);
  } else {
    await page.locator('input[type="email"], input[placeholder*="email" i]').first().fill(email);
  }

  const passInput = page.getByLabel('Password');
  if (await passInput.isVisible({ timeout: 3000 })) {
    await passInput.fill(PASSWORD);
  } else {
    await page.locator('input[type="password"]').first().fill(PASSWORD);
  }

  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
}

async function screenshot(page: Page, persona: string, flowName: string, stepName: string): Promise<string> {
  const filename = `${persona}--${flowName}--${stepName}.png`.replace(/\s+/g, '-').toLowerCase();
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`  📸 ${filename}`);
  return filepath;
}

async function clickSidebar(page: Page, label: string): Promise<void> {
  // Ant Design sidebar menu items
  await page.getByRole('menuitem', { name: label }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
}

async function runPersona(page: Page, persona: PersonaConfig): Promise<void> {
  console.log(`\n👤 Starting walkthrough: ${persona.name} (${persona.role})`);
  console.log(`   Email: ${persona.email}`);

  await login(page, persona.email);
  await screenshot(page, persona.name, 'landing', 'after-login');

  for (const flow of persona.flows) {
    console.log(`  🔄 Flow: ${flow.name}`);
    for (const step of flow.steps) {
      await step(page);
    }
  }

  // Logout
  try {
    const userMenu = page.locator('.ant-dropdown-trigger').first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.waitForTimeout(300);
      const logoutBtn = page.getByText(/log\s*out/i);
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
        await page.waitForTimeout(500);
      }
    }
  } catch {
    await page.goto(`${BASE_URL}/login`);
  }
}

// ────────────────────────────────────────────────────
// PERSONA DEFINITIONS
// ────────────────────────────────────────────────────

const rajesh: PersonaConfig = {
  name: 'Rajesh',
  email: 'admin@ipis.test',
  role: 'ADMIN',
  flows: [
    {
      name: 'sidebar-navigation',
      steps: [
        async (page) => { await screenshot(page, 'Rajesh', 'sidebar', '01-full-sidebar'); },
      ],
    },
    {
      name: 'user-management',
      steps: [
        async (page) => {
          await clickSidebar(page, 'User Management');
          await screenshot(page, 'Rajesh', 'user-mgmt', '01-user-list');
        },
      ],
    },
    {
      name: 'pending-approvals',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Pending Approvals');
          await screenshot(page, 'Rajesh', 'approvals', '01-pending-list');
        },
      ],
    },
    {
      name: 'system-config',
      steps: [
        async (page) => {
          await clickSidebar(page, 'System Config');
          await screenshot(page, 'Rajesh', 'system-config', '01-config-page');
        },
      ],
    },
    {
      name: 'employees',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Employees');
          await screenshot(page, 'Rajesh', 'employees', '01-employee-list');
        },
      ],
    },
    {
      name: 'projects-overview',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Projects');
          await screenshot(page, 'Rajesh', 'projects', '01-project-list');
          // Click first project
          const firstRow = page.locator('table tbody tr').first();
          if (await firstRow.isVisible()) {
            await firstRow.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(800);
            await screenshot(page, 'Rajesh', 'projects', '02-project-detail');
          }
        },
      ],
    },
    {
      name: 'executive-dashboard',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Executive Dashboard');
          await screenshot(page, 'Rajesh', 'exec-dashboard', '01-overview');
        },
      ],
    },
    {
      name: 'audit-log',
      steps: [
        async (page) => {
          try {
            await page.goto(`${BASE_URL}/admin/audit-log`);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(800);
            await screenshot(page, 'Rajesh', 'audit', '01-audit-log');
          } catch { /* page may not exist */ }
        },
      ],
    },
  ],
};

const priya: PersonaConfig = {
  name: 'Priya',
  email: 'finance@ipis.test',
  role: 'FINANCE',
  flows: [
    {
      name: 'landing-dashboard',
      steps: [
        async (page) => { await screenshot(page, 'Priya', 'landing', '01-executive-dashboard'); },
      ],
    },
    {
      name: 'executive-dashboard-detail',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Executive Dashboard');
          await page.waitForTimeout(500);
          await screenshot(page, 'Priya', 'exec-dashboard', '01-kpi-tiles');
          // Scroll to see project breakdown
          await page.evaluate(() => window.scrollTo(0, 600));
          await page.waitForTimeout(300);
          await screenshot(page, 'Priya', 'exec-dashboard', '02-project-breakdown');
          // Scroll further
          await page.evaluate(() => window.scrollTo(0, 1200));
          await page.waitForTimeout(300);
          await screenshot(page, 'Priya', 'exec-dashboard', '03-bottom-section');
        },
      ],
    },
    {
      name: 'upload-center',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Upload Center');
          await screenshot(page, 'Priya', 'upload', '01-upload-center');
        },
      ],
    },
    {
      name: 'project-dashboard',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Project Dashboard');
          await page.waitForTimeout(500);
          await screenshot(page, 'Priya', 'project-dashboard', '01-overview');
        },
      ],
    },
    {
      name: 'project-drill-down',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Projects');
          await page.waitForTimeout(500);
          await screenshot(page, 'Priya', 'projects', '01-project-list');
          // Click first project
          const firstRow = page.locator('table tbody tr').first();
          if (await firstRow.isVisible()) {
            await firstRow.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(800);
            await screenshot(page, 'Priya', 'projects', '02-project-detail');
            await page.evaluate(() => window.scrollTo(0, 600));
            await page.waitForTimeout(300);
            await screenshot(page, 'Priya', 'projects', '03-project-financials');
          }
        },
      ],
    },
    {
      name: 'department-dashboard',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Department Dashboard');
          await page.waitForTimeout(500);
          await screenshot(page, 'Priya', 'dept-dashboard', '01-overview');
        },
      ],
    },
    {
      name: 'employee-dashboard',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Employee Dashboard');
          await page.waitForTimeout(500);
          await screenshot(page, 'Priya', 'emp-dashboard', '01-overview');
        },
      ],
    },
  ],
};

const neha: PersonaConfig = {
  name: 'Neha',
  email: 'hr@ipis.test',
  role: 'HR',
  flows: [
    {
      name: 'landing',
      steps: [
        async (page) => { await screenshot(page, 'Neha', 'landing', '01-employee-list'); },
      ],
    },
    {
      name: 'employee-list',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Employees');
          await page.waitForTimeout(500);
          await screenshot(page, 'Neha', 'employees', '01-full-list');
          // Try clicking an employee row
          const firstRow = page.locator('table tbody tr').first();
          if (await firstRow.isVisible()) {
            await firstRow.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(800);
            await screenshot(page, 'Neha', 'employees', '02-after-row-click');
          }
        },
      ],
    },
    {
      name: 'upload-center',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Upload Center');
          await screenshot(page, 'Neha', 'upload', '01-upload-center');
        },
      ],
    },
  ],
};

const vikram: PersonaConfig = {
  name: 'Vikram',
  email: 'dm1@ipis.test',
  role: 'DELIVERY_MANAGER',
  flows: [
    {
      name: 'landing-projects',
      steps: [
        async (page) => { await screenshot(page, 'Vikram', 'landing', '01-my-projects'); },
      ],
    },
    {
      name: 'project-list',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Projects');
          await page.waitForTimeout(500);
          await screenshot(page, 'Vikram', 'projects', '01-project-list');
          // Click a project for detail
          const firstRow = page.locator('table tbody tr').first();
          if (await firstRow.isVisible()) {
            await firstRow.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(800);
            await screenshot(page, 'Vikram', 'projects', '02-project-detail');
            await page.evaluate(() => window.scrollTo(0, 600));
            await page.waitForTimeout(300);
            await screenshot(page, 'Vikram', 'projects', '03-project-detail-scroll');
            await page.evaluate(() => window.scrollTo(0, 1200));
            await page.waitForTimeout(300);
            await screenshot(page, 'Vikram', 'projects', '04-project-team-roster');
          }
        },
      ],
    },
    {
      name: 'project-dashboard',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Project Dashboard');
          await page.waitForTimeout(500);
          await screenshot(page, 'Vikram', 'project-dashboard', '01-overview');
        },
      ],
    },
    {
      name: 'department-dashboard',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Department Dashboard');
          await page.waitForTimeout(500);
          await screenshot(page, 'Vikram', 'dept-dashboard', '01-overview');
        },
      ],
    },
  ],
};

const arjun: PersonaConfig = {
  name: 'Arjun',
  email: 'depthead@ipis.test',
  role: 'DEPT_HEAD',
  flows: [
    {
      name: 'landing-department',
      steps: [
        async (page) => { await screenshot(page, 'Arjun', 'landing', '01-department-dashboard'); },
      ],
    },
    {
      name: 'department-dashboard-detail',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Department Dashboard');
          await page.waitForTimeout(500);
          await screenshot(page, 'Arjun', 'dept-dashboard', '01-overview');
          await page.evaluate(() => window.scrollTo(0, 600));
          await page.waitForTimeout(300);
          await screenshot(page, 'Arjun', 'dept-dashboard', '02-breakdown');
          await page.evaluate(() => window.scrollTo(0, 1200));
          await page.waitForTimeout(300);
          await screenshot(page, 'Arjun', 'dept-dashboard', '03-bottom');
        },
      ],
    },
    {
      name: 'project-dashboard',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Project Dashboard');
          await page.waitForTimeout(500);
          await screenshot(page, 'Arjun', 'project-dashboard', '01-overview');
        },
      ],
    },
    {
      name: 'projects-list',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Projects');
          await page.waitForTimeout(500);
          await screenshot(page, 'Arjun', 'projects', '01-project-list');
          const firstRow = page.locator('table tbody tr').first();
          if (await firstRow.isVisible()) {
            await firstRow.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(800);
            await screenshot(page, 'Arjun', 'projects', '02-project-detail');
          }
        },
      ],
    },
    {
      name: 'employee-dashboard',
      steps: [
        async (page) => {
          await clickSidebar(page, 'Employee Dashboard');
          await page.waitForTimeout(500);
          await screenshot(page, 'Arjun', 'emp-dashboard', '01-overview');
        },
      ],
    },
  ],
};

// ────────────────────────────────────────────────────
// MAIN EXECUTION
// ────────────────────────────────────────────────────

async function main() {
  console.log('🎬 IPIS Persona Walkthrough — Headed Mode');
  console.log('==========================================\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400,
    args: ['--window-size=1440,900'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  const personas = [rajesh, priya, neha, vikram, arjun];

  for (const persona of personas) {
    try {
      await runPersona(page, persona);
      console.log(`  ✅ ${persona.name} walkthrough complete`);
    } catch (err) {
      console.error(`  ❌ ${persona.name} walkthrough failed:`, err);
      await screenshot(page, persona.name, 'error', 'failure-state');
    }
  }

  await context.close();
  await browser.close();

  console.log('\n==========================================');
  console.log('📸 All screenshots saved to:');
  console.log(`   ${SCREENSHOTS_DIR}`);
  const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
  console.log(`   Total: ${files.length} screenshots`);
  console.log('\n✅ Walkthrough complete!');
}

main().catch(console.error);
