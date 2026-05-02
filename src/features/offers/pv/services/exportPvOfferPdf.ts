import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Captures a DOM element and exports it as an A4 PDF file.
 * Forces a fixed 800px desktop-width layout before capture so that
 * mobile devices produce the same PDF as desktop.
 *
 * @param element  The HTML element to capture (should be the .pv-print-doc container)
 * @param filename The output filename (without extension)
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  // A4 dimensions in mm
  const A4_W = 210;
  const A4_H = 297;
  const MARGIN = 8;
  const CONTENT_W = A4_W - MARGIN * 2;
  const CONTENT_H = A4_H - MARGIN * 2;
  const CAPTURE_WIDTH = 800; // fixed desktop width in px

  // ─── Save original styles ──────────────────────────
  const saved = {
    width: element.style.width,
    maxWidth: element.style.maxWidth,
    minWidth: element.style.minWidth,
    transform: element.style.transform,
    transformOrigin: element.style.transformOrigin,
    overflow: element.style.overflow,
  };

  try {
    // ─── Force desktop-width layout ──────────────────
    element.style.width = `${CAPTURE_WIDTH}px`;
    element.style.maxWidth = `${CAPTURE_WIDTH}px`;
    element.style.minWidth = `${CAPTURE_WIDTH}px`;
    element.style.transform = 'none';
    element.style.transformOrigin = 'top left';
    element.style.overflow = 'visible';

    // Wait for one render frame so the browser reflows
    await new Promise(requestAnimationFrame);
    // Double-frame to be safe with images/fonts
    await new Promise(requestAnimationFrame);

    // ─── Adaptive scale (lower on mobile to avoid OOM) ─
    const isMobile = window.innerWidth < 768;
    const scale = isMobile ? 1.5 : 2;

    // ─── Capture ─────────────────────────────────────
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: CAPTURE_WIDTH,
      width: CAPTURE_WIDTH,
    });

    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;
    const ratio = CONTENT_W / imgWidthPx;

    const pdf = new jsPDF('p', 'mm', 'a4');

    let remainingHeightPx = imgHeightPx;
    let srcY = 0;
    let page = 0;

    while (remainingHeightPx > 0) {
      if (page > 0) pdf.addPage();

      const pageHeightPx = Math.min(remainingHeightPx, CONTENT_H / ratio);

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = imgWidthPx;
      pageCanvas.height = pageHeightPx;
      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          canvas,
          0, srcY, imgWidthPx, pageHeightPx,
          0, 0, imgWidthPx, pageHeightPx
        );
      }

      const pageImg = pageCanvas.toDataURL('image/png');
      const sliceHeightMm = pageHeightPx * ratio;

      pdf.addImage(pageImg, 'PNG', MARGIN, MARGIN, CONTENT_W, sliceHeightMm);

      srcY += pageHeightPx;
      remainingHeightPx -= pageHeightPx;
      page++;
    }

    pdf.save(`${filename}.pdf`);
  } finally {
    // ─── Always restore original styles ──────────────
    element.style.width = saved.width;
    element.style.maxWidth = saved.maxWidth;
    element.style.minWidth = saved.minWidth;
    element.style.transform = saved.transform;
    element.style.transformOrigin = saved.transformOrigin;
    element.style.overflow = saved.overflow;
  }
}
