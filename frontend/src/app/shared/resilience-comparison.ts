import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ResilienceState } from "../resilience-state.service";
import { StudyCanvas } from "./study-canvas";
@Component({
  selector: "fc-resilience-comparison",
  standalone: true,
  imports: [CommonModule, StudyCanvas],
  template: `
    @if (state.study(); as study) {
      <section
        class="resilience-comparison"
        aria-label="Resultado do planejamento"
      >
        @if (state.result(); as comparison) {
          @if (state.requiredCapacity(); as required) {
            @if (state.validRequirement()) {
              <section
                class="maintenance-verdict"
                [class.capacity-deficit]="
                  comparison.scenario.maxFlow < required
                "
                role="status"
              >
                <span class="eyebrow">RESULTADO DO PLANEJAMENTO</span>
                <h2>
                  {{
                    comparison.scenario.maxFlow >= required
                      ? "Capacidade suficiente no modelo analisado"
                      : "Capacidade insuficiente durante a manutenção"
                  }}
                </h2>
                <p>
                  Durante a intervenção, a rede oferece
                  <strong>{{ comparison.scenario.maxFlow | number }} </strong>
                  para uma necessidade de
                  <strong>{{ required | number }}</strong> {{ study.unit }}.
                </p>
                <p class="verdict-detail">
                  {{
                    comparison.scenario.maxFlow >= required
                      ? "Margem de capacidade:"
                      : "Déficit de capacidade:"
                  }}
                  <strong>{{
                    (comparison.scenario.maxFlow >= required
                      ? comparison.scenario.maxFlow - required
                      : required - comparison.scenario.maxFlow
                    ) | number
                  }}</strong>
                  {{ study.unit }}.
                </p>
                @if (comparison.baseline.maxFlow < required) {
                  <p>A rede original já não atende à necessidade informada.</p>
                }
                <small
                  >Limite teórico para este par de pontos. Confirme as condições
                  de roteamento e o tráfego concorrente antes da
                  intervenção.</small
                >
              </section>
            }
          }
          <div class="stats-grid">
            <article class="stat-card">
              Antes da manutenção<strong data-testid="baseline-flow">{{
                comparison.baseline.maxFlow
              }}</strong>
            </article>
            <article class="stat-card">
              Durante a manutenção<strong data-testid="scenario-flow">{{
                comparison.scenario.maxFlow
              }}</strong>
            </article>
            <article class="stat-card">
              Capacidade perdida<strong>{{ comparison.lostCapacity }}</strong>
            </article>
            <article class="stat-card">
              Perda percentual<strong>{{
                comparison.lossPercent === null
                  ? "Não se aplica"
                  : (comparison.lossPercent | number: "1.0-2") + "%"
              }}</strong>
            </article>
          </div>
          <p>
            {{ study.unit }} · {{ state.source }} → {{ state.sink }} ·
            {{ state.failed().length }} enlaces físicos indisponíveis.
          </p>
          @if (
            state.failed().length > 0 &&
            comparison.baseline.maxFlow > 0 &&
            comparison.scenario.maxFlow === comparison.baseline.maxFlow
          ) {
            <p class="alert success" role="status" data-testid="rerouted-flow">
              As conexões selecionadas foram retiradas. Rotas alternativas
              mantiveram a capacidade total entre os pontos.
            </p>
          }
          @if (comparison.scenario.maxFlow === 0) {
            <p role="status">
              Não existe caminho com capacidade positiva entre os extremos no
              cenário com falhas.
            </p>
          }
        }
        <div class="graph-panel panel">
          <div class="graph-toolbar actions wrap">
            <button
              class="button secondary"
              (click)="state.selectView('baseline')"
              [attr.aria-pressed]="state.view() === 'baseline'"
            >
              Antes da manutenção</button
            ><button
              class="button secondary"
              (click)="state.selectView('scenario')"
              [attr.aria-pressed]="state.view() === 'scenario'"
            >
              Durante a manutenção
            </button>
          </div>
          <fc-study-canvas />
          <p class="legend">
            Violeta: fluxo utilizado · Vermelho tracejado: falha · Azul: corte
            mínimo · Laranja: caminho selecionado. Fluxos exibidos são os
            valores finais do cenário.
          </p>
        </div>
        @if (state.result(); as comparison) {
          @let r =
            state.view() === "baseline"
              ? comparison.baseline
              : comparison.scenario;
          @let cut =
            state.view() === "baseline"
              ? comparison.baselineCut
              : comparison.scenarioCut;
          <details class="technical-details panel padded">
            <summary>Entender o cálculo e consultar detalhes técnicos</summary>
            <div class="actions wrap technical-controls">
              <button
                class="button secondary"
                (click)="state.mode.set('flow'); state.path.set(null)"
                [attr.aria-pressed]="state.mode() === 'flow'"
              >
                Fluxo nos enlaces</button
              ><button
                class="button secondary"
                (click)="state.mode.set('residual'); state.path.set(null)"
                [disabled]="!state.result()"
                [attr.aria-pressed]="state.mode() === 'residual'"
              >
                Residual do benchmark
              </button>
            </div>
            <section class="panel padded">
              <h2>
                Corte mínimo ·
                {{ state.view() === "baseline" ? "original" : "com falhas" }}
              </h2>
              <p>
                Capacidade do corte: <strong>{{ cut.capacity }}</strong> · Fluxo
                máximo: <strong>{{ r.maxFlow }}</strong>.
              </p>
              <p class="muted">
                O corte separa os vértices alcançáveis da origem no residual
                final dos demais. Arestas saturadas isoladas não definem um
                corte.
              </p>
              <p>Alcançáveis: {{ cut.reachable.join(", ") }}</p>
              <ul>
                @for (e of cut.edges; track e.id) {
                  <li>
                    {{ e.source }} → {{ e.target }} · capacidade
                    {{ e.capacity }} · {{ e.id }}
                  </li>
                } @empty {
                  <li>Nenhuma aresta atravessa o corte; capacidade zero.</li>
                }
              </ul>
            </section>
            <section class="panel padded">
              <h2>Caminhos aumentantes do benchmark</h2>
              <p>
                {{ r.iterations }} caminhos ·
                {{ r.executionTimeMs | number: "1.3-3" }} ms. Selecione um
                caminho para ver sua direção no grafo; trechos reversos cancelam
                fluxo.
              </p>
              <button class="button secondary" (click)="state.path.set(null)">
                Limpar caminho do benchmark
              </button>
              <div class="actions wrap">
                @for (p of r.augmentingPaths; track p.iteration) {
                  <button
                    class="path-chip"
                    [attr.aria-pressed]="state.path() === p.iteration"
                    (click)="state.path.set(p.iteration)"
                  >
                    {{ p.iteration }} · {{ p.nodes.join(" → ") }} · gargalo
                    {{ p.bottleneck }}
                  </button>
                } @empty {
                  <p>Nenhum caminho aumentante.</p>
                }
              </div>
            </section>
            <section class="panel padded">
              <h2>Fluxos e utilização do benchmark</h2>
              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Enlace direcionado</th>
                      <th scope="col">Fluxo</th>
                      <th scope="col">Capacidade</th>
                      <th scope="col">Utilização</th>
                      <th scope="col">Residual direto</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (e of r.edges; track e.id) {
                      <tr>
                        <td>
                          {{ e.source }} → {{ e.target }}
                          <small>{{ e.id }}</small>
                        </td>
                        <td>{{ e.flow }}</td>
                        <td>{{ e.capacity }}</td>
                        <td>
                          {{
                            e.capacity
                              ? (e.flow / e.capacity | percent: "1.0-1")
                              : "Não se aplica"
                          }}
                        </td>
                        <td>{{ e.residualCapacity }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          </details>
        }
      </section>
    }
  `,
})
export class ResilienceComparison {
  readonly state = inject(ResilienceState);
}
