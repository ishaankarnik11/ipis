import puppeteer from 'puppeteer';
import { PdfGenerationError } from './errors.js';
import { logger } from './logger.js';

const PDF_TIMEOUT_MS = 10_000;

export async function generatePdf(url: string, authToken: string): Promise<Buffer> {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set the internal service token as a cookie for authentication
    const urlObj = new URL(url);
    await page.setCookie({
      name: 'ipis_internal_token',
      value: authToken,
      domain: urlObj.hostname,
      path: '/',
      httpOnly: true,
      secure: urlObj.protocol === 'https:',
    });

    // Navigate to the page and wait for all network requests to settle
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: PDF_TIMEOUT_MS,
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });

    return Buffer.from(pdfBuffer);
  } catch (err) {
    logger.error({ err, url }, 'PDF generation failed');
    if (err instanceof PdfGenerationError) throw err;
    throw new PdfGenerationError(
      err instanceof Error ? err.message : 'Unknown PDF generation error',
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
