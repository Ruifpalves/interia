import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { renderPdfHtml, type PdfPayload } from "./template";

// Renders the dossier PDF using Puppeteer with the serverless Chromium binary.
// On Vercel Functions this works out of the box; locally it falls back to a
// system Chrome via PUPPETEER_EXECUTABLE_PATH if set.

export async function renderDossierPdf(payload: PdfPayload): Promise<Buffer> {
  const html = renderPdfHtml(payload);
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ?? (await chromium.executablePath());

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1920, height: 1080 },
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 60_000 });
    const buffer = await page.pdf({
      width: "297mm",
      height: "167mm",
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(buffer);
  } finally {
    await browser.close();
  }
}
