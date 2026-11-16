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
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const errors = [],
  report = [],
  created = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
const click = (name) => page.getByRole("button", { name, exact: true }).click();
async function nav(path) {
  if (await page.locator(".menu-toggle").isVisible())
    await click("Alternar navegação");
  await page.locator(`nav a[href="${path}"]`).click();
  await page.waitForURL(`**${path}`);
}
async function calculate(expected) {
  await page
    .getByRole("button", {
      name: "Calcular capacidade disponível",
      exact: true,
    })
    .click();
  await page.waitForFunction(() => !document.querySelector(".loading-bar"));
  await nav("/resultados");
  await page.locator(".primary-metric strong").waitFor();
  assert.equal(
    Number(await page.locator(".primary-metric strong").textContent()),
    expected,
  );
}
try {
  await page.goto(origin + "/simulacoes");
  await page
    .locator("fc-resilience")
    .getByLabel("Estudo", { exact: true })
    .selectOption("abilene");
  await nav("/redes");
  await click("+ Nova rede");
  await page.waitForURL("**/editor");
  await page
    .getByLabel("Nome da rede", { exact: true })
    .fill("Editor guiado · " + Date.now());
  await page
    .getByLabel("Descrição e unidade de capacidade", { exact: true })
    .fill(
      "Rede temporária de teste. Capacidades em unidades de teste, não medições reais.",
    );
  assert.ok(
    !(await page
      .getByLabel("Identificador do ponto", { exact: true })
      .isVisible()),
  );
  for (const name of ["Matriz", "Filial"]) {
    await page.getByLabel("Nome do ponto", { exact: true }).fill(name);
    await click("Adicionar este ponto");
  }
  await page.waitForFunction(
    () =>
      document.querySelector(".graph-canvas")?._cyreg?.cy.nodes().length === 2,
  );
  const ids = await page
    .locator(".graph-canvas")
    .evaluate((el) => el._cyreg.cy.nodes().map((n) => n.data("originalId")));
  assert.equal(new Set(ids).size, 2);
  await click("Próximo: conectar os pontos ↗");
  await page.getByLabel("Capacidade da conexão", { exact: true }).fill("2.5");
  await page.getByRole("alert").filter({ hasText: "número inteiro" }).waitFor();
  assert.ok(
    await page
      .getByRole("button", { name: "Criar esta conexão", exact: true })
      .isDisabled(),
  );
  await page.getByLabel("Capacidade da conexão", { exact: true }).fill("100");
  await page
    .getByLabel("Criar também a conexão de volta, com a mesma capacidade", {
      exact: true,
    })
    .check();
  await click("Criar esta conexão");
  await page.waitForFunction(
    () =>
      document.querySelector(".graph-canvas")._cyreg.cy.edges().length === 2,
  );
  report.push(
    "Dois pontos criados sem IDs manuais e conexão de ida/volta; capacidade fracionária rejeitada",
  );
  const pending = page.waitForResponse(
    (r) => r.url().endsWith("/api/graphs") && r.request().method() === "POST",
  );
  await click("Analisar esta rede ↗");
  const response = await pending;
  assert.ok(response.ok());
  const graph = await response.json();
  created.push(graph.id);
  assert.equal(graph.nodes.length, 2);
  assert.equal(graph.edges.length, 2);
  assert.ok(graph.edges.every((e) => e.capacity === 100));
  await page.waitForURL("**/simulacoes#editable-network-analysis");
  await page.locator("#editable-network-analysis[open]").waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector('fc-resilience select[aria-label="Estudo"]')
        ?.value === "",
  );
  await calculate(100);
  report.push(
    "Continuar salva a rede e abre sua análise, sem usar o benchmark selecionado anteriormente; fluxo 100",
  );
  await nav("/editor");
  await page.waitForFunction(
    () => !!document.querySelector(".graph-canvas")?._cyreg?.cy,
  );
  const sourceId = graph.nodes[0].id;
  await page.locator(".graph-canvas").evaluate((el, id) => {
    el._cyreg.cy.getElementById("n:" + id).emit("tap");
  }, sourceId);
  await page
    .getByLabel("Nome do ponto selecionado", { exact: true })
    .fill("Matriz principal");
  await click("Aplicar à rede");
  await page
    .locator(".editor-item")
    .filter({ hasText: "Matriz principal → Filial" })
    .waitFor();
  await page
    .locator(".editor-item")
    .filter({ hasText: "Matriz principal → Filial" })
    .click();
  await page
    .getByLabel("Capacidade da conexão selecionada", { exact: true })
    .fill("60");
  await click("Aplicar à rede");
  await page
    .locator(".editor-item")
    .filter({ hasText: "Matriz principal → Filial" })
    .filter({ hasText: "Capacidade 60" })
    .waitFor();
  const changed = page.waitForResponse((r) => r.request().method() === "PUT");
  await click("Salvar rede");
  assert.ok((await changed).ok());
  const persisted = await (
    await page.request.get(origin + "/api/graphs/" + graph.id)
  ).json();
  assert.equal(persisted.edges.find((e) => e.source === sourceId).capacity, 60);
  assert.equal(
    persisted.edges.find((e) => e.target === sourceId).capacity,
    100,
  );
  await click("Analisar esta rede ↗");
  await page.waitForURL("**/simulacoes#editable-network-analysis");
  await calculate(60);
  report.push(
    "Seleção pelo mapa abre edição; nome e capacidade alterados, sentido reverso preservado; novo fluxo 60",
  );
  await nav("/editor");
  await click("Editar itens");
  await page.getByLabel("Encontrar um item", { exact: true }).fill("Filial");
  assert.ok((await page.locator(".editor-item").count()) >= 1);
  await page
    .getByLabel("Encontrar um item", { exact: true })
    .fill("sem-resultados-xyz");
  await page.getByText("Nenhum ponto encontrado.", { exact: true }).waitFor();
  await page.getByLabel("Encontrar um item", { exact: true }).fill("");
  // Mobile map selection must reveal an editable field rather than leaving it off screen.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await page.locator(".graph-canvas").evaluate((el, id) => {
    el._cyreg.cy.getElementById("n:" + id).emit("tap");
  }, graph.nodes[1].id);
  await page.getByLabel("Nome do ponto selecionado", { exact: true }).waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector(".selection-editor input") ===
      document.activeElement,
  );
  assert.ok(
    await page
      .getByLabel("Nome do ponto selecionado", { exact: true })
      .evaluate((el) => el === el.ownerDocument.activeElement),
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: new URL("artifacts/linkplan-editor-mobile.png", root).pathname,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.getByLabel("Aparência", { exact: true }).selectOption("dark");
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: new URL("artifacts/linkplan-editor-dark.png", root).pathname,
    fullPage: true,
  });
  await page.getByLabel("Aparência", { exact: true }).selectOption("light");
  await page.screenshot({
    path: new URL("artifacts/linkplan-editor-light.png", root).pathname,
    fullPage: true,
  });
  await click("Excluir ponto");
  await page
    .getByText("Nenhuma conexão encontrada.", { exact: true })
    .waitFor();
  const saving = page.waitForResponse((r) => r.request().method() === "PUT");
  await click("Salvar rede");
  assert.ok((await saving).ok());
  const after = await (
    await page.request.get(origin + "/api/graphs/" + graph.id)
  ).json();
  assert.equal(after.nodes.length, 1);
  assert.equal(after.edges.length, 0);
  assert.ok(
    await page
      .getByRole("button", { name: "Analisar esta rede ↗", exact: true })
      .isDisabled(),
  );
  report.push(
    "Busca, edição móvel com foco automático, temas claro/escuro e exclusão em cascata sem endpoints inválidos",
  );
  assert.deepEqual(errors, []);
  const result = { passed: true, report };
  await writeFile(
    new URL("artifacts/editor-validation.json", root),
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(e, report, errors);
  await page
    .screenshot({
      path: new URL("artifacts/editor-failure.png", root).pathname,
      fullPage: true,
      timeout: 5000,
    })
    .catch(() => {});
  throw e;
} finally {
  for (const id of created)
    await page.request.delete(origin + "/api/graphs/" + id);
  await browser.close();
}
