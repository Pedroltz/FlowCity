import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(
  new URL("../frontend/package.json", import.meta.url),
);
const { chromium } = require("playwright");
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
import { mkdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("dialog", (dialog) => dialog.accept());
const report = [];
const click = (name) => page.getByRole("button", { name, exact: true }).click();
const waitResult = () => page.locator(".primary-metric strong").waitFor();
try {
  await page.goto("http://localhost:4200");
  await page.getByRole("button", { name: /Centro · 6 cruzamentos/ }).click();
  await page
    .getByRole("heading", { name: "Centro · 6 cruzamentos", exact: true })
    .waitFor();
  await click("Calcular fluxo máximo");
  await waitResult();
  assert.equal(
    (await page.locator(".primary-metric strong").textContent()).trim(),
    "23",
  );
  report.push("Rede pequena: fluxo 23");
  await page.locator(".graph-canvas").evaluate((element) =>
    element._cyreg.cy
      .edges()
      .filter((e) => e.data("originalId") === "e10")
      .emit("tap"),
  );
  await page
    .getByLabel("Capacidade (veíc./min)", { exact: true })
    .last()
    .fill("1");
  await click("Aplicar alteração");
  await page.locator(".primary-metric").waitFor({ state: "detached" });
  await click("Calcular fluxo máximo");
  await waitResult();
  assert.equal(
    (await page.locator(".primary-metric strong").textContent()).trim(),
    "20",
  );
  report.push("Edição visual de D→T: capacidade 4→1, fluxo 23→20");
  // A seleção deve continuar apontando para a entidade atual após salvar/calcular.
  await page
    .getByLabel("Capacidade (veíc./min)", { exact: true })
    .last()
    .fill("4");
  await click("Aplicar alteração");
  await click("Calcular fluxo máximo");
  await waitResult();
  assert.equal(
    (await page.locator(".primary-metric strong").textContent()).trim(),
    "23",
  );
  report.push("Segunda edição após salvar: capacidade restaurada, fluxo 23");
  await page.getByRole("button", { name: /Iteração 1/ }).click();
  assert.match(await page.locator(".history").textContent(), /Gargalo/);
  await click("Rede residual");
  const reverseCount = await page
    .locator(".graph-canvas")
    .evaluate((element) => element._cyreg.cy.edges(".reverse").length);
  assert.ok(reverseCount > 0);
  report.push(`Rede residual: ${reverseCount} arcos reversos visíveis`);
  await click("Fluxo calculado");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/flowcity-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Bairros · 20 cruzamentos/ }).click();
  await page
    .getByRole("heading", { name: "Bairros · 20 cruzamentos", exact: true })
    .waitFor();
  await click("Calcular fluxo máximo");
  await waitResult();
  const medium = (
    await page.locator(".primary-metric strong").textContent()
  ).trim();
  assert.notEqual(medium, "23");
  report.push(`Rede média: fluxo ${medium}`);
  await page
    .getByRole("button", { name: /Malha urbana · 100 cruzamentos/ })
    .click();
  await page
    .getByRole("heading", {
      name: "Malha urbana · 100 cruzamentos",
      exact: true,
    })
    .waitFor();
  await click("Calcular fluxo máximo");
  await waitResult();
  report.push(
    `Rede grande: fluxo ${(await page.locator(".primary-metric strong").textContent()).trim()}`,
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/flowcity-large.png",
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent("download");
  await click("Exportar JSON");
  const download = await downloadPromise;
  await download.saveAs("artifacts/exported-network.json");
  const exported = JSON.parse(
    await readFile("artifacts/exported-network.json", "utf8"),
  );
  assert.equal(exported.nodes.length, 100);
  assert.equal(exported.edges.length, 401);
  report.push("Exportação JSON: 100 vértices e 401 vias");
  await page.locator("input[type=file]").setInputFiles({
    name: "import.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        name: "Teste de importação navegador",
        nodes: [
          { id: "A", name: "Entrada" },
          { id: "B", name: "Saída" },
        ],
        edges: [{ source: "A", target: "B", capacity: 9 }],
      }),
    ),
  });
  await page
    .getByRole("heading", {
      name: "Teste de importação navegador",
      exact: true,
    })
    .waitFor();
  await click("Calcular fluxo máximo");
  await waitResult();
  assert.equal(
    (await page.locator(".primary-metric strong").textContent()).trim(),
    "9",
  );
  report.push("Importação mínima, layout automático e cálculo: fluxo 9");
  await click("Excluir rede atual");
  await page.getByRole("heading", { name: "Nova rede", exact: true }).waitFor();
  await page.getByRole("button", { name: /Centro · 6 cruzamentos/ }).click();
  await page
    .getByRole("heading", { name: "Centro · 6 cruzamentos", exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => {
    const cy = document.querySelector(".graph-canvas")._cyreg.cy;
    return cy.nodes().every((n) => {
      const p = n.renderedPosition();
      return p.x >= 0 && p.x <= cy.width() && p.y >= 0 && p.y <= cy.height();
    });
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/flowcity-mobile.png",
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  assert.deepEqual(errors, []);
  report.push(
    "Layout móvel sem transbordamento horizontal; nenhum erro JavaScript",
  );
  console.log(JSON.stringify({ passed: true, report }, null, 2));
} catch (error) {
  console.error("Browser errors:", errors);
  await page.screenshot({
    path: "artifacts/smoke-failure.png",
    fullPage: true,
  });
  throw error;
} finally {
  await browser.close();
}
