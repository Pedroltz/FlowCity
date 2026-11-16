import { ResilienceState } from "../resilience-state.service";
import { ResilienceComparison } from "../shared/resilience-comparison";
import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { WorkspaceState } from "../workspace-state.service";
import { ResultSummary } from "../shared/result-summary";
import { PathHistory } from "../shared/path-history";
@Component({
  standalone: true,
  imports: [
    ResilienceComparison,
    CommonModule,
    RouterLink,
    ResultSummary,
    PathHistory,
  ],
  template: `
    <div class="page-heading">
      <div>
        <span class="eyebrow">ENTENDA SUA REDE</span>
        <h1>Resultados</h1>
        <p class="muted">
          {{
            resilience.result()
              ? resilience.study()?.graph?.name
              : s.graph().name
          }}
          · resumo da execução atual.
        </p>
      </div>
      <a routerLink="/simulacoes" class="button secondary"
        >Ajustar planejamento ↗</a
      >
    </div>
    @if (resilience.result()) {
      <section class="panel padded">
        <span class="eyebrow">ESTUDO DE RESILIÊNCIA</span>
        <h2>{{ resilience.study()?.graph?.name }}</h2>
        <p>
          Comparação preservada nesta sessão.
          {{ resilience.study()?.capacityPolicy }}
        </p>
      </section>
      <fc-resilience-comparison />
    }
    @if (s.result(); as r) {
      <h2>Resultado da rede editável: {{ s.graph().name }}</h2>
      <fc-result-summary />
      <section class="panel padded">
        <h2>Utilização das capacidades</h2>
        <p class="muted">
          Uma aresta saturada utiliza toda sua capacidade. Isso, isoladamente,
          não identifica um corte mínimo. A unidade depende da fonte da rede e
          está registrada na descrição.
        </p>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Aresta</th>
                <th scope="col">Fluxo / capacidade</th>
                <th scope="col">Utilização</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (e of r.edges; track e.id) {
                <tr>
                  <td>{{ e.source }} → {{ e.target }}</td>
                  <td>{{ e.flow }} / {{ e.capacity }}</td>
                  <td>
                    <div class="utilization">
                      <progress
                        [value]="e.flow"
                        [max]="e.capacity || 1"
                        [attr.aria-label]="
                          'Utilização de ' + e.source + ' para ' + e.target
                        "
                      ></progress
                      ><span>{{
                        e.capacity
                          ? (e.flow / e.capacity | percent: "1.0-1")
                          : "Não se aplica"
                      }}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      class="status-badge"
                      [class.saturated]="
                        e.capacity > 0 && e.flow === e.capacity
                      "
                      >{{
                        e.capacity === 0
                          ? "Sem capacidade"
                          : e.flow === e.capacity
                            ? "Saturada"
                            : e.flow > 0
                              ? "Em uso"
                              : "Sem fluxo"
                      }}</span
                    >
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
      <fc-path-history />
    } @else if (!resilience.result()) {
      <section class="panel empty-state">
        <span class="empty-symbol">↗</span>
        <h2>Seu próximo resultado começa com uma simulação.</h2>
        <p>
          Execute o algoritmo para analisar fluxo máximo, caminhos e
          capacidades. Resultados ficam disponíveis nesta sessão e são
          invalidados quando a rede é editada.
        </p>
        <a routerLink="/simulacoes" class="button">Ir para simulações</a>
      </section>
    }
  `,
})
export class ResultsPage {
  readonly resilience = inject(ResilienceState);
  readonly s = inject(WorkspaceState);
}
