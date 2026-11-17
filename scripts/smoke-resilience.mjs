import { createRequire } from "node:module";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(
  new URL("../frontend/package.json", import.meta.url),
);
const { chromium } = require("playwright");
const origin = process.env.FLOWCITY_URL || "http://localhost:4200";
const root = new URL("../", import.meta.url);
await mkdir(new URL("artifacts/", root), { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
const errors = [],
  report = [],
  created = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
const form = () => page.locator("fc-resilience");
const physicalCheckbox = (link) =>
  form().getByRole("checkbox", {
    name: [
      link.source,
      link.directed ? "→" : "↔",
      link.target,
      "·",
      link.id,
    ].join(" "),
    exact: true,
    includeHidden: true,
  });
async function nav(path) {
  if (await page.locator(".menu-toggle").isVisible())
    await page
      .getByRole("button", { name: "Alternar navegação", exact: true })
      .click();
  await page.locator(`nav a[href="${path}"]`).click();
  await page.waitForURL(`**${path}`);
  await page.locator("h1").waitFor();
}
async function analyze() {
  const response = page.waitForResponse(
    (r) => r.url().includes("/resilience") && r.request().method() === "POST",
  );
  await form()
    .getByRole("button", { name: "Avaliar manutenção", exact: true })
    .click();
  const r = await response;
  assert.ok(r.ok(), await r.text());
  const value = await r.json();
  await page.getByTestId("scenario-flow").waitFor();
  const displayed = form().locator(".stats-grid .stat-card strong");
  assert.equal(
    Number(await displayed.nth(0).innerText()),
    value.baseline.maxFlow,
  );
  assert.equal(
    Number(await displayed.nth(1).innerText()),
    value.scenario.maxFlow,
  );
  assert.equal(Number(await displayed.nth(2).innerText()), value.lostCapacity);
  const displayedPercent = (await displayed.nth(3).innerText()).trim();
  if (value.lossPercent === null) {
    assert.equal(displayedPercent, "Não se aplica");
  } else {
    assert.ok(
      Math.abs(
        Number(displayedPercent.replace("%", "").replace(",", ".")) -
          value.lossPercent,
      ) < 0.0051,
      `Percentual exibido ${displayedPercent} diverge de ${value.lossPercent}`,
    );
  }
  return value;
}
try {
  await page.goto(origin + "/simulacoes");
  await form()
    .getByLabel("Rede para analisar", { exact: true })
    .locator('option[value="sndlib:abilene"]')
    .waitFor({ state: "attached" });
  const studies = await (
    await page.request.get(origin + "/api/case-studies")
  ).json();
  assert.equal(studies.length, 26);
  const savedGraphs = await (
    await page.request.get(origin + "/api/graphs")
  ).json();
  const residualNetworks = savedGraphs.filter((graph) =>
    graph.name.startsWith("Rede residual "),
  );
  assert.equal(residualNetworks.length, 3);
  for (const network of residualNetworks) {
    const graph = await (
      await page.request.get(`${origin}/api/graphs/${network.id}`)
    ).json();
    await form()
      .getByLabel("Rede para analisar", { exact: true })
      .selectOption(`custom:${network.id}`);
    await page.locator(".study-canvas").waitFor();
    assert.equal(
      await form().getByLabel("Origem", { exact: true }).inputValue(),
      "s",
    );
    assert.equal(
      await form().getByLabel("Destino", { exact: true }).inputValue(),
      "t",
    );
    assert.ok(graph.nodes.every((node) => node.id === node.name));
    const original = await analyze();
    assert.equal(original.baseline.maxFlow, original.scenario.maxFlow);
    assert.equal(original.lostCapacity, 0);
    if (graph.nodes.length === 6) assert.equal(original.baseline.maxFlow, 23);

    if (graph.nodes.length === 6) {
      const links = form()
        .locator("details")
        .filter({ hasText: "Escolher conexões para a manutenção" });
      await links.locator("summary").click();
      for (const edge of graph.edges)
        await physicalCheckbox({ ...edge, directed: true }).check();
      const disconnected = await analyze();
      assert.equal(disconnected.scenario.maxFlow, 0);
      assert.equal(disconnected.scenario.iterations, 0);
      assert.equal(disconnected.lostCapacity, disconnected.baseline.maxFlow);
      assert.equal(disconnected.lossPercent, 100);
      await links.locator("summary").click();
    }
    report.push(
      `${network.name}: rótulos, origem/destino, fluxo e perda total exibidos corretamente`,
    );
  }
  for (const study of studies) {
    await form()
      .getByLabel("Rede para analisar", { exact: true })
      .selectOption(`sndlib:${study.id}`);
    assert.equal(
      await form()
        .getByLabel("Rede para analisar", { exact: true })
        .inputValue(),
      `sndlib:${study.id}`,
    );
    await page.locator(".study-canvas").waitFor();
    const original = await analyze();
    assert.equal(original.baseline.maxFlow, original.scenario.maxFlow);
    assert.equal(original.lostCapacity, 0);
    const expectedFailures = {
      abilene: "ATLAM5_ATLAng",
      atlanta: "L15",
      ta2: "L1_N1_N31",
    };
    const failure =
      study.links.find((link) => link.id === expectedFailures[study.id]) ??
      study.links[0];
    assert.ok(failure, `Enlace de teste para ${study.id}`);
    await form()
      .locator("details")
      .filter({ hasText: "Escolher conexões para a manutenção" })
      .locator("summary")
      .click();
    await physicalCheckbox(failure).check();
    await page.getByTestId("scenario-flow").waitFor({ state: "detached" });
    const failed = await analyze();
    assert.ok(failed.scenario.maxFlow <= failed.baseline.maxFlow);
    assert.equal(
      failed.lostCapacity,
      failed.baseline.maxFlow - failed.scenario.maxFlow,
    );
    if (failed.baseline.maxFlow > 0) {
      assert.ok(
        Math.abs(
          failed.lossPercent -
            (failed.lostCapacity / failed.baseline.maxFlow) * 100,
        ) < 1e-9,
      );
    } else {
      assert.equal(failed.lossPercent, null);
    }
    for (const id of failure.edgeIds) {
      const e = failed.scenario.edges.find((e) => e.id === id);
      assert.equal(e.capacity, 0);
      assert.equal(e.flow, 0);
    }
    await page.waitForFunction(
      (expectedCount) =>
        document.querySelector(".study-canvas")?._cyreg?.cy?.edges(".failed")
          .length === expectedCount,
      failure.edgeIds.length,
    );
    if (study.id === "atlanta") {
      await physicalCheckbox(failure).uncheck();
      const redundantLink = study.links.find((link) => link.id === "L1");
      await physicalCheckbox(redundantLink).check();
      const rerouted = await analyze();
      assert.equal(rerouted.scenario.maxFlow, rerouted.baseline.maxFlow);
      assert.equal(rerouted.lostCapacity, 0);
      await form().getByTestId("rerouted-flow").waitFor();
      await physicalCheckbox(redundantLink).uncheck();
      await physicalCheckbox(failure).check();
      const restoredFailure = await analyze();
      assert.equal(restoredFailure.scenario.maxFlow, 1000);
      assert.equal(restoredFailure.lostCapacity, 3000);
    }
    await page
      .getByRole("button", { name: "Antes da manutenção", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector(".study-canvas")._cyreg.cy.edges(".failed")
          .length === 0,
    );
    await page.locator(".technical-details > summary").click();
    if (original.baseline.augmentingPaths.length) {
      await page.locator("fc-resilience-comparison .path-chip").first().click();
      await page.waitForFunction(
        () =>
          document.querySelector(".study-canvas")._cyreg.cy.edges(".highlight")
            .length > 0,
      );
    }
    if (original.baseline.maxFlow > 0) {
      await page
        .getByRole("button", { name: "Residual do benchmark", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          document.querySelector(".study-canvas")._cyreg.cy.edges(".reverse")
            .length > 0,
      );
    }
    await nav("/resultados");
    await page.getByTestId("scenario-flow").waitFor();
    assert.equal(
      Number(await page.getByTestId("baseline-flow").textContent()),
      original.baseline.maxFlow,
    );
    await page.locator(".technical-details > summary").click();
    await page
      .getByRole("heading", {
        name: "Fluxos e utilização do benchmark",
        exact: true,
      })
      .waitFor();
    await nav("/simulacoes");
    await form().getByLabel("Rede para analisar", { exact: true }).waitFor();
    await page.waitForFunction(
      (id) =>
        document.querySelector(
          'fc-resilience select[aria-label="Rede para analisar"]',
        )?.value === `sndlib:${id}`,
      study.id,
    );
    assert.equal(
      await form()
        .getByLabel("Rede para analisar", { exact: true })
        .inputValue(),
      `sndlib:${study.id}`,
    );
    assert.ok(await physicalCheckbox(failure).isChecked());
    report.push(
      `${study.id}: cálculo, falha na direção modelada, corte, caminho, residual e estado entre rotas`,
    );
  }
  await page
    .getByRole("button", { name: "Durante a manutenção", exact: true })
    .click();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: new URL("artifacts/flowcity-resilience-desktop.png", root).pathname,
    fullPage: true,
  });
  // Selection changes invalidate old comparisons and failed endpoints cannot be submitted.
  const source = await form()
    .getByLabel("Origem", { exact: true })
    .inputValue();
  await form().getByLabel("Destino", { exact: true }).selectOption(source);
  assert.ok(
    await form()
      .getByRole("button", { name: "Avaliar manutenção", exact: true })
      .isDisabled(),
  );
  await page.getByTestId("scenario-flow").waitFor({ state: "detached" });
  await form()
    .getByLabel("Rede para analisar", { exact: true })
    .selectOption("sndlib:abilene");
  await analyze();
  const required = form().getByLabel("Capacidade necessária", { exact: true });
  await required.fill("1");
  await page
    .getByRole("heading", {
      name: "Capacidade suficiente no modelo analisado",
      exact: true,
    })
    .waitFor();
  await required.fill("999999999");
  await page
    .getByRole("heading", {
      name: "Capacidade insuficiente durante a manutenção",
      exact: true,
    })
    .waitFor();
  await required.fill("-1");
  assert.ok(
    await form()
      .getByRole("button", { name: "Avaliar manutenção", exact: true })
      .isDisabled(),
  );
  await required.fill("");
  await page
    .getByRole("heading", {
      name: "Capacidade insuficiente durante a manutenção",
      exact: true,
    })
    .waitFor({ state: "detached" });
  report.push(
    "Necessidade informada: margem, déficit, ausência de requisito e validação de valor negativo",
  );
  await form().getByText("Sobre os dados desta rede", { exact: true }).click();
  const pending = page.waitForResponse(
    (r) => r.url().endsWith("/api/graphs") && r.request().method() === "POST",
  );
  await form()
    .getByRole("button", { name: "Criar cópia editável", exact: true })
    .click();
  const copyResponse = await pending;
  assert.ok(copyResponse.ok());
  const copy = await copyResponse.json();
  created.push(copy.id);
  await page.waitForURL("**/editor");
  await page
    .getByRole("heading", { name: "ABILENE · cópia editável", exact: true })
    .waitFor();
  assert.match(copy.description, /Fonte:/);
  assert.match(copy.description, /Unidade:/);
  await page
    .getByLabel("Nome da rede", { exact: true })
    .fill("Cópia alterada pelo teste");
  const save = page.waitForResponse((r) => r.request().method() === "PUT");
  await page.getByRole("button", { name: "Salvar rede", exact: true }).click();
  assert.ok((await save).ok());
  const unchanged = await (
    await page.request.get(origin + "/api/case-studies/abilene")
  ).json();
  assert.equal(unchanged.graph.name, "ABILENE");
  report.push(
    "Cópia editável preserva fonte e unidade; edição não modifica catálogo",
  );
  await nav("/simulacoes");
  const study = studies.find((s) => s.id === "abilene");
  // All physical links failed: no path.
  for (const link of study.links) {
    const checkbox = physicalCheckbox(link);
    if (!(await checkbox.isVisible()))
      await form()
        .locator("details")
        .filter({ hasText: "Escolher conexões para a manutenção" })
        .locator("summary")
        .click();
    await checkbox.check();
  }
  const disconnected = await analyze();
  assert.equal(disconnected.scenario.maxFlow, 0);
  assert.equal(disconnected.scenario.iterations, 0);
  assert.equal(disconnected.lostCapacity, disconnected.baseline.maxFlow);
  assert.equal(
    disconnected.lossPercent,
    disconnected.baseline.maxFlow > 0 ? 100 : null,
  );
  report.push(
    "Todos os enlaces indisponíveis: fluxo zero e nenhum caminho aumentante",
  );
  await page.route("**/resilience", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Indisponibilidade de teste" }),
    }),
  );
  await form()
    .getByRole("button", { name: "Avaliar manutenção", exact: true })
    .click();
  await form()
    .getByRole("alert")
    .filter({ hasText: "Indisponibilidade de teste" })
    .waitFor();
  await page.unroute("**/resilience");
  await analyze();
  report.push("Erro da análise com recuperação e sem resultado obsoleto");
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/simulacoes", "/resultados", "/redes"]) {
      await nav(path);
      if (path != "/redes") await page.locator(".study-canvas").waitFor();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${path} sem overflow em ${width}`,
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await nav("/resultados");
  await page.locator(".study-canvas").waitFor();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: new URL("artifacts/flowcity-resilience-mobile.png", root).pathname,
    fullPage: true,
  });
  report.push("Simulações, Resultados e catálogo sem overflow em 390 e 768 px");
  assert.deepEqual(errors, []);
  const result = { passed: true, executedAt: new Date().toISOString(), report };
  await writeFile(
    new URL("artifacts/resilience-validation.json", root),
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
  // Verify local provenance hashes without contacting external sources.
  const crypto = await import("node:crypto");
  for (const study of studies) {
    const raw = await readFile(
      new URL(`datasets/case-studies/originals/${study.id}.xml`, root),
    );
    assert.equal(
      crypto.createHash("sha256").update(raw).digest("hex"),
      study.sha256,
    );
  }
} catch (e) {
  console.error(e, report, errors);
  await page
    .screenshot({
      path: new URL("artifacts/resilience-failure.png", root).pathname,
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
