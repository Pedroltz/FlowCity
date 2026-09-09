import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  signal,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatExpansionModule } from "@angular/material/expansion";
import cytoscape, { Core, ElementDefinition } from "cytoscape";
import {
  Graph,
  GraphEdge,
  GraphNode,
  GraphSummary,
  MaxFlowResult,
} from "./models";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatExpansionModule,
  ],
  templateUrl: "./app.component.html",
})
export class AppComponent implements AfterViewInit, OnDestroy {
  private http = inject(HttpClient);
  @ViewChild("canvas") canvas!: ElementRef<HTMLDivElement>;
  private cy?: Core;
  private resizeObserver?: ResizeObserver;
  networks = signal<GraphSummary[]>([]);
  graph = signal<Graph>({
    name: "Nova rede",
    description: "",
    nodes: [],
    edges: [],
  });
  result = signal<MaxFlowResult | null>(null);
  busy = signal(false);
  dirty = signal(false);
  message = signal("");
  error = signal("");
  mode: "original" | "flow" | "residual" = "original";
  source = "";
  sink = "";
  nodeId = "";
  nodeName = "";
  edgeSource = "";
  edgeTarget = "";
  capacity = 10;
  selectedNode = signal<GraphNode | null>(null);
  selectedEdge = signal<GraphEdge | null>(null);
  editName = "";
  editCapacity = 0;
  ngAfterViewInit() {
    this.cy = cytoscape({
      container: this.canvas.nativeElement,
      elements: [],
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#466776",
            label: "data(label)",
            color: "#203a48",
            "font-size": 11,
            "text-valign": "bottom",
            "text-margin-y": 8,
            width: 28,
            height: 28,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#adbec5",
            "target-arrow-color": "#adbec5",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": 10,
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.9,
            "text-background-padding": "3px",
          },
        },
        {
          selector: ".used",
          style: {
            "line-color": "#16876e",
            "target-arrow-color": "#16876e",
            width: 4,
          },
        },
        {
          selector: ".reverse",
          style: {
            "line-style": "dashed",
            "line-color": "#b87828",
            "target-arrow-color": "#b87828",
          },
        },
        {
          selector: ".endpoint",
          style: {
            "background-color": "#16876e",
            "border-width": 3,
            "border-color": "#a9e9d8",
          },
        },
        {
          selector: ":selected",
          style: {
            "border-width": 4,
            "border-color": "#e0a53a",
            "line-color": "#e0a53a",
            "target-arrow-color": "#e0a53a",
          },
        },
      ],
    });
    this.cy.on("tap", "node", (event) => {
      const n = this.graph().nodes.find(
        (n) => n.id === event.target.data("originalId"),
      )!;
      this.selectedNode.set(n);
      this.selectedEdge.set(null);
      this.editName = n.name;
    });
    this.cy.on("tap", "edge", (event) => {
      const e = this.graph().edges.find(
        (e) => e.id === event.target.data("originalId"),
      )!;
      this.selectedEdge.set(e);
      this.selectedNode.set(null);
      this.editCapacity = e.capacity;
    });
    this.cy.on("dragfree", "node", (event) => {
      const n = this.graph().nodes.find(
        (n) => n.id === event.target.data("originalId"),
      )!;
      const pos = event.target.position();
      n.x = pos.x;
      n.y = pos.y;
      this.dirty.set(true);
    });
    this.resizeObserver = new ResizeObserver(() => {
      this.cy?.resize();
      this.fit();
    });
    this.resizeObserver.observe(this.canvas.nativeElement);
    void this.run(async () => {
      await this.refresh();
      if (this.networks().length) await this.load(this.networks()[0].id);
    });
  }
  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.cy?.destroy();
  }
  async run(action: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    this.message.set("");
    try {
      await action();
    } catch (e) {
      this.error.set(
        e instanceof HttpErrorResponse
          ? (e.error?.detail ??
              e.error?.title ??
              "Não foi possível acessar a API. Verifique se o backend está em execução.")
          : e instanceof Error
            ? e.message
            : "Falha na operação.",
      );
    } finally {
      this.busy.set(false);
    }
  }
  async refresh() {
    this.networks.set(
      await firstValueFrom(this.http.get<GraphSummary[]>("/api/graphs")),
    );
  }
  async load(id: string) {
    const graph = await firstValueFrom(
      this.http.get<Graph>(`/api/graphs/${id}`),
    );
    this.setGraph(graph);
    this.dirty.set(false);
  }
  open(id: string) {
    if (this.allowDiscard()) void this.run(() => this.load(id));
  }
  allowDiscard() {
    return !this.dirty() || confirm("Descartar alterações não salvas?");
  }
  setGraph(graph: Graph) {
    this.graph.set(graph);
    this.result.set(null);
    this.mode = "original";
    this.selectedNode.set(null);
    this.selectedEdge.set(null);
    const ordered = [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id));
    this.source = graph.nodes.some((n) => n.id === "S")
      ? "S"
      : (ordered[0]?.id ?? "");
    this.sink = graph.nodes.some((n) => n.id === "T")
      ? "T"
      : (ordered.at(-1)?.id ?? "");
    this.edgeSource = this.source;
    this.edgeTarget = this.sink;
    this.draw(true);
  }
  newGraph() {
    if (this.allowDiscard()) {
      this.setGraph({
        name: "Nova rede",
        description: "",
        nodes: [],
        edges: [],
      });
      this.dirty.set(true);
    }
  }
  changed(redraw = true) {
    const hadResult = !!this.result();
    this.dirty.set(true);
    this.result.set(null);
    this.message.set("");
    this.mode = "original";
    if (redraw || hadResult) this.draw();
  }
  async save() {
    const g = this.graph();
    const saved = await firstValueFrom(
      g.id
        ? this.http.put<Graph>(`/api/graphs/${g.id}`, g)
        : this.http.post<Graph>("/api/graphs", g),
    );
    const nodeId = this.selectedNode()?.id,
      edgeId = this.selectedEdge()?.id;
    this.graph.set(saved);
    this.selectedNode.set(saved.nodes.find((n) => n.id === nodeId) ?? null);
    this.selectedEdge.set(saved.edges.find((e) => e.id === edgeId) ?? null);
    this.dirty.set(false);
    await this.refresh();
    this.message.set("Rede salva.");
  }
  saveClick() {
    void this.run(() => this.save());
  }
  deleteGraph() {
    const id = this.graph().id;
    if (id && confirm(`Excluir a rede “${this.graph().name}”?`))
      void this.run(async () => {
        await firstValueFrom(this.http.delete(`/api/graphs/${id}`));
        await this.refresh();
        this.setGraph({
          name: "Nova rede",
          description: "",
          nodes: [],
          edges: [],
        });
        this.dirty.set(false);
      });
  }
  addNode() {
    const id = this.nodeId.trim();
    if (
      !id ||
      !this.nodeName.trim() ||
      this.graph().nodes.some((n) => n.id === id)
    ) {
      this.error.set("Informe um ID único e um nome para o vértice.");
      return;
    }
    this.graph().nodes.push({
      id,
      name: this.nodeName.trim(),
      x: 80 + (this.graph().nodes.length % 6) * 130,
      y: 80 + Math.floor(this.graph().nodes.length / 6) * 100,
    });
    this.nodeId = "";
    this.nodeName = "";
    this.error.set("");
    this.changed();
  }
  validCapacity(value: number) {
    return Number.isInteger(value) && value >= 0 && value <= 2147483647;
  }
  addEdge() {
    if (
      !this.graph().nodes.some((n) => n.id === this.edgeSource) ||
      !this.graph().nodes.some((n) => n.id === this.edgeTarget) ||
      !this.validCapacity(this.capacity)
    ) {
      this.error.set(
        "Escolha os extremos e uma capacidade inteira entre 0 e 2147483647.",
      );
      return;
    }
    this.graph().edges.push({
      id: crypto.randomUUID(),
      source: this.edgeSource,
      target: this.edgeTarget,
      capacity: this.capacity,
      flow: 0,
    });
    this.error.set("");
    this.changed();
  }
  applySelection() {
    const node = this.selectedNode(),
      edge = this.selectedEdge();
    if (node) {
      if (!this.editName.trim()) {
        this.error.set("Informe o nome do vértice.");
        return;
      }
      node.name = this.editName.trim();
    }
    if (edge) {
      if (!this.validCapacity(this.editCapacity)) {
        this.error.set("Capacidade inteira inválida.");
        return;
      }
      edge.capacity = this.editCapacity;
    }
    this.error.set("");
    this.changed();
  }
  removeSelection() {
    const n = this.selectedNode(),
      e = this.selectedEdge();
    if (n && !confirm("Remover o vértice e todas as vias incidentes?")) return;
    if (n) {
      this.graph().nodes = this.graph().nodes.filter((x) => x.id !== n.id);
      this.graph().edges = this.graph().edges.filter(
        (x) => x.source !== n.id && x.target !== n.id,
      );
    }
    if (e) this.graph().edges = this.graph().edges.filter((x) => x.id !== e.id);
    this.selectedNode.set(null);
    this.selectedEdge.set(null);
    this.changed();
  }
  calculate() {
    void this.run(async () => {
      if (!this.source || !this.sink || this.source === this.sink)
        throw new Error("Selecione origem e destino distintos.");
      this.result.set(null);
      this.mode = "original";
      this.draw();
      if (this.dirty() || !this.graph().id) await this.save();
      this.result.set(
        await firstValueFrom(
          this.http.post<MaxFlowResult>(
            `/api/graphs/${this.graph().id}/max-flow`,
            { source: this.source, sink: this.sink },
          ),
        ),
      );
      this.mode = "flow";
      this.draw();
      this.message.set("Cálculo concluído.");
    });
  }
  endpointsChanged() {
    this.result.set(null);
    this.mode = "original";
    this.draw();
  }
  draw(fit = false) {
    if (!this.cy) return;
    const g = this.graph(),
      result = this.result();
    const elements: ElementDefinition[] = g.nodes.map((n) => ({
      data: { id: `n:${n.id}`, originalId: n.id, label: `${n.id} · ${n.name}` },
      position: { x: n.x, y: n.y },
      classes: n.id === this.source || n.id === this.sink ? "endpoint" : "",
    }));
    if (this.mode === "residual" && result) {
      elements.push(
        ...result.residualNetwork
          .filter((e) => e.residualCapacity > 0)
          .map((e) => ({
            data: {
              id: `r:${e.id}`,
              originalId: e.originalEdgeId,
              source: `n:${e.source}`,
              target: `n:${e.target}`,
              label: String(e.residualCapacity),
            },
            classes: e.isReverse ? "reverse" : "",
          })),
      );
    } else {
      const flows = new Map(result?.edges.map((e) => [e.id, e.flow]));
      elements.push(
        ...g.edges.map((e) => ({
          data: {
            id: `e:${e.id}`,
            originalId: e.id,
            source: `n:${e.source}`,
            target: `n:${e.target}`,
            label:
              this.mode === "flow"
                ? `${flows.get(e.id) ?? 0} / ${e.capacity}`
                : String(e.capacity),
          },
          classes:
            this.mode === "flow" && (flows.get(e.id) ?? 0) > 0 ? "used" : "",
        })),
      );
    }
    this.cy.elements().remove();
    this.cy.add(elements);
    if (fit) {
      const positions = new Set(g.nodes.map((n) => `${n.x},${n.y}`));
      if (positions.size < 2 && g.nodes.length > 1) this.layout();
      else this.cy.fit(undefined, 45);
    }
  }
  layout() {
    this.cy
      ?.layout({
        name: "breadthfirst",
        directed: true,
        padding: 45,
        spacingFactor: 1.3,
        animate: false,
      })
      .run();
    this.cy?.nodes().forEach((el) => {
      const n = this.graph().nodes.find((n) => n.id === el.data("originalId"))!;
      n.x = el.position("x");
      n.y = el.position("y");
    });
    this.dirty.set(true);
  }
  fit() {
    this.cy?.fit(undefined, 45);
  }
  exportGraph() {
    const { id, ...graph } = this.graph();
    const blob = new Blob([JSON.stringify(graph, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flowcity-rede.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  importGraph(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = "";
    if (!file || !this.allowDiscard()) return;
    void this.run(async () => {
      if (file.size > 2_000_000) throw new Error("O JSON deve ter até 2 MB.");
      const raw = JSON.parse(await file.text());
      if (!raw || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges))
        throw new Error("JSON inválido: informe nodes e edges.");
      // A API valida todo o documento antes de persistir. Importação sempre cria uma nova rede.
      const graph = await firstValueFrom(
        this.http.post<Graph>("/api/graphs", raw),
      );
      this.setGraph(graph);
      this.dirty.set(false);
      await this.refresh();
      this.message.set("Rede importada e salva.");
    });
  }
}
