import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

/**
 * Server-side PDF generation using Puppeteer and Chromium.
 * Designed to run on Vercel Serverless Functions.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { html, stylesheets, inlineStyles, origin, filename } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'Missing HTML content' });
  }

  let browser = null;

  try {
    // TODO: add API key / auth guard before public SaaS release.
    // The endpoint is currently open because it only processes customer-facing HTML 
    // and does not have access to internal DB or secrets.

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1200, height: 800 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    
    // Construct the full HTML document
    // We use <base href> to ensure relative asset paths (images, fonts) are resolved correctly
    const fullHtml = `
      <!doctype html>
      <html lang="pl">
        <head>
          <meta charset="utf-8">
          <base href="${origin}">
          ${(stylesheets || []).map((href: string) => `<link rel="stylesheet" href="${href}">`).join('\n')}
          ${(inlineStyles || []).map((css: string) => `<style>${css}</style>`).join('\n')}
          <style>
            @page { 
              size: A4; 
              margin: 0; 
            }
            body { 
              margin: 0; 
              background: white; 
              -webkit-print-color-adjust: exact; 
              font-family: sans-serif;
            }
            /* Hide UI elements that shouldn't be in the PDF */
            .no-print, 
            .pv-print-controls,
            .mobile-info-banner { 
              display: none !important; 
            }
            /* Reset document container for PDF rendering */
            .pv-print-doc { 
              margin: 0 auto !important; 
              box-shadow: none !important; 
              width: 820px !important; /* Fixed width to match desktop layout */
              min-height: auto !important;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    // Set content and wait for network to be idle (ensures images like hero are loaded)
    await page.setContent(fullHtml, { 
      waitUntil: 'networkidle0',
      timeout: 30000 // 30s timeout
    });

    // Emulate screen to capture the exact "Premium" look of the desktop view
    await page.emulateMediaType('screen');

    // Generate PDF buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    // Send the binary PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'oferta'}.pdf"`);
    return res.status(200).send(pdfBuffer);

  } catch (error: any) {
    console.error('[PDF Render Error]:', error);
    return res.status(500).json({ 
      error: 'Failed to generate PDF', 
      details: error.message 
    });
  } finally {
    // Always close the browser to prevent memory leaks
    if (browser) {
      await browser.close();
    }
  }
}
