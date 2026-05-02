import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// TODO: add API key / auth guard before public SaaS release.
// The endpoint is currently open because it only processes customer-facing HTML
// from .pv-print-doc and does not have access to internal DB or secrets.

/**
 * Server-side premium PDF generation using headless Chromium.
 *
 * Accepts the rendered HTML of .pv-print-doc plus collected CSS,
 * renders it identically to the desktop premium view, and returns
 * a pixel-perfect A4 PDF.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ─── Method guard ────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ─── Parse body ──────────────────────────────────────
  const {
    html,
    stylesheets = [],
    inlineStyles = [],
    origin,
    filename,
  } = req.body || {};

  console.log('[PDF API] method:', req.method);
  console.log('[PDF API] html length:', html ? html.length : 0);
  console.log('[PDF API] stylesheets count:', stylesheets.length);
  console.log('[PDF API] inlineStyles count:', inlineStyles.length);
  console.log('[PDF API] origin:', origin);

  if (!html) {
    return res.status(400).json({ error: 'Missing required field: html' });
  }

  let browser = null;

  try {
    // ─── Launch headless Chromium ───────────────────────
    console.log('[PDF API] launching chromium...');

    const executablePath = await chromium.executablePath();
    console.log('[PDF API] chromium executable path resolved:', executablePath);

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

    // ─── Build full HTML document ──────────────────────
    const baseOrigin = origin || '';
    const sheetLinks = stylesheets
      .map((href: string) => `<link rel="stylesheet" href="${href}">`)
      .join('\n');
    const inlineStyleBlocks = inlineStyles
      .map((css: string) => `<style>${css}</style>`)
      .join('\n');

    const fullHtml = `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <base href="${baseOrigin}/" />

  ${sheetLinks}

  ${inlineStyleBlocks}

  <style>
    @page {
      size: A4;
      margin: 0;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .no-print,
    .pv-print-controls {
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

    // ─── Render ────────────────────────────────────────
    console.log('[PDF API] setContent start...');

    await page.setContent(fullHtml, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    // Wait for images to load (with individual timeouts)
    await page.evaluate(`
      (async () => {
        const imgs = Array.from(document.images);
        await Promise.all(
          imgs.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              const timer = setTimeout(resolve, 8000);
              img.onload = () => { clearTimeout(timer); resolve(); };
              img.onerror = () => { clearTimeout(timer); resolve(); };
            });
          })
        );
      })()
    `);

    console.log('[PDF API] setContent done, images loaded');

    await page.emulateMediaType('print');

    // ─── Generate PDF ──────────────────────────────────
    console.log('[PDF API] pdf generation start...');

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

    // ─── Response ──────────────────────────────────────
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
