import { GraphApi } from "../graph-api.service";
import { WorkspaceState } from "../workspace-state.service";
import { Router, RouterLink } from "@angular/router";
import { Component, inject, OnInit } from "@angular/core";

import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";

import { ResilienceState } from "../resilience-state.service";
import { ResilienceComparison } from "./resilience-comparison";
@Component({
  selector: "fc-resilience",
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink, ResilienceComparison],
  template: ` <section class="panel maintenance-planner">
    <div class="planner-header">
      <div>
        <span class="eyebrow">PLANEJAMENTO DE MANUTENÇÃO</span>
        <h2>Planeje a intervenção. Entenda o impacto.</h2>
        <p class="muted">
          Confira a capacidade disponível entre dois pontos antes de retirar uma
          conexão de serviço.
        </p>
      </div>
      <span class="subject-tag">Análise de capacidade</span>
    </div>
    @if (state.error()) {
      <div class="alert error" role="alert">
        {{ state.error() }}
        <button
          class="button secondary"
          (click)="state.load()"
          [disabled]="state.busy()"
        >
          Tentar novamente
        </button>
      </div>
    }
    @if (state.busy()) {
      <p role="status" class="loading-bar">Preparando sua análise…</p>
    }
    <fieldset [disabled]="state.busy()">
      <section class="planner-step">
        <div class="step-number">1</div>
        <div class="step-content">
          <h3>Escolha a rede</h3>
          <p class="muted">
            Use uma topologia SNDlib ou uma rede própria salva em “Minhas
            redes”. A análise usa as capacidades cadastradas nessa rede.
          </p>
          <label
            >Rede para analisar<select
              aria-label="Rede para analisar"
              [ngModel]="
                state.study()
                  ? state.study()!.sourceType + ':' + state.study()!.id
                  : ''
              "
              (ngModelChange)="state.choose($event)"
            >
              <option value="">Selecione uma rede</option>
              <optgroup label="Minhas redes">
                @if (!state.networks().length) {
                  <option disabled>Nenhuma rede própria salva</option>
                }
                @for (network of state.networks(); track network.id) {
                  <option [value]="'custom:' + network.id">
                    {{ network.name }} · {{ network.nodeCount }} pontos
                  </option>
                }
              </optgroup>
              <optgroup label="Topologias SNDlib">
                @for (s of state.studies(); track s.id) {
                  <option [value]="'sndlib:' + s.id">
                    {{ s.graph.name }} · {{ s.graph.nodes.length }} pontos
                  </option>
                }
              </optgroup>
            </select></label
          >
          @if (!state.networks().length) {
            <p class="muted">
              Ainda não há redes próprias salvas.
              <a routerLink="/networks">Criar ou salvar uma em Minhas redes</a>.
            </p>
          }
          @if (state.study(); as s) {
            <details class="source-details">
              <summary>
                {{
                  s.sourceType === "custom"
                    ? "Sobre minha rede"
                    : "Sobre os dados desta rede"
                }}
              </summary>
              <p>{{ s.capacityPolicy }}</p>
              @if (s.sourceType === "sndlib") {
                <p>
                  Unidade: {{ s.unit }}.
                  <a [href]="s.sourceUrl" target="_blank" rel="noopener"
                    >Consultar fonte</a
                  >
                </p>
                <p>Revisão: {{ s.revision }}</p>
                <p>SHA-256: {{ s.sha256 }}</p>
                <button class="button secondary" (click)="copy()">
                  Criar cópia editável
                </button>
              } @else {
                <p>
                  Unidade: {{ s.unit }}. As capacidades vêm dos valores que você
                  cadastrou no editor.
                </p>
              }
            </details>
          }
        </div>
      </section>
      @if (state.study(); as s) {
        <section class="planner-step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3>Defina a comunicação necessária</h3>
            <p class="muted">
              Selecione os pontos que precisam continuar se comunicando durante
              a manutenção.
            </p>
            <div class="planner-fields">
              <label
                >Ponto de origem<select
                  aria-label="Origem"
                  [(ngModel)]="state.source"
                  (ngModelChange)="state.invalidate()"
                >
                  @for (n of s.graph.nodes; track n.id) {
                    <option [value]="n.id">{{ n.name }}</option>
                  }
                </select></label
              ><label
                >Ponto de destino<select
                  aria-label="Destino"
                  [(ngModel)]="state.sink"
                  (ngModelChange)="state.invalidate()"
                >
                  @for (n of s.graph.nodes; track n.id) {
                    <option [value]="n.id">{{ n.name }}</option>
                  }
                </select></label
              >
            </div>
            <label class="requirement-field"
              >Capacidade necessária
              <span class="muted">Opcional · {{ s.unit }}</span
              ><input
                type="number"
                min="0"
                step="any"
                placeholder="Informe a necessidade da operação"
                [ngModel]="state.requiredCapacity()"
                (ngModelChange)="state.requiredCapacity.set($event)"
                aria-label="Capacidade necessária"
                [attr.aria-invalid]="!state.validRequirement()"
                aria-describedby="requirement-help"
            /></label>
            <p id="requirement-help" class="muted">
              Use a mesma unidade da rede. Sem esse valor, mostraremos somente a
              mudança de capacidade.
            </p>
            @if (!state.validRequirement()) {
              <p class="field-error" role="alert">
                Informe uma capacidade maior que zero ou deixe o campo vazio.
              </p>
            }
            @if (state.source === state.sink) {
              <p class="field-error">Escolha dois pontos diferentes.</p>
            }
          </div>
        </section>
        <section class="planner-step">
          <div class="step-number">3</div>
          <div class="step-content">
            <div class="section-heading">
              <div>
                <h3>Selecione as conexões em manutenção</h3>
                <p class="muted">
                  @if (s.sourceType === "custom") {
                    Cada seleção interrompe somente a conexão direcionada
                    exibida. Se houver uma conexão de volta, selecione-a
                    separadamente.
                  } @else {
                    Cada seleção desativa o enlace no sentido indicado no
                    benchmark. Rotas alternativas podem manter a capacidade
                    total.
                  }
                </p>
              </div>
              <span class="selection-count"
                >{{ state.failed().length }} selecionadas</span
              >
            </div>
            <details class="maintenance-links">
              <summary>Escolher conexões para a manutenção</summary>
              <div class="link-options">
                @for (l of s.links; track l.id) {
                  <label
                    class="list-select"
                    [class.selected-link]="state.failed().includes(l.id)"
                    ><input
                      type="checkbox"
                      [attr.aria-label]="
                        l.source +
                        (l.directed ? ' → ' : ' ↔ ') +
                        l.target +
                        ' · ' +
                        l.id
                      "
                      [checked]="state.failed().includes(l.id)"
                      (change)="state.toggle(l.id)"
                    /><span
                      ><strong
                        >{{ l.source }} {{ l.directed ? "→" : "↔" }}
                        {{ l.target }}</strong
                      ><small>
                        @if (l.capacity !== undefined) {
                          Capacidade: {{ l.capacity }} ·
                        }
                        {{ l.id }}</small
                      ></span
                    ></label
                  >
                }
              </div>
            </details>
            @if (!state.failed().length) {
              <p class="muted">
                Nenhuma conexão selecionada. A análise usará a rede sem
                interrupções.
              </p>
            }
          </div>
        </section>
        <div class="planner-submit">
          <p class="muted">A rede original será preservada.</p>
          <button
            class="button"
            (click)="state.analyze()"
            [disabled]="
              !state.source ||
              !state.sink ||
              state.source === state.sink ||
              !state.validRequirement()
            "
          >
            Avaliar manutenção <span aria-hidden="true">↗</span>
          </button>
        </div>
        <fc-resilience-comparison />
      }
    </fieldset>
  </section>`,
})
export class Resilience implements OnInit {
  readonly state = inject(ResilienceState);
  private api = inject(GraphApi);
  private workspace = inject(WorkspaceState);
  private router = inject(Router);
  ngOnInit() {
    if (!this.state.studies().length) void this.state.load();
  }
  copy() {
    const study = this.state.study();
    if (
      !study ||
      this.state.busy() ||
      this.workspace.busy() ||
      !this.workspace.allowDiscard()
    )
      return;
    void this.state.perform(async () => {
      const graph = structuredClone(study.graph);
      graph.name += " · cópia editável";
      graph.description += ` Configuração modificável. Fonte: ${study.sourceUrl}; ${study.capacityPolicy}. Unidade: ${study.unit}.`;
      const saved = await this.api.save(graph);
      await this.workspace.refresh();
      await this.workspace.load(saved.id!);
      await this.router.navigateByUrl("/editor");
    });
  }
}
