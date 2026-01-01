/**
 * ImageExportService - Renders text content as PNG image using HTML Canvas
 */
export class ImageExportService {
  /**
   * Render text content as PNG image
   */
  async renderContentAsImage(
    content: string,
    width: number = 800,
    height: number = 1000
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Configure text rendering
    ctx.fillStyle = 'black';
    ctx.font = '14px monospace';
    const lineHeight = 18;
    const margin = 40;
    const maxWidth = width - (margin * 2);

    // Split content into lines and wrap
    const lines = this.wrapText(content, ctx, maxWidth);

    // Render lines
    let y = margin;
    for (const line of lines) {
      if (y + lineHeight > height - margin) {
        // Reached bottom of canvas, add ellipsis
        ctx.fillText('...', margin, y);
        break;
      }
      ctx.fillText(line, margin, y);
      y += lineHeight;
    }

    // Add watermark
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.font = '10px sans-serif';
    ctx.fillText('Human+AI Provenance Demo - C2PA Signed', margin, height - 20);

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create image blob'));
        }
      }, 'image/png');
    });
  }

  /**
   * Wrap text to fit within maxWidth
   */
  private wrapText(text: string, ctx: CanvasRenderingContext2D, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      // Handle newlines in original text
      if (word.includes('\n')) {
        const parts = word.split('\n');
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) {
            // Push current line and start new one
            if (currentLine) {
              lines.push(currentLine);
              currentLine = '';
            }
          }
          const part = parts[i];
          if (part) {
            const testLine = currentLine ? `${currentLine} ${part}` : part;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = part;
            } else {
              currentLine = testLine;
            }
          }
        }
      } else {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Convert Blob to base64 string
   */
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Remove data URL prefix (e.g., "data:image/png;base64,")
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Download base64 image as file
   */
  downloadBase64AsFile(base64: string, filename: string): void {
    const blob = this.base64ToBlob(base64, 'image/png');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Convert base64 string to Blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
}

export const imageExportService = new ImageExportService();
