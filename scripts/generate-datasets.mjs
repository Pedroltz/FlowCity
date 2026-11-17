// Simulações determinísticas, sem dependências e sem dados geográficos reais.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const directory = fileURLToPath(new URL("../datasets/", import.meta.url));
mkdirSync(directory, { recursive: true });
function write(name, graph) {
  writeFileSync(
    `${directory}/${name}.json`,
    JSON.stringify(graph, null, 2) + "\n",
  );
}
const smallNodes = [
  ["s", 80, 180],
  ["a", 250, 80],
  ["b", 420, 80],
  ["c", 250, 280],
  ["d", 420, 280],
  ["t", 590, 180],
];
write("01-pequeno", {
  name: "Rede residual pequena · 6 nós",
  description:
    "Instância sintética pequena para testar fluxo máximo e rede residual. Capacidades em unidades de fluxo; origem s, destino t. Fluxo máximo esperado: 23.",
  nodes: smallNodes.map(([id, x, y]) => ({
    id,
    name: id,
    x,
    y,
  })),
  edges: [
    ["s", "a", 16],
    ["s", "c", 13],
    ["a", "c", 10],
    ["c", "a", 4],
    ["a", "b", 12],
    ["b", "c", 9],
    ["c", "d", 14],
    ["d", "b", 7],
    ["b", "t", 20],
    ["d", "t", 4],
  ].map(([source, target, capacity], i) => ({
    id: `e${i + 1}`,
    source,
    target,
    capacity,
  })),
});
function residualNetwork(rows, columns, filename, name, description) {
  const nodes = [],
    edges = [];
  const id = (r, c) => {
    const index = r * columns + c;
    const count = rows * columns;
    if (index === 0) return "s";
    if (index === count - 1) return "t";
    if (count <= 20) return String.fromCharCode(97 + index - 1);
    return `v${String(index).padStart(2, "0")}`;
  };
  function edge(source, target, capacity) {
    edges.push({ id: `e${edges.length + 1}`, source, target, capacity });
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < columns; c++)
      nodes.push({
        id: id(r, c),
        name: id(r, c),
        x: 80 + c * 130,
        y: 70 + r * 110,
      });
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < columns; c++) {
      if (c + 1 < columns) {
        edge(id(r, c), id(r, c + 1), 15 + ((r * 7 + c * 11) % 26));
        edge(id(r, c + 1), id(r, c), 8 + ((r * 3 + c * 5) % 17));
      }
      if (r + 1 < rows) {
        edge(id(r, c), id(r + 1, c), 12 + ((r * 13 + c * 7) % 24));
        edge(id(r + 1, c), id(r, c), 6 + ((r * 5 + c * 3) % 19));
      }
      if (r + 1 < rows && c + 1 < columns && (r + c) % 2 === 0)
        edge(id(r, c), id(r + 1, c + 1), 5 + ((r + c) % 11));
    }
  write(filename, {
    name,
    description: `${description} Capacidades em unidades de fluxo. Origem s, destino t. A rede residual é calculada pelo algoritmo a cada execução.`,
    nodes,
    edges,
  });
}
residualNetwork(
  4,
  5,
  "02-medio",
  "Rede residual média · 20 nós",
  "Instância sintética média em topologia 4 × 5, com ciclos e rotas alternativas para testar caminhos aumentantes e cancelamento de fluxo.",
);
residualNetwork(
  10,
  10,
  "03-grande",
  "Rede residual grande · 100 nós",
  "Instância sintética grande em topologia 10 × 10, com 100 vértices e 401 arestas para testar o algoritmo em uma rede pouco prática de resolver manualmente.",
);
