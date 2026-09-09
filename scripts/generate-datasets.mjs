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
const names = {
  S: "Entrada norte",
  A: "Praça central",
  C: "Anel oeste",
  B: "Distrito comercial",
  D: "Terminal leste",
  T: "Saída sul",
};
write("01-pequeno", {
  name: "Centro · 6 cruzamentos",
  description:
    "Simulação didática de dois corredores urbanos com conexões transversais. Capacidades em veículos/minuto; origem S, destino T. Fluxo esperado: 23.",
  nodes: Object.entries(names).map(([id, name], i) => ({
    id,
    name,
    x: 80 + Math.floor((i + 1) / 2) * 170,
    y: i === 0 || i === 5 ? 180 : i % 2 ? 80 : 280,
  })),
  edges: [
    ["S", "A", 16],
    ["S", "C", 13],
    ["A", "C", 10],
    ["C", "A", 4],
    ["A", "B", 12],
    ["B", "C", 9],
    ["C", "D", 14],
    ["D", "B", 7],
    ["B", "T", 20],
    ["D", "T", 4],
  ].map(([source, target, capacity], i) => ({
    id: `e${i + 1}`,
    source,
    target,
    capacity,
  })),
});
function grid(rows, columns, filename, name) {
  const nodes = [],
    edges = [];
  const id = (r, c) => `N${String(r * columns + c + 1).padStart(3, "0")}`;
  function edge(source, target, capacity) {
    edges.push({ id: `e${edges.length + 1}`, source, target, capacity });
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < columns; c++)
      nodes.push({
        id: id(r, c),
        name: `Cruzamento ${r + 1}.${c + 1}`,
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
    description: `Malha urbana sintética ${rows} × ${columns}, com vias de mão dupla modeladas como arestas independentes e ligações diagonais. Capacidades simuladas em veículos/minuto. Origem ${nodes[0].id}, destino ${nodes.at(-1).id}.`,
    nodes,
    edges,
  });
}
grid(4, 5, "02-medio", "Bairros · 20 cruzamentos");
grid(10, 10, "03-grande", "Malha urbana · 100 cruzamentos");
