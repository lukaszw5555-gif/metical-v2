/**
 * Triggers server-side PDF generation by sending HTML and styles to Vercel API.
 * This service extracts the current state of the print document and requests 
 * a pixel-perfect PDF rendering from the server.
 */
export async function exportPvOfferServerPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  // Capture the current HTML of the document container
  const html = element.outerHTML;
  
  // Collect all external stylesheets currently loaded
  const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map(link => (link as HTMLLinkElement).href);
    
  // Collect all inline styles currently loaded
  const inlineStyles = Array.from(document.querySelectorAll('style'))
    .map(style => style.textContent || '');

  // Call the Vercel Serverless Function
  const response = await fetch('/api/generate-pv-offer-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      html,
      stylesheets,
      inlineStyles,
      origin: window.location.origin,
      filename
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Błąd połączenia z serwerem' }));
    throw new Error(err.error || 'Nie udało się wygenerować PDF na serwerze');
  }

  // Receive the binary PDF blob
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  
  // Create a temporary link to trigger the download
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Fallback for iOS Safari: opening the blob URL in a new tab 
  // allows the user to use native share/save features.
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    window.open(url, '_blank');
  }

  // Cleanup: revoke the blob URL after a short delay to ensure the browser has started the download
  setTimeout(() => window.URL.revokeObjectURL(url), 500);
}
