// Reproduce the single-physical-link experiment against a locally running API.
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
const origin = process.env.FLOWCITY_API_URL || "http://localhost:5000";
async function read(path, body) {
  const response = await fetch(
    origin + path,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}
const featuredStudies = new Set(["abilene", "atlanta", "ta2"]);
const studies = (await read("/api/case-studies")).filter((study) =>
    featuredStudies.has(study.id),
  ),
  cases = [];
for (const study of studies) {
  const source = study.graph.nodes[0].id,
    sink = study.graph.nodes.at(-1).id;
  const baseline = await read(`/api/case-studies/${study.id}/resilience`, {
    source,
    sink,
    failedLinkIds: [],
  });
  let best = null;
  for (const link of study.links) {
    const result = await read(`/api/case-studies/${study.id}/resilience`, {
      source,
      sink,
      failedLinkIds: [link.id],
    });
    if (!best || result.lostCapacity > best.result.lostCapacity)
      best = { link, result };
  }
  cases.push({
    study: study.id,
    source,
    sink,
    unit: study.unit,
    baseline: baseline.baseline.maxFlow,
    failedLinkIds: [best.link.id],
    remaining: best.result.scenario.maxFlow,
    lost: best.result.lostCapacity,
    lossPercent: best.result.lossPercent,
    baselineCut: best.result.baselineCut.capacity,
    scenarioCut: best.result.scenarioCut.capacity,
    examinedSingleFailures: study.links.length,
  });
}
const output =
  process.env.FLOWCITY_RESILIENCE_OUTPUT ||
  new URL("../artifacts/resilience-experiment.json", import.meta.url).pathname;
await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  JSON.stringify(
    {
      executedAt: new Date().toISOString(),
      method:
        "Original plus each single physical-link failure; retain largest absolute loss, ties follow source-file order. This is an offline experiment, not an automatic product ranking.",
      cases,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ output, cases }, null, 2));
