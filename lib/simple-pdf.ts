const latin = (value: string) =>
  Buffer.from(value.normalize("NFC"), "latin1").toString("latin1");

const escapePdf = (value: string) =>
  latin(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

export type PdfLine = { text: string; bold?: boolean; size?: number; gap?: number };

export function createSimplePdf(title: string, lines: PdfLine[]) {
  const pages: PdfLine[][] = [];
  let page: PdfLine[] = [];
  let used = 0;
  for (const line of [{ text: title, bold: true, size: 18, gap: 12 }, ...lines]) {
    const height = (line.size || 10) + (line.gap || 5);
    if (used + height > 720 && page.length) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(line);
    used += height;
  }
  if (page.length) pages.push(page);

  const objects: string[] = [];
  const add = (content: string) => (objects.push(content), objects.length);
  const catalogId = add("");
  const pagesId = add("");
  const regularFontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const boldFontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pageIds: number[] = [];

  for (const pageLines of pages) {
    let y = 800;
    const commands = pageLines.map((line) => {
      const size = line.size || 10;
      y -= size + (line.gap || 5);
      return `BT /${line.bold ? "F2" : "F1"} ${size} Tf 42 ${y} Td (${escapePdf(line.text)}) Tj ET`;
    }).join("\n");
    const streamId = add(`<< /Length ${Buffer.byteLength(commands, "latin1")} >>\nstream\n${commands}\nendstream`);
    const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${streamId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let output = "%PDF-1.4\n%âãÏÓ\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output, "latin1"));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(output, "latin1");
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output, "latin1");
}
