import { Injectable, inject, signal, computed } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { Graph, GraphEdge, MaxFlowResult } from "./models";
export interface Study {
  id: string;
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
  studies = signal<Study[]>([]);
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
              "Não foi possível acessar os estudos. Tente novamente.")
          : "Não foi possível concluir a operação.",
      );
    } finally {
      this.busy.set(false);
    }
  }
  load() {
    return this.perform(async () => {
      this.studies.set(
        await firstValueFrom(this.http.get<Study[]>("/api/case-studies")),
      );
    });
  }
  choose(id: string) {
    if (this.busy()) return;
    const study = this.studies().find((s) => s.id === id) ?? null;
    this.study.set(study);
    this.requiredCapacity.set(null);
    this.view.set("scenario");
    this.mode.set("flow");
    this.failed.set([]);
    this.invalidate();
    this.source = study?.graph.nodes[0]?.id ?? "";
    this.sink = study?.graph.nodes.at(-1)?.id ?? "";
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
            `/api/case-studies/${study.id}/resilience`,
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
