import { Injectable, inject, signal, computed } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { Graph, GraphEdge, GraphSummary, MaxFlowResult } from "./models";
import { GraphApi } from "./graph-api.service";
export interface Study {
  id: string;
  sourceType: "sndlib" | "custom";
  unit: string;
  sourceUrl: string;
  revision: string;
  sha256: string;
  capacityPolicy: string;
  graph: Graph;
  links: {
    id: string;
    source: string;
    target: string;
    edgeIds: string[];
    directed: boolean;
    capacity?: number;
  }[];
}
export interface MinimumCut {
  capacity: number;
  reachable: string[];
  edges: GraphEdge[];
}
export interface Comparison {
  baseline: MaxFlowResult;
  scenario: MaxFlowResult;
  lostCapacity: number;
  lossPercent: number | null;
  baselineCut: MinimumCut;
  scenarioCut: MinimumCut;
}
@Injectable({ providedIn: "root" })
export class ResilienceState {
  private http = inject(HttpClient);
  private graphApi = inject(GraphApi);
  studies = signal<Study[]>([]);
  networks = signal<GraphSummary[]>([]);
  study = signal<Study | null>(null);
  result = signal<Comparison | null>(null);
  busy = signal(false);
  error = signal("");
  failed = signal<string[]>([]);
  requiredCapacity = signal<number | null>(null);
  validRequirement = computed(
    () =>
      this.requiredCapacity() === null ||
      (Number.isFinite(this.requiredCapacity()) &&
        this.requiredCapacity()! > 0),
  );
  source = "";
  sink = "";
  view = signal<"baseline" | "scenario">("scenario");
  mode = signal<"flow" | "residual">("flow");
  path = signal<number | null>(null);
  async perform(action: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    try {
      await action();
    } catch (e) {
      this.error.set(
        e instanceof HttpErrorResponse
          ? (e.error?.detail ??
              "Não foi possível acessar as redes. Tente novamente.")
          : "Não foi possível concluir a operação.",
      );
    } finally {
      this.busy.set(false);
    }
  }
  load() {
    return this.perform(async () => {
      const [studies, networks] = await Promise.all([
        firstValueFrom(
          this.http.get<Omit<Study, "sourceType">[]>("/api/case-studies"),
        ),
        this.graphApi.list(),
      ]);
      this.studies.set(
        studies.map((study) => ({ ...study, sourceType: "sndlib" })),
      );
      this.networks.set(networks);
    });
  }
  choose(value: string) {
    if (this.busy()) return;
    if (value.startsWith("custom:")) {
      void this.chooseNetwork(value.slice("custom:".length));
      return;
    }
    const id = value.startsWith("sndlib:")
      ? value.slice("sndlib:".length)
      : value;
    const study = this.studies().find((s) => s.id === id) ?? null;
    this.study.set(study);
    this.requiredCapacity.set(null);
    this.view.set("scenario");
    this.mode.set("flow");
    this.failed.set([]);
    this.invalidate();
    this.setEndpoints(study?.graph);
  }
  private chooseNetwork(id: string) {
    return this.perform(async () => {
      const graph = await this.graphApi.get(id);
      const study: Study = {
        id,
        sourceType: "custom",
        unit: "unidades de capacidade",
        sourceUrl: "",
        revision: "Rede própria salva no LinkPlan",
        sha256: "",
        capacityPolicy:
          "As capacidades foram definidas por você na sua rede. O cenário de manutenção altera apenas uma cópia temporária para calcular o impacto.",
        graph,
        links: graph.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          edgeIds: [edge.id],
          directed: true,
          capacity: edge.capacity,
        })),
      };
      this.setStudy(study);
    });
  }
  private setStudy(study: Study | null) {
    this.study.set(study);
    this.requiredCapacity.set(null);
    this.view.set("scenario");
    this.mode.set("flow");
    this.failed.set([]);
    this.invalidate();
    this.setEndpoints(study?.graph);
  }
  private setEndpoints(graph: Graph | undefined) {
    const nodes = graph?.nodes ?? [];
    this.source =
      nodes.find((node) => node.id === "s")?.id ?? nodes[0]?.id ?? "";
    this.sink =
      nodes.find((node) => node.id === "t")?.id ?? nodes.at(-1)?.id ?? "";
  }
  endpointsVersion = signal(0);
  invalidate() {
    this.result.set(null);
    this.path.set(null);
    this.endpointsVersion.update((v) => v + 1);
  }
  toggle(id: string) {
    this.view.set("scenario");
    this.mode.set("flow");
    this.failed.update((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
    );
    this.invalidate();
  }
  selectView(view: "baseline" | "scenario") {
    this.view.set(view);
    this.path.set(null);
  }
  analyze() {
    const study = this.study();
    if (!study || this.busy() || !this.validRequirement()) return;
    this.invalidate();
    return this.perform(async () => {
      this.result.set(
        await firstValueFrom(
          this.http.post<Comparison>(
            study.sourceType === "custom"
              ? `/api/graphs/${study.id}/resilience`
              : `/api/case-studies/${study.id}/resilience`,
            {
              source: this.source,
              sink: this.sink,
              failedLinkIds: this.failed(),
            },
          ),
        ),
      );
      this.view.set("scenario");
      this.mode.set("flow");
    });
  }
}
