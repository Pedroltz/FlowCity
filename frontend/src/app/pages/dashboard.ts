import { Component, inject, computed } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { CommonModule } from "@angular/common";
import { WorkspaceState } from "../workspace-state.service";
import { NetworkActions } from "../shared/network-actions";
@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, NetworkActions],
  template: `
    <div class="page-heading">
      <div>
        <span class="eyebrow">SEU ESPAÇO DE APRENDIZAGEM</span>
        <h1>Explore conexões.<br />Descubra possibilidades.</h1>
        <p class="muted">
          Construa redes e entenda como o fluxo encontra seu caminho.
        </p>
      </div>
      <span class="subject-tag">Teoria dos grafos</span>
    </div>
    <section class="hero">
      <div>
        <span class="eyebrow">LABORATÓRIO INTERATIVO</span>
        <h2>Grandes descobertas<br />começam com uma conexão.</h2>
        <p>
          Do primeiro vértice ao fluxo máximo.<br />Explore Ford-Fulkerson com
          busca em largura.
        </p>
        <a routerLink="/editor" class="button light"
          >Continuar no editor <span>↗</span></a
        >
      </div>
      <div class="hero-graph" aria-hidden="true">
        <svg viewBox="0 0 340 230">
          <path
            d="M45 115 145 40 285 115 145 195 45 115M145 40V195M45 115H285"
          />
          <g>
            <circle cx="45" cy="115" r="23" />
            <circle cx="145" cy="40" r="23" />
            <circle cx="145" cy="195" r="23" />
            <circle cx="285" cy="115" r="23" />
          </g>
          <g class="graph-letters">
            <text x="45" y="120">S</text>
            <text x="145" y="45">A</text>
            <text x="145" y="200">B</text>
            <text x="285" y="120">T</text>
          </g></svg
        ><span>Uma rede. Muitos caminhos.</span>
      </div>
    </section>
    <div class="stats-grid">
      <article class="stat-card">
        <span>Redes salvas</span
        ><strong>{{ s.networksLoaded() ? s.networks().length : "—" }}</strong
        ><small>Disponíveis no laboratório</small>
      </article>
      <article class="stat-card">
        <span>Vértices cadastrados</span
        ><strong>{{ s.networksLoaded() ? nodes() : "—" }}</strong
        ><small>Em todas as redes salvas</small>
      </article>
      <article class="stat-card">
        <span>Arestas cadastradas</span
        ><strong>{{ s.networksLoaded() ? edges() : "—" }}</strong
        ><small>Conexões direcionadas</small>
      </article>
      <article class="stat-card accent">
        <span>Último fluxo desta sessão</span
        ><strong>{{ s.result()?.maxFlow ?? "—" }}</strong
        ><small>{{
          s.result() ? s.graph().name : "Execute uma simulação para descobrir"
        }}</small>
      </article>
    </div>
    <div class="dashboard-grid">
      <section class="panel padded">
        <div class="section-heading">
          <h2>Suas redes</h2>
          <a routerLink="/redes">Ver todas ↗</a>
        </div>
        <p class="muted">Escolha uma rede e continue explorando.</p>
        <div class="network-list">
          @for (n of s.networks().slice(0, 4); track n.id) {
            <button
              class="network row-network"
              (click)="open(n.id)"
              [disabled]="s.busy()"
            >
              <span class="network-symbol">◇</span
              ><span
                ><strong>{{ n.name }}</strong
                ><small
                  >{{ n.nodeCount }} vértices · {{ n.edgeCount }} arestas</small
                ></span
              ><span class="row-arrow">↗</span>
            </button>
          } @empty {
            <p class="empty-state">
              {{
                s.busy()
                  ? "Carregando redes…"
                  : s.error()
                    ? "As redes não puderam ser carregadas."
                    : "Seu laboratório está pronto. Crie sua primeira rede."
              }}
            </p>
          }
        </div>
      </section>
      <section class="panel padded learning-card">
        <span class="eyebrow">APRENDA NA PRÁTICA</span>
        <h2>Como funciona?</h2>
        <ol class="learning-steps">
          <li>
            <strong>Construa sua rede</strong>
            <p>Adicione vértices, conecte arestas e defina capacidades.</p>
          </li>
          <li>
            <strong>Explore os caminhos</strong>
            <p>Acompanhe cada caminho aumentante encontrado por BFS.</p>
          </li>
          <li>
            <strong>Entenda o resultado</strong>
            <p>Compare fluxos, capacidades e a rede residual.</p>
          </li>
        </ol>
        <fc-network-actions />
      </section>
    </div>
  `,
})
export class DashboardPage {
  readonly s = inject(WorkspaceState);
  private router = inject(Router);
  nodes = computed(() =>
    this.s.networks().reduce((sum, n) => sum + n.nodeCount, 0),
  );
  edges = computed(() =>
    this.s.networks().reduce((sum, n) => sum + n.edgeCount, 0),
  );
  async open(id: string) {
    if (await this.s.open(id)) await this.router.navigateByUrl("/editor");
  }
}
