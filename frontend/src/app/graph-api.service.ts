import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { Graph, GraphSummary, MaxFlowResult } from "./models";

@Injectable({ providedIn: "root" })
export class GraphApi {
  private http = inject(HttpClient);
  list() {
    return firstValueFrom(this.http.get<GraphSummary[]>("/api/graphs"));
  }
  get(id: string) {
    return firstValueFrom(this.http.get<Graph>(`/api/graphs/${id}`));
  }
  save(graph: Graph) {
    return firstValueFrom(
      graph.id
        ? this.http.put<Graph>(`/api/graphs/${graph.id}`, graph)
        : this.http.post<Graph>("/api/graphs", graph),
    );
  }
  delete(id: string) {
    return firstValueFrom(this.http.delete(`/api/graphs/${id}`));
  }
  import(document: unknown) {
    return firstValueFrom(this.http.post<Graph>("/api/graphs", document));
  }
  calculate(id: string, source: string, sink: string) {
    return firstValueFrom(
      this.http.post<MaxFlowResult>(`/api/graphs/${id}/max-flow`, {
        source,
        sink,
      }),
    );
  }
}
