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
    @page { size: A4; }

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

    /* Hide the in-document footer instance — per-page footer is handled by Puppeteer footerTemplate */
    .pv-print-footer {
      display: none !important;
    }

    .pv-print-doc {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      transform: none !important;
    }

    /* Safety: if the hiding class leaks to server, force visible */
    .pv-print-doc-source {
      position: static !important;
      left: auto !important;
      top: auto !important;
      opacity: 1 !important;
      pointer-events: auto !important;
      width: 100% !important;
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

    await page.emulateMediaType('print');

    // ─── Generate PDF ─────────────────────────────────
    console.log('[PDF API] pdf start...');

    const footerHtml = `
      <div style="
        width: 100%;
        height: 18mm;
        background: #1a1a2e;
        color: rgba(255,255,255,0.68);
        font-family: Inter, Arial, sans-serif;
        font-size: 8.5px;
        line-height: 1.35;
        text-align: center;
        padding: 4mm 10mm 0;
        box-sizing: border-box;
      ">
        <div style="color:#c9a84c;font-weight:700;margin-bottom:1mm;letter-spacing:.3px;">METICAL Sp. z o.o.</div>
        <div>Oferta ma charakter informacyjny i wymaga potwierdzenia dostępności komponentów oraz warunków montażu po wizji lokalnej lub analizie technicznej.</div>
      </div>`;

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: footerHtml,
      margin: {
        top: '12mm',
        right: '10mm',
        bottom: '24mm',
        left: '10mm',
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
