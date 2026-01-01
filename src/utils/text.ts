/**
 * Wrap text to fit within a maximum width using word boundaries
 *
 * @param text - The text to wrap
 * @param maxWidth - Maximum width in the same units as the measurement function
 * @param measureWidth - Function to measure the width of a text string
 * @returns Array of wrapped lines
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measureWidth: (text: string) => number
): string[] {
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
      const width = measureWidth(testLine);

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
