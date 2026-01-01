import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import type { C2PAExternalManifest } from '../types/c2pa';

export class PDFExportService {
  /**
   * Create a PDF with embedded C2PA manifest
   * The manifest is attached as a file attachment for verification
   */
  async createPDFWithManifest(
    content: string,
    manifest: C2PAExternalManifest,
    title?: string
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    // Set PDF metadata
    pdfDoc.setTitle(title || 'Human+AI Document');
    pdfDoc.setCreator('Human+AI Provenance Demo');
    pdfDoc.setProducer('Human+AI Provenance Demo/1.0.0');
    pdfDoc.setCreationDate(new Date());

    // Embed font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Add content pages
    const fontSize = 12;
    const lineHeight = 14;
    const margin = 50;
    const maxWidth = 500;

    const lines = this.wrapText(content, font, fontSize, maxWidth);
    const linesPerPage = 40;

    for (let i = 0; i < lines.length; i += linesPerPage) {
      const page = pdfDoc.addPage();
      const { height } = page.getSize();
      const pageLines = lines.slice(i, i + linesPerPage);

      pageLines.forEach((line, index) => {
        page.drawText(line, {
          x: margin,
          y: height - margin - index * lineHeight,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      });
    }

    // Embed C2PA manifest as file attachment
    const manifestJson = JSON.stringify(manifest, null, 2);
    const manifestBytes = new TextEncoder().encode(manifestJson);

    await pdfDoc.attach(manifestBytes, 'c2pa-manifest.json', {
      mimeType: 'application/json',
      description: 'C2PA Content Credentials Manifest',
      creationDate: new Date(),
      modificationDate: new Date(),
    });

    // Add C2PA metadata to PDF custom properties
    pdfDoc.setKeywords(['C2PA', 'Content Credentials', 'Provenance', 'Human+AI Demo']);

    // Note: For full C2PA compliance with JUMBF embedding,
    // use @contentauth/c2pa-node on the backend
    // This demo embeds the manifest as an attachment for educational purposes

    return pdfDoc.save();
  }

  /**
   * Wrap text to fit within maxWidth
   */
  private wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    const lines: string[] = [];
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        lines.push('');
        continue;
      }

      const words = paragraph.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);

        if (width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }
    }

    return lines;
  }
}

export const pdfExportService = new PDFExportService();
