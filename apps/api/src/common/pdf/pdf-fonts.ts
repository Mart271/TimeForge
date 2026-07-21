import path from 'path';
import type PDFDocument from 'pdfkit';

/**
 * PDFKit's built-in "Helvetica"/"Helvetica-Bold" are the base-14 PDF fonts,
 * which only support WinAnsi encoding — no ₱ (U+20B1). Every PDF export that
 * prints a peso amount with the default font silently mis-renders it (shows
 * as "±" or similar). DejaVu Sans covers the full Currency Symbols block
 * (including ₱) plus standard Latin text, so every PDFKit document should
 * register and use it instead of the default Helvetica.
 *
 * Bundled under assets/fonts/ (Bitstream Vera license — see DejaVu-LICENSE.txt).
 * Resolved from process.cwd() since both the API and worker processes run
 * from the repo root in dev (nest start) and in production (Docker WORKDIR /app).
 */
const REGULAR_PATH = path.join(process.cwd(), 'assets/fonts/DejaVuSans.ttf');
const BOLD_PATH = path.join(process.cwd(), 'assets/fonts/DejaVuSans-Bold.ttf');

export const PDF_FONT = 'Body';
export const PDF_FONT_BOLD = 'Body-Bold';

/** Registers the Unicode-capable font pair on a PDFDocument and sets it as the active font. */
export function registerPdfFonts(doc: PDFKit.PDFDocument): void {
  doc.registerFont(PDF_FONT, REGULAR_PATH);
  doc.registerFont(PDF_FONT_BOLD, BOLD_PATH);
  doc.font(PDF_FONT);
}
