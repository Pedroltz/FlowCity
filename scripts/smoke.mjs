import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { mkdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(
  new URL("../frontend/package.json", import.meta.url),
);
const { chromium } = require("playwright");
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
const errors = [],
  report = [],
  created = new Set();
const origin = process.env.FLOWCITY_URL || "http://localhost:4200";
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
const click = (name) => page.getByRole("button", { name, exact: true }).click();
const heading = (name) =>
  page.getByRole("heading", { name, exact: true }).waitFor();
const idle = () =>
  page.waitForFunction(() => !document.querySelector(".loading-bar"));
async function navigate(path) {
  if (await page.locator(".menu-toggle").isVisible())
    await click("Alternar navegação");
  await page.locator(`nav a[href="${path}"]`).click();
  await page.waitForURL(`**${path}`);
  const headings = {
    "/redes": "Minhas redes",
    "/simulacoes": "Simulações",
    "/resultados": "Resultados",
  };
  if (headings[path]) await heading(headings[path]);
  if (path === "/dashboard")
    await page.getByRole("heading", { name: /Explore conexões/ }).waitFor();
  if (path === "/editor" || path === "/simulacoes") {
    await page.waitForFunction(
      () => !!document.querySelector(".graph-canvas")?._cyreg?.cy,
    );
  }
}
async function result(expected) {
  await idle();
  await navigate("/resultados");
  await page.locator(".primary-metric strong").waitFor();
  if (expected !== undefined)
    assert.equal(
      (await page.locator(".primary-metric strong").textContent()).trim(),
      String(expected),
    );
}
async function importDocument(document) {
  await navigate("/redes");
  const pending = page.waitForResponse(
    (r) => r.url().endsWith("/api/graphs") && r.request().method() === "POST",
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "network.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(document)),
  });
  const response = await pending;
  assert.ok(response.ok(), await response.text());
  const saved = await response.json();
  created.add(saved.id);
  await page
    .locator(".selection-card")
    .getByRole("heading", { name: saved.name, exact: true })
    .waitFor();
  await idle();
  return saved;
}
try {
  await page.goto(origin);
  await page.getByRole("heading", { name: /Explore conexões/ }).waitFor();
  await idle();
  const summaries = await (
    await page.request.get(`${origin}/api/graphs`)
  ).json();
  assert.ok(summaries.length > 0, "A API deve oferecer redes de demonstração.");
  assert.equal(
    Number(await page.locator(".stat-card strong").first().textContent()),
    summaries.length,
  );
  assert.equal(
    Number(await page.locator(".stat-card strong").nth(1).textContent()),
    summaries.reduce((sum, n) => sum + n.nodeCount, 0),
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/flowcity-dashboard.png",
    fullPage: true,
  });
  await navigate("/resultados");
  await heading("Seu próximo resultado começa com uma simulação.");
  report.push(
    "Dashboard com totais reais e resultados vazios antes do cálculo",
  );
  const small = summaries.find((n) => n.nodeCount === 6);
  assert.ok(small);
  const document = await (
    await page.request.get(`${origin}/api/graphs/${small.id}`)
  ).json();
  delete document.id;
  document.name = `Smoke · ${Date.now()}`;
  const saved = await importDocument(document);
  await navigate("/editor");
  await heading(saved.name);
  await click("Calcular fluxo máximo");
  await result(23);
  report.push("Importação isolada e fluxo máximo 23");
  await navigate("/editor");
  await page.locator(".graph-canvas").evaluate((el) =>
    el._cyreg.cy
      .edges()
      .filter((e) => e.data("originalId") === "e10")
      .emit("tap"),
  );
  await page
    .locator("fc-editor-tools mat-expansion-panel")
    .filter({ hasText: "Propriedades da seleção" })
    .getByLabel("Capacidade (veíc./min)", { exact: true })
    .fill("1");
  await click("Aplicar alteração");
  await navigate("/resultados");
  await heading("Seu próximo resultado começa com uma simulação.");
  await navigate("/editor");
  await click("Calcular fluxo máximo");
  await result(20);
  await navigate("/editor");
  await page
    .locator("fc-editor-tools mat-expansion-panel")
    .filter({ hasText: "Propriedades da seleção" })
    .getByLabel("Capacidade (veíc./min)", { exact: true })
    .fill("4");
  await click("Aplicar alteração");
  await click("Calcular fluxo máximo");
  await result(23);
  report.push(
    "Edição repetida, invalidação e estado entre rotas: 23 → 20 → 23",
  );
  await navigate("/simulacoes");
  await page.locator(".path-chip").first().click();
  assert.ok(
    await page
      .locator(".graph-canvas")
      .evaluate((el) => el._cyreg.cy.edges(".path-highlight").length > 0),
  );
  await click("Rede residual");
  assert.ok(
    await page
      .locator(".graph-canvas")
      .evaluate((el) => el._cyreg.cy.edges(".reverse").length > 0),
  );
  await page.getByRole("button", { name: /Iteração 1/ }).click();
  assert.match(await page.locator(".history").textContent(), /Gargalo/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/flowcity-simulations.png",
    fullPage: true,
  });
  await navigate("/resultados");
  await page.locator("progress").first().waitFor();
  assert.equal(await page.locator("progress").count(), saved.edges.length);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/flowcity-results.png",
    fullPage: true,
  });
  report.push(
    "Destaque de caminhos, gargalos, rede residual e utilização por aresta",
  );
  await navigate("/redes");
  const pendingDownload = page.waitForEvent("download");
  await click("Exportar JSON");
  const download = await pendingDownload;
  await download.saveAs("artifacts/exported-network.json");
  const exported = JSON.parse(
    await readFile("artifacts/exported-network.json", "utf8"),
  );
  assert.equal(exported.nodes.length, 6);
  assert.equal(exported.edges.length, 10);
  assert.ok(!exported.id);
  await page.getByRole("searchbox").fill(saved.name);
  await page.waitForFunction(
    () => document.querySelectorAll(".network-card").length === 1,
  );
  assert.equal(await page.locator(".network-card").count(), 1);
  await page.getByRole("searchbox").fill("nenhuma-rede-com-este-nome");
  await heading("Nenhuma rede encontrada");
  await page.getByRole("searchbox").fill("");
  report.push("Exportação JSON e pesquisa com estado vazio");
  for (const size of [20, 100]) {
    const summary = summaries.find((n) => n.nodeCount === size);
    if (!summary) continue;
    const doc = await (
      await page.request.get(`${origin}/api/graphs/${summary.id}`)
    ).json();
    delete doc.id;
    doc.name = `Smoke ${size} · ${Date.now()}`;
    const clone = await importDocument(doc);
    await navigate("/simulacoes");
    await click("Calcular fluxo máximo");
    await result();
    const value = (
      await page.locator(".primary-metric strong").textContent()
    ).trim();
    assert.ok(Number(value) > 0);
    report.push(`Rede de ${size} vértices: fluxo ${value}`);
    await navigate("/redes");
    const deletion = page.waitForResponse(
      (r) =>
        r.request().method() === "DELETE" &&
        r.url().endsWith(`/api/graphs/${clone.id}`),
    );
    await click("Excluir rede atual");
    assert.ok((await deletion).ok());
    await page
      .locator(".selection-card")
      .getByRole("heading", { name: "Nova rede", exact: true })
      .waitFor();
    await idle();
    created.delete(clone.id);
  }
  await importDocument({
    name: `Smoke reverso · ${Date.now()}`,
    nodes: ["S", "A", "B", "C", "D", "T"].map((id) => ({ id, name: id })),
    edges: [
      ["S", "A"],
      ["S", "B"],
      ["A", "C"],
      ["A", "D"],
      ["B", "C"],
      ["C", "T"],
      ["D", "T"],
    ].map(([source, target], i) => ({
      id: `r${i}`,
      source,
      target,
      capacity: 1,
    })),
  });
  await navigate("/simulacoes");
  await click("Calcular fluxo máximo");
  await result(2);
  await navigate("/simulacoes");
  await page.locator(".path-chip").last().click();
  assert.ok(
    await page
      .locator(".graph-canvas")
      .evaluate((el) =>
        el._cyreg.cy
          .edges(".reverse.path-highlight")
          .some(
            (e) =>
              e.source().data("originalId") === "C" &&
              e.target().data("originalId") === "A",
          ),
      ),
  );
  report.push("Trecho reverso destacado na direção C → A, com fluxo máximo 2");
  await importDocument({
    name: `Smoke mínimo · ${Date.now()}`,
    nodes: [
      { id: "A", name: "Entrada" },
      { id: "B", name: "Saída" },
    ],
    edges: [{ source: "A", target: "B", capacity: 9 }],
  });
  await navigate("/simulacoes");
  await click("Calcular fluxo máximo");
  await result(9);
  report.push("Importação mínima, layout automático e fluxo 9");
  await navigate("/editor");
  await page.getByRole("button", { name: "Adicionar vértices e vias" }).click();
  await page.getByLabel("ID do vértice", { exact: true }).fill("C");
  await page
    .getByLabel("Nome do cruzamento", { exact: true })
    .fill("Intermediário");
  await click("Adicionar vértice");
  await page
    .locator("summary")
    .filter({ hasText: "Selecionar vértice" })
    .click();
  await page
    .getByRole("button", { name: "C · Intermediário", exact: true })
    .click();
  await page.getByLabel("Nome", { exact: true }).fill("Renomeado");
  await click("Aplicar alteração");
  await page
    .getByRole("button", { name: "C · Renomeado", exact: true })
    .waitFor();
  await click("Remover seleção");
  await page
    .getByRole("button", { name: "C · Renomeado", exact: true })
    .waitFor({ state: "detached" });
  assert.equal(
    await page
      .getByRole("button", { name: "C · Renomeado", exact: true })
      .count(),
    0,
  );
  await page.getByLabel("Via: origem", { exact: true }).click();
  await page.getByRole("option", { name: "A · Entrada", exact: true }).click();
  await page.getByLabel("Via: destino", { exact: true }).click();
  await page.getByRole("option", { name: "B · Saída", exact: true }).click();
  await page
    .getByLabel("Capacidade (veíc./min)", { exact: true })
    .first()
    .fill("5");
  await click("Adicionar via");
  await page
    .getByRole("button", { name: "A → B · capacidade 5", exact: true })
    .click();
  await page
    .locator("fc-editor-tools mat-expansion-panel")
    .filter({ hasText: "Propriedades da seleção" })
    .getByLabel("Capacidade (veíc./min)", { exact: true })
    .fill("3");
  await click("Aplicar alteração");
  await page
    .getByRole("button", { name: "A → B · capacidade 3", exact: true })
    .waitFor();
  await click("Remover seleção");
  await page
    .getByRole("button", { name: "A → B · capacidade 3", exact: true })
    .waitFor({ state: "detached" });
  await click("Salvar rede");
  await idle();
  report.push(
    "Criação, edição e remoção de vértices e arestas por controles acessíveis",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/dashboard",
    "/redes",
    "/editor",
    "/simulacoes",
    "/resultados",
  ]) {
    await navigate(path);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Sem transbordamento em ${path}`,
    );
    assert.equal(await page.locator('nav a[aria-current="page"]').count(), 1);
    if (path === "/editor") {
      await page.waitForFunction(() => {
        const cy = document.querySelector(".graph-canvas")._cyreg.cy;
        return cy.nodes().every((n) => {
          const p = n.renderedPosition();
          return (
            p.x >= 0 && p.x <= cy.width() && p.y >= 0 && p.y <= cy.height()
          );
        });
      });
      await page.screenshot({
        path: "artifacts/flowcity-mobile.png",
        fullPage: true,
      });
    }
  }
  report.push(
    "Cinco rotas em 390 px sem transbordamento; canvas enquadrado e navegação ativa",
  );
  await page.setViewportSize({ width: 1500, height: 1100 });
  await navigate("/redes");
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"nodes":false}'),
  });
  await page.getByRole("alert").filter({ hasText: "JSON inválido" }).waitFor();
  await page.route("**/api/graphs", (route) => route.abort());
  await click("Recarregar redes");
  await page
    .getByRole("alert")
    .filter({ hasText: "Não foi possível acessar a API" })
    .waitFor();
  await page.unroute("**/api/graphs");
  await click("Recarregar redes");
  await idle();
  report.push("JSON inválido e falha de API com recuperação");
  await page.goto(`${origin}/editor`);
  await heading(small.name);
  await idle();
  assert.deepEqual(errors, []);
  report.push("Acesso direto à rota; nenhum erro JavaScript");
  let releaseList;
  await page.route("**/api/graphs", (route) => {
    releaseList = () =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
  });
  await page.goto(`${origin}/dashboard`);
  await page.getByRole("status").filter({ hasText: "Processando" }).waitFor();
  await page.getByRole("heading", { name: /Explore conexões/ }).waitFor();
  assert.equal(
    (await page.locator(".stat-card strong").first().textContent()).trim(),
    "—",
  );
  await releaseList();
  await idle();
  await page
    .getByText("Seu laboratório está pronto. Crie sua primeira rede.", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    (await page.locator(".stat-card strong").first().textContent()).trim(),
    "0",
  );
  await page.unroute("**/api/graphs");
  report.push(
    "Carregamento com métricas indisponíveis e biblioteca vazia sem dados inventados",
  );
  console.log(JSON.stringify({ passed: true, report }, null, 2));
} catch (e) {
  console.error(
    "Smoke failure:",
    e,
    "Browser errors:",
    errors,
    "Completed:",
    report,
  );
  await page
    .screenshot({
      path: "artifacts/smoke-failure.png",
      fullPage: true,
      timeout: 5000,
    })
    .catch(() => {});
  throw e;
} finally {
  for (const id of created)
    await page.request.delete(`${origin}/api/graphs/${id}`);
  await browser.close();
}
