/**
 * Server-side premium PDF export service.
 *
 * Extracts the full HTML + CSS from the current page and sends it
 * to the Vercel Serverless Function for headless Chromium rendering.
 * The result is a pixel-perfect A4 PDF identical to the desktop view.
 */
export async function exportPvOfferServerPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  // ─── 1. Capture HTML ────────────────────────────────
  const html = element.outerHTML;

  // ─── 2. Collect stylesheet URLs ─────────────────────
  const stylesheetUrls = Array.from(
    document.querySelectorAll('link[rel="stylesheet"]')
  ).map((link) => (link as HTMLLinkElement).href);

  // ─── 3. Collect all CSS rules from accessible stylesheets ─
  let cssText = '';

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules || []);
      cssText += rules.map((rule) => rule.cssText).join('\n') + '\n';
    } catch {
      // Cross-origin stylesheets cannot be read — that's OK,
      // they'll be loaded via stylesheetUrls + <base href> on the server.
    }
  }

  // ─── 4. Collect inline <style> tags ─────────────────
  const inlineStyles = Array.from(document.querySelectorAll('style'))
    .map((style) => style.textContent || '')
    .join('\n');

  cssText += '\n' + inlineStyles;

  // ─── 5. POST to Vercel API ──────────────────────────
  const response = await fetch('/api/generate-pv-offer-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html,
      cssText,
      stylesheetUrls,
      origin: window.location.origin,
      filename,
    }),
  });

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ error: 'Błąd połączenia z serwerem' }));
    throw new Error(err.error || 'Nie udało się wygenerować PDF na serwerze');
  }

  // ─── 6. Download the PDF blob ───────────────────────
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // ─── 7. iOS Safari fallback ─────────────────────────
  // Safari on iOS ignores the download attribute on blob URLs.
  // Opening the URL in a new tab lets the user view and save the PDF
  // via the native iOS share sheet.
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    window.open(url, '_blank');
  }

  // ─── 8. Cleanup ─────────────────────────────────────
  setTimeout(() => window.URL.revokeObjectURL(url), 3000);
}
