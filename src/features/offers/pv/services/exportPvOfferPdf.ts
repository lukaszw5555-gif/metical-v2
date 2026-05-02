import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Captures a DOM element and exports it as an A4 PDF file.
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
  const MARGIN = 8; // mm margin inside the PDF page
  const CONTENT_W = A4_W - MARGIN * 2;
  const CONTENT_H = A4_H - MARGIN * 2;

  // Render the element to canvas at 2x scale for quality
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgWidthPx = canvas.width;
  const imgHeightPx = canvas.height;

  // Calculate how the image maps to PDF content area
  const ratio = CONTENT_W / imgWidthPx;

  const pdf = new jsPDF('p', 'mm', 'a4');

  let remainingHeightPx = imgHeightPx;
  let srcY = 0;
  let page = 0;

  while (remainingHeightPx > 0) {
    if (page > 0) pdf.addPage();

    // How many source pixels fit on one page
    const pageHeightPx = Math.min(remainingHeightPx, CONTENT_H / ratio);

    // Create a sub-canvas for this page slice
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
}
