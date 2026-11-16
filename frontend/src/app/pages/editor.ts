import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { WorkspaceState } from "../workspace-state.service";
import { GraphCanvas } from "../shared/graph-canvas";
import { EditorTools } from "../shared/editor-tools";
import { ExecutionControls } from "../shared/execution-controls";
@Component({
  standalone: true,
  imports: [RouterLink, GraphCanvas, EditorTools, ExecutionControls],
  template: `
    <div class="page-heading">
      <div>
        <span class="eyebrow">CONSTRUA E EXPLORE</span>
        <h1>{{ s.graph().name }}</h1>
        <p class="muted">
          {{ s.graph().nodes.length }} vértices ·
          {{ s.graph().edges.length }} arestas
          <span class="unsaved" [hidden]="!s.dirty()"
            >· Alterações não salvas</span
          >
        </p>
      </div>
      <div class="actions wrap">
        <button class="button" (click)="s.saveClick()" [disabled]="s.busy()">
          Salvar rede</button
        ><a class="button secondary" routerLink="/simulacoes">Simular ↗</a>
      </div>
    </div>
    <fieldset [disabled]="s.busy()">
      <fc-graph-canvas /><fc-editor-tools />
      <details class="panel padded">
        <summary>Selecionar vértice ou aresta por lista</summary>
        <div class="selection-lists">
          <div>
            <h3>Vértices</h3>
            @for (n of s.graph().nodes; track n.id) {
              <button class="list-select" (click)="s.selectNode(n.id)">
                {{ n.id }} · {{ n.name }}
              </button>
            } @empty {
              <p class="muted">Nenhum vértice.</p>
            }
          </div>
          <div>
            <h3>Arestas</h3>
            @for (e of s.graph().edges; track e.id) {
              <button class="list-select" (click)="s.selectEdge(e.id)">
                {{ e.source }} → {{ e.target }} · capacidade {{ e.capacity }}
              </button>
            } @empty {
              <p class="muted">Nenhuma aresta.</p>
            }
          </div>
        </div>
      </details>
      <fc-execution-controls />
    </fieldset>
  `,
})
export class EditorPage {
  readonly s = inject(WorkspaceState);
}
