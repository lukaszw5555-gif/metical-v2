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
  const stylesheets = Array.from(
    document.querySelectorAll('link[rel="stylesheet"]')
  ).map((link) => (link as HTMLLinkElement).href);

  // ─── 3. Collect inline <style> tags ─────────────────
  const inlineStyles = Array.from(document.querySelectorAll('style'))
    .map((style) => style.textContent || '');

  console.log('[PDF CLIENT] sending request');
  console.log('[PDF CLIENT] html length:', html.length);
  console.log('[PDF CLIENT] stylesheets count:', stylesheets.length);
  console.log('[PDF CLIENT] inlineStyles count:', inlineStyles.length);

  // ─── 4. POST to Vercel API ──────────────────────────
  const response = await fetch('/api/generate-pv-offer-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html,
      stylesheets,
      inlineStyles,
      origin: window.location.origin,
      filename,
    }),
  });

  console.log('[PDF CLIENT] response status:', response.status);
  console.log('[PDF CLIENT] response content-type:', response.headers.get('content-type'));

  // ─── 5. Validate response ──────────────────────────
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Brak odpowiedzi');
    console.error('[PDF CLIENT] server error response:', errorText);
    throw new Error(`Server PDF error (${response.status}): ${errorText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/pdf')) {
    const bodyText = await response.text().catch(() => '');
    console.error('[PDF CLIENT] unexpected content-type:', contentType, bodyText);
    throw new Error(`Unexpected response type: ${contentType}`);
  }

  // ─── 6. Download the PDF blob ───────────────────────
  const blob = await response.blob();
  console.log('[PDF CLIENT] blob size:', blob.size);

  if (blob.size === 0) {
    throw new Error('Received empty PDF from server');
  }

  const url = window.URL.createObjectURL(blob);

  // ─── 7. Trigger download / Safari handling ──────────
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isIOS) {
    // On iOS Safari, <a download> doesn't work with blob URLs.
    // Open the PDF directly — user can use the native share sheet to save.
    window.location.href = url;
  } else {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ─── 8. Cleanup ─────────────────────────────────────
  setTimeout(() => window.URL.revokeObjectURL(url), 5000);
}
