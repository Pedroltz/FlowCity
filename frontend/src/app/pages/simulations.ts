import { ResilienceState } from "../resilience-state.service";
import { Resilience } from "../shared/resilience";
import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { WorkspaceState } from "../workspace-state.service";
import { GraphCanvas } from "../shared/graph-canvas";
import { ExecutionControls } from "../shared/execution-controls";
import { PathHistory } from "../shared/path-history";
@Component({
  standalone: true,
  imports: [
    Resilience,
    RouterLink,
    GraphCanvas,
    ExecutionControls,
    PathHistory,
  ],
  template: `
    <div class="page-heading">
      <div>
        <span class="eyebrow">MANUTENÇÃO DE REDES</span>
        <h1>Planejamento</h1>
        <p class="muted">
          {{ resilience.study()?.graph?.name ?? s.graph().name }} · acompanhe o
          fluxo, caminho por caminho.
        </p>
      </div>
      <a routerLink="/resultados" class="button secondary">Ver resultados ↗</a>
    </div>
    <fc-resilience />
    <details
      id="editable-network-analysis"
      class="panel padded legacy-simulation"
      [open]="!resilience.study()"
    >
      <summary>Simular rede editável · {{ s.graph().name }}</summary>
      <fieldset [disabled]="s.busy()">
        <fc-execution-controls /><fc-graph-canvas />
        @if (s.result(); as r) {
          <section class="panel padded path-player">
            <div class="section-heading">
              <div>
                <span class="eyebrow">CAMINHOS REGISTRADOS</span>
                <h2>
                  {{ r.iterations }} caminhos · fluxo máximo {{ r.maxFlow }}
                </h2>
              </div>
              <button class="button secondary" (click)="s.selectPath(null)">
                Limpar destaque
              </button>
            </div>
            <p class="muted">
              Selecione um caminho para destacá-lo em laranja no grafo. O fluxo
              exibido nas arestas é o resultado final.
            </p>
            <div class="actions wrap">
              @for (path of r.augmentingPaths; track path.iteration) {
                <button
                  class="path-chip"
                  [class.active]="s.activePath() === path.iteration"
                  [attr.aria-pressed]="s.activePath() === path.iteration"
                  (click)="s.selectPath(path.iteration)"
                >
                  {{ path.iteration }} · {{ path.nodes.join(" → ") }} · +{{
                    path.addedFlow
                  }}
                </button>
              } @empty {
                <p>
                  Não há caminho com capacidade positiva entre origem e destino.
                </p>
              }
            </div>
          </section>
          <fc-path-history />
        } @else {
          <section class="panel empty-state">
            <h2>Pronto para encontrar o fluxo?</h2>
            <p>
              Defina origem e destino e execute o cálculo. Os caminhos
              aumentantes aparecerão aqui.
            </p>
            <a routerLink="/editor">Editar a rede ↗</a>
          </section>
        }
      </fieldset>
    </details>
  `,
})
export class SimulationsPage {
  readonly resilience = inject(ResilienceState);
  readonly s = inject(WorkspaceState);
}
