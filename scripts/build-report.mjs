import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "../frontend/node_modules/playwright/index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "output/pdf");
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(path.join(root, "docs/RELATORIO.html"), "utf8");
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({
    path: path.join(out, "FlowCity-Relatorio-Tecnico.pdf"),
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    pageRanges: "1-7",
  });
  const preview = path.join(root, "tmp/pdfs");
  fs.mkdirSync(preview, { recursive: true });
  await page.emulateMedia({ media: "print" });
  const pages = page.locator(".page");
  for (let i = 0; i < (await pages.count()); i++) {
    const section = pages.nth(i);
    const overflow = await section.evaluate(
      (el) => el.scrollHeight > el.clientHeight + 2,
    );
    if (overflow) throw new Error(`Conteúdo excede a página ${i + 1}`);
    await section.screenshot({
      path: path.join(preview, `pagina-${i + 1}.png`),
    });
  }
  console.log("PDF e prévias gerados em output/pdf e tmp/pdfs.");
} finally {
  await browser.close();
}
