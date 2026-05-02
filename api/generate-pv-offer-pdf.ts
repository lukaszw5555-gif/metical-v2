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
  const { html, cssText, stylesheetUrls, origin, filename } = req.body || {};

  if (!html) {
    return res.status(400).json({ error: 'Missing required field: html' });
  }

  let browser = null;

  try {
    // ─── Launch headless Chromium ───────────────────────
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: {
        width: 1200,
        height: 1600,
        deviceScaleFactor: 1,
      },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    // ─── Build full HTML document ──────────────────────
    const baseOrigin = origin || '';
    const sheetLinks = (stylesheetUrls || [])
      .map((href: string) => `<link rel="stylesheet" href="${href}">`)
      .join('\n');

    const fullHtml = `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <base href="${baseOrigin}" />

  ${sheetLinks}

  <style>
${cssText || ''}
  </style>

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
      width: 210mm !important;
      max-width: 210mm !important;
      min-width: 210mm !important;
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
    await page.setContent(fullHtml, {
      waitUntil: 'networkidle0',
      timeout: 25000,
    });

    await page.emulateMediaType('print');

    // ─── Generate PDF ──────────────────────────────────
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

    // ─── Response ──────────────────────────────────────
    const safeName = (filename || 'oferta').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    return res.status(200).send(pdfBuffer);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PDF Render Error]:', message);
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
