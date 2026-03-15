import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const MASTER_OTP = '000000';
const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(import.meta.dirname, 'screenshots');

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

interface PersonaConfig {
  name: string;
  email: string;
  role: string;
  flows: { name: string; url: string }[];
}

const personas: PersonaConfig[] = [
  {
    name: 'rajesh',
    email: 'rajesh@uat.test',
    role: 'ADMIN',
    flows: [
      { name: 'landing', url: '/admin' },
      { name: 'user-management', url: '/admin/users' },
      { name: 'departments', url: '/admin/departments' },
      { name: 'pending-approvals', url: '/admin/pending-approvals' },
      { name: 'system-config', url: '/admin/config' },
      { name: 'projects', url: '/dashboards/projects' },
      { name: 'executive-dashboard', url: '/dashboards/executive' },
      { name: 'company-dashboard', url: '/dashboards/company' },
      { name: 'dept-dashboard', url: '/dashboards/department' },
      { name: 'employees', url: '/dashboards/employees' },
    ],
  },
  {
    name: 'priya',
    email: 'priya@uat.test',
    role: 'FINANCE',
    flows: [
      { name: 'landing-executive', url: '/dashboards/executive' },
      { name: 'projects', url: '/dashboards/projects' },
      { name: 'company-dashboard', url: '/dashboards/company' },
      { name: 'dept-dashboard', url: '/dashboards/department' },
      { name: 'client-dashboard', url: '/dashboards/clients' },
      { name: 'upload-center', url: '/uploads' },
      { name: 'employees', url: '/dashboards/employees' },
    ],
  },
  {
    name: 'neha',
    email: 'neha@uat.test',
    role: 'HR',
    flows: [
      { name: 'landing-employees', url: '/dashboards/employees' },
      { name: 'upload-center', url: '/uploads' },
      { name: 'dept-dashboard', url: '/dashboards/department' },
    ],
  },
  {
    name: 'vikram',
    email: 'vikram@uat.test',
    role: 'DELIVERY_MANAGER',
    flows: [
      { name: 'landing-projects', url: '/dashboards/projects' },
      { name: 'upload-center', url: '/uploads' },
      { name: 'dept-dashboard', url: '/dashboards/department' },
    ],
  },
  {
    name: 'arjun',
    email: 'arjun@uat.test',
    role: 'DEPT_HEAD',
    flows: [
      { name: 'landing-dept', url: '/dashboards/department' },
      { name: 'projects', url: '/dashboards/projects' },
      { name: 'employees', url: '/dashboards/employees' },
    ],
  },
];

async function loginWithOtp(page: any, email: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('[data-testid="email-input"]', { timeout: 10000 });
  await page.fill('[data-testid="email-input"]', email);
  await page.click('[data-testid="send-otp-btn"]');

  await page.waitForSelector('[data-testid="otp-digit-0"]', { timeout: 10000 });
  // Click first digit input then type all 6 digits — auto-advance handles the rest
  await page.click('[data-testid="otp-digit-0"]');
  await page.waitForTimeout(200);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.type(MASTER_OTP[i], { delay: 100 });
  }

  // Wait for redirect
  await page.waitForURL((url: URL) => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(1000); // Let page settle
}

async function main() {
  console.log('Starting UAT walkthroughs...\n');
  const browser = await chromium.launch({ headless: true });

  for (const persona of personas) {
    console.log(`\n👤 ${persona.name.toUpperCase()} (${persona.role})`);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    try {
      // Login
      console.log(`  Logging in as ${persona.email}...`);
      await loginWithOtp(page, persona.email);
      console.log(`  ✓ Logged in, landed at: ${page.url()}`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${persona.name}--login-success.png`), fullPage: true });

      // Walk through flows
      for (const flow of persona.flows) {
        try {
          await page.goto(`${BASE_URL}${flow.url}`, { waitUntil: 'networkidle', timeout: 15000 });
          await page.waitForTimeout(500);
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${persona.name}--${flow.name}.png`), fullPage: true });
          console.log(`  ✓ ${flow.name}: ${page.url()}`);
        } catch (err: any) {
          console.log(`  ✗ ${flow.name}: FAILED — ${err.message?.slice(0, 80)}`);
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${persona.name}--${flow.name}--ERROR.png`), fullPage: true });
        }
      }
    } catch (err: any) {
      console.log(`  ✗ LOGIN FAILED: ${err.message?.slice(0, 100)}`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${persona.name}--login-FAILED.png`), fullPage: true });
    }

    await context.close();
  }

  await browser.close();
  console.log(`\n📸 Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log('UAT walkthroughs complete.');
}

main().catch(console.error);
