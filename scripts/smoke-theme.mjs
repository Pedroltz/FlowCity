import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(
  new URL("../frontend/package.json", import.meta.url),
);
const { chromium } = require("playwright");
const origin = process.env.FLOWCITY_URL || "http://localhost:4200";
const root = new URL("../", import.meta.url);
await mkdir(new URL("artifacts/", root), { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  colorScheme: "dark",
  viewport: { width: 1500, height: 1100 },
});
const page = await context.newPage();
const errors = [],
  report = [];
page.on("pageerror", (e) => errors.push(e.message));
const picker = () => page.getByLabel("Aparência", { exact: true });
async function theme(value, expected = value) {
  await picker().selectOption(value);
  await page.waitForFunction(
    (v) => document.documentElement.dataset.theme === v,
    expected,
  );
}
async function nav(path) {
  if (await page.locator(".menu-toggle").isVisible())
    await page
      .getByRole("button", { name: "Alternar navegação", exact: true })
      .click();
  await page.locator(`nav a[href="${path}"]`).click();
  await page.waitForURL(`**${path}`);
}
try {
  await page.goto(origin + "/dashboard");
  await picker().waitFor();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  assert.equal(await picker().inputValue(), "system");
  await theme("light");
  await page.reload();
  await picker().waitFor();
  assert.equal(await picker().inputValue(), "light");
  await page.emulateMedia({ colorScheme: "dark" });
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await theme("system", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  await theme("dark");
  await page.reload();
  await picker().waitFor();
  assert.equal(await picker().inputValue(), "dark");
  report.push(
    "Sistema acompanha mudanças de preferência; Claro/Escuro explícitos persistem após recarregar",
  );
  await page.locator(".network").first().waitFor();
  await page.waitForFunction(() => !document.querySelector(".loading-bar"));
  await page.screenshot({
    path: new URL("artifacts/linkplan-dark-dashboard.png", root).pathname,
    fullPage: true,
  });
  await nav("/editor");
  await page.waitForFunction(
    () =>
      document.querySelector(".graph-canvas")?._cyreg?.cy?.nodes().length > 0,
  );
  const snapshot = () =>
    page.locator(".graph-canvas").evaluate((el) => ({
      positions: el._cyreg.cy.nodes().map((n) => n.position()),
      zoom: el._cyreg.cy.zoom(),
    }));
  const before = await snapshot();
  await theme("light");
  await page.waitForFunction(
    () =>
      document
        .querySelector(".graph-canvas")
        ._cyreg.cy.nodes()
        .first()
        .style("color") === "rgb(48,43,73)",
  );
  await theme("dark");
  await page.waitForFunction(
    () =>
      document
        .querySelector(".graph-canvas")
        ._cyreg.cy.nodes()
        .first()
        .style("color") === "rgb(230,228,241)",
  );
  assert.deepEqual(await snapshot(), before);
  // Material's overlay is rendered outside the page, so inspect its actual themed surface.
  await page.locator(".editor-calculation > summary").click();
  await page.getByLabel("Origem", { exact: true }).click();
  await page.getByRole("listbox").waitFor();
  const overlay = await page.getByRole("listbox").evaluate((e) => ({
    bg: getComputedStyle(e).backgroundColor,
    color: getComputedStyle(e).color,
  }));
  assert.notEqual(overlay.bg, "rgb(255, 255, 255)");
  assert.notEqual(overlay.bg, overlay.color);
  await page.keyboard.press("Escape");
  report.push(
    "Canvas do editor troca cores sem alterar posições ou zoom; painel Angular Material usa a paleta escura",
  );
  await nav("/simulacoes");
  const form = page.locator("fc-resilience");
  await form.getByLabel("Estudo", { exact: true }).selectOption("abilene");
  const pending = page.waitForResponse(
    (r) => r.url().endsWith("/resilience") && r.request().method() === "POST",
  );
  await form
    .getByRole("button", { name: "Avaliar manutenção", exact: true })
    .click();
  assert.ok((await pending).ok());
  await page.getByTestId("scenario-flow").waitFor();
  const flow = await page.getByTestId("scenario-flow").textContent();
  await theme("light");
  await theme("dark");
  assert.equal(await page.getByTestId("scenario-flow").textContent(), flow);
  await page.waitForFunction(
    () =>
      document
        .querySelector(".study-canvas")
        ._cyreg.cy.nodes()
        .first()
        .style("color") === "rgb(230,228,241)",
  );
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: new URL("artifacts/linkplan-dark-planning.png", root).pathname,
    fullPage: true,
  });
  await nav("/resultados");
  await page.getByTestId("scenario-flow").waitFor();
  assert.equal(await page.getByTestId("scenario-flow").textContent(), flow);
  for (const path of [
    "/dashboard",
    "/redes",
    "/editor",
    "/simulacoes",
    "/resultados",
  ]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await nav(path);
    await page.waitForFunction(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    );
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: new URL("artifacts/linkplan-dark-mobile.png", root).pathname,
    fullPage: true,
  });
  report.push(
    "Planejamento e Resultados mantêm valores ao trocar tema; cinco rotas móveis sem overflow",
  );
  // A browser that blocks saving preferences must still allow switching for this session.
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page.reload();
  await picker().waitFor();
  await theme("light");
  await theme("dark");
  assert.deepEqual(errors, []);
  report.push(
    "Alternância funciona com armazenamento bloqueado e sem erros JavaScript",
  );
  const result = { passed: true, report };
  await writeFile(
    new URL("artifacts/theme-validation.json", root),
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(e, errors, report);
  await page
    .screenshot({
      path: new URL("artifacts/theme-failure.png", root).pathname,
      fullPage: true,
      timeout: 5000,
    })
    .catch(() => {});
  throw e;
} finally {
  await browser.close();
}
