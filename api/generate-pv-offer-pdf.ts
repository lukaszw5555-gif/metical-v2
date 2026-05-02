import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// TODO: add API key / auth guard before public SaaS release.

/**
 * Server-side premium PDF generation (self-contained).
 *
 * Receives fully self-contained HTML:
 * - All CSS as inline text (cssText)
 * - Images already embedded as data URLs
 * - No external stylesheet links to fetch
 * - No external images to download
 *
 * This eliminates network-dependent timeouts on Vercel.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { html, cssText = '', origin = '', filename } = req.body || {};

  console.log('[PDF API] method:', req.method);
  console.log('[PDF API] html length:', html ? html.length : 0);
  console.log('[PDF API] cssText length:', cssText.length);
  console.log('[PDF API] origin:', origin);

  if (!html) {
    return res.status(400).json({ error: 'Missing required field: html' });
  }

  let browser = null;

  try {
    console.log('[PDF API] launching chromium...');

    const executablePath = await chromium.executablePath();
    console.log('[PDF API] executable path:', executablePath);

    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      defaultViewport: {
        width: 1200,
        height: 1600,
        deviceScaleFactor: 1,
      },
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();

    // ─── Build self-contained HTML document ────────────
    const fullHtml = `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <base href="${origin}/" />

  <style>
${cssText}
  </style>

  <style>
    @page { size: A4; margin: 0; }

    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .no-print,
    .pv-print-controls,
    .mobile-info-banner {
      display: none !important;
    }

    .pv-print-doc {
      width: 820px !important;
      max-width: 820px !important;
      min-width: 820px !important;
      margin: 0 auto !important;
      box-shadow: none !important;
      transform: none !important;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

    // ─── Render (no external assets to wait for) ──────
    console.log('[PDF API] setContent start...');

    await page.setContent(fullHtml, {
      waitUntil: 'load',
      timeout: 15000,
    });

    console.log('[PDF API] setContent done');

    await page.emulateMediaType('screen');

    // ─── Generate PDF ─────────────────────────────────
    console.log('[PDF API] pdf start...');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
    });

    console.log('[PDF API] pdf done, size:', pdfBuffer.length, 'bytes');

    const safeName = (filename || 'oferta').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    return res.status(200).send(Buffer.from(pdfBuffer));

  } catch (error: unknown) {
    const name = error instanceof Error ? error.name : 'UnknownError';
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : '';
    console.error('[PDF API] error name:', name);
    console.error('[PDF API] error message:', message);
    console.error('[PDF API] error stack:', stack);
    return res.status(500).json({
      error: 'Failed to generate PDF',
      details: message,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
