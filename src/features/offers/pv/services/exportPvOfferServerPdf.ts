/**
 * Server-side premium PDF export service (self-contained).
 *
 * Builds a fully self-contained HTML payload:
 * - CSS rules extracted as text (no external stylesheet links)
 * - Logo and hero images converted to data URLs (no network fetching on server)
 * - Clone of .pv-print-doc with UI elements stripped
 *
 * The server only needs to render the HTML — no external dependencies.
 */

// ─── Helper: convert asset to data URL ────────────────
async function assetToDataUrl(path: string): Promise<string | null> {
  try {
    const res = await fetch(path, { cache: 'force-cache' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Generate PDF Blob (no download) ──────────────────
export async function generatePvOfferServerPdfBlob(
  element: HTMLElement,
  filename: string
): Promise<Blob> {
  // ─── 1. Clone and strip UI elements ─────────────────
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.no-print, .pv-print-controls, .mobile-info-banner')
    .forEach((el) => el.remove());

  // Remove the hiding class so the clone is visible when rendered by Chromium
  clone.classList.remove('pv-print-doc-source');
  clone.style.position = 'static';
  clone.style.left = 'auto';
  clone.style.top = 'auto';
  clone.style.opacity = '1';
  clone.style.pointerEvents = 'auto';
  clone.style.width = '100%';

  // ─── 2. Load assets as data URLs ────────────────────
  const [logoDataUrl, heroDataUrl] = await Promise.all([
    assetToDataUrl('/metical-logo-light.png'),
    assetToDataUrl('/pv-offer-hero.png'),
  ]);

  console.log('[PDF CLIENT] logo loaded:', !!logoDataUrl);
  console.log('[PDF CLIENT] hero loaded:', !!heroDataUrl);

  // ─── 3. Replace asset references in clone ───────────
  if (logoDataUrl) {
    const logoImg = clone.querySelector('img[src*="metical-logo-light"]') as HTMLImageElement | null;
    if (logoImg) logoImg.src = logoDataUrl;
  }

  if (heroDataUrl) {
    const heroEl = clone.querySelector('.pv-hero') as HTMLElement | null;
    if (heroEl) {
      heroEl.style.backgroundImage = `url("${heroDataUrl}")`;
    }
  }

  // ─── 4. Collect all CSS as text ─────────────────────
  let cssText = '';

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules || []);
      cssText += rules.map((rule) => rule.cssText).join('\n') + '\n';
    } catch {
      // Cross-origin stylesheets — skip (their rules are inaccessible)
    }
  }

  cssText += '\n' + Array.from(document.querySelectorAll('style'))
    .map((style) => style.textContent || '')
    .join('\n');

  // ─── 5. Build payload ──────────────────────────────
  const html = clone.outerHTML;

  console.log('[PDF CLIENT] html length:', html.length);
  console.log('[PDF CLIENT] cssText length:', cssText.length);
  console.log('[PDF CLIENT] request start');

  // ─── 6. POST to Vercel API ──────────────────────────
  const response = await fetch('/api/generate-pv-offer-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html,
      cssText,
      origin: window.location.origin,
      filename,
    }),
  });

  console.log('[PDF CLIENT] response status:', response.status);
  console.log('[PDF CLIENT] content-type:', response.headers.get('content-type'));

  // ─── 7. Validate response ──────────────────────────
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Brak odpowiedzi');
    console.error('[PDF CLIENT] server error:', errorText);
    throw new Error(`Server PDF error (${response.status}): ${errorText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/pdf')) {
    const bodyText = await response.text().catch(() => '');
    console.error('[PDF CLIENT] unexpected content-type:', contentType, bodyText);
    throw new Error(`Unexpected response type: ${contentType}`);
  }

  // ─── 8. Return blob ────────────────────────────────
  const blob = await response.blob();
  console.log('[PDF CLIENT] blob size:', blob.size);

  if (blob.size === 0) {
    throw new Error('Received empty PDF from server');
  }

  return blob;
}

// ─── Download / share a PDF blob ──────────────────────
export function downloadPdfBlob(blob: Blob, filename: string): void {
  const safeName = `${filename}.pdf`;
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // ── iOS: prefer Web Share API for native save-to-files ──
  if (isIOS) {
    try {
      const pdfFile = new File([blob], safeName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        navigator.share({ files: [pdfFile], title: filename }).catch((shareErr) => {
          // User cancelled share — do NOT open blob URL (that causes the blank page)
          console.warn('[PDF CLIENT] Web Share cancelled/failed:', shareErr);
        });
        return;
      }
    } catch {
      // File constructor or canShare not supported — fall through to <a> download
    }
  }

  // ── Universal: single <a download> click ──
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  // Hide the element so it cannot interact with page layout / events
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  // Clean up synchronously (element) + async (blob URL)
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ─── Legacy combined function ─────────────────────────
export async function exportPvOfferServerPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const blob = await generatePvOfferServerPdfBlob(element, filename);
  downloadPdfBlob(blob, filename);
}
