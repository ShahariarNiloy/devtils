/**
 * "Try a sample": the board's two-page tenancy agreement, built on the spot
 * with pdf-lib (loaded only when asked for). Fictional names throughout.
 */

const P1: [string, string][] = [
  ["", "This agreement is made between Harbor Lane Properties Ltd (“the Landlord”) and Ada Lovelace (“the Tenant”) for Flat 4B, 12 Elm Row (“the Property”)."],
  ["1. Term. ", "The tenancy starts on 1 December 2026 and runs for twelve months. Either party may end it at the end of the term with two months' written notice."],
  ["2. Rent. ", "Rent is paid monthly in advance on the first day of each month by bank transfer."],
  ["3. Deposit. ", "One month's rent, held in a protected scheme and returned within fourteen days of the end of the tenancy, less agreed deductions."],
  ["4. Repairs. ", "The Landlord keeps the structure, heating and hot water in good repair. The Tenant reports problems promptly."],
  ["5. House rules. ", "The Tenant follows the rules in Schedule A on page 2."],
  ["", "Signed by the parties on the dates below."],
];
const P2: [string, string][] = [
  ["A1. Access. ", "The Landlord may visit for inspections or repairs with at least 24 hours' notice, except in an emergency."],
  ["A2. Pets and smoking. ", "No smoking inside the Property. Pets only with the Landlord's written consent."],
  ["A3. Subletting. ", "The Property is a private home for the Tenant only. Subletting needs written consent."],
  ["A4. End of tenancy. ", "The Tenant returns all keys and leaves the Property as it was at the start, apart from fair wear and tear."],
  ["A5. Changes. ", "Changes to this agreement must be in writing and signed by both parties."],
];

export async function samplePdf(): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.setTitle("Residential tenancy agreement (sample)");
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.12, 0.11, 0.1);
  const soft = rgb(0.45, 0.43, 0.4);
  const W = 595;
  const H = 842;
  const M = 64;

  /** Word-wrapped paragraph with an optional bold lead-in; returns the next y. */
  const para = (page: ReturnType<typeof doc.addPage>, lead: string, text: string, y: number) => {
    const size = 10.5;
    const words = text.split(" ");
    let line = "";
    let x0 = M + (lead ? bold.widthOfTextAtSize(lead, size) + 1.5 : 0);
    if (lead) page.drawText(lead, { x: M, y, size, font: bold, color: ink });
    let first = true;
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (reg.widthOfTextAtSize(next, size) > W - M - x0) {
        page.drawText(line, { x: x0, y, size, font: reg, color: ink });
        y -= 15;
        line = w;
        if (first) {
          x0 = M;
          first = false;
        }
      } else line = next;
    }
    page.drawText(line, { x: x0, y, size, font: reg, color: ink });
    return y - 24;
  };
  const sigLine = (page: ReturnType<typeof doc.addPage>, x: number, y: number, w: number, label: string) => {
    page.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness: 0.8, color: soft });
    page.drawText(label, { x, y: y - 13, size: 8.5, font: reg, color: soft });
  };

  const p1 = doc.addPage([W, H]);
  p1.drawText("RESIDENTIAL TENANCY AGREEMENT", { x: M, y: H - 84, size: 15, font: bold, color: ink });
  p1.drawText("Fixed term · 12 months", { x: M, y: H - 104, size: 10, font: reg, color: soft });
  let y = H - 140;
  for (const [lead, text] of P1) y = para(p1, lead, text, y);
  sigLine(p1, M, 200, 250, "Landlord · Harbor Lane Properties Ltd");
  sigLine(p1, M + 300, 200, 167, "Date");
  sigLine(p1, M, 130, 250, "Tenant · Ada Lovelace");
  sigLine(p1, M + 300, 130, 167, "Date");

  const p2 = doc.addPage([W, H]);
  p2.drawText("SCHEDULE A — HOUSE RULES", { x: M, y: H - 84, size: 15, font: bold, color: ink });
  y = H - 124;
  for (const [lead, text] of P2) y = para(p2, lead, text, y);
  sigLine(p2, W - M - 120, 110, 120, "Tenant initials");

  return doc.save();
}
