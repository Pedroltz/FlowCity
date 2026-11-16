import { Component, inject, computed, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { WorkspaceState } from "../workspace-state.service";
import { NetworkActions } from "../shared/network-actions";
@Component({
  standalone: true,
  imports: [NetworkActions, RouterLink],
  template: `
    <div class="page-heading">
      <div>
        <span class="eyebrow">BIBLIOTECA</span>
        <h1>Minhas redes</h1>
        <p class="muted">Cada rede é uma nova oportunidade de explorar.</p>
      </div>
      <fc-network-actions />
    </div>
    <section class="panel padded case-library">
      <span class="eyebrow">ESTUDOS DE CASO · SNDLIB</span>
      <h2>Redes de telecomunicações</h2>
      <p>
        Abilene, Atlanta e TA2: topologias documentadas, capacidades e hipóteses
        explícitas. Os originais são imutáveis; crie cópias editáveis em
        Simulações.
      </p>
      <a class="button" routerLink="/simulacoes">Explorar benchmarks</a>
    </section>
    <div class="section-heading">
      <label class="search-field"
        >Buscar redes<input
          type="search"
          placeholder="Nome ou descrição…"
          [value]="search()"
          (input)="search.set($any($event.target).value)" /></label
      ><span class="muted">{{ s.networks().length }} redes salvas</span>
    </div>
    <div class="network-grid">
      @for (n of filtered(); track n.id) {
        <article
          class="panel network-card"
          [class.selected-card]="s.graph().id === n.id"
        >
          <div class="network-card-top">
            <span class="network-symbol">◇</span
            ><span class="subject-tag">Rede direcionada</span>
          </div>
          <h2>{{ n.name }}</h2>
          <p class="muted">{{ n.description || "Sem descrição." }}</p>
          <div class="network-counts">
            <span>{{ n.nodeCount }} vértices</span
            ><span>{{ n.edgeCount }} arestas</span>
          </div>
          <div class="actions">
            <button class="button" (click)="open(n.id)" [disabled]="s.busy()">
              Abrir no editor ↗</button
            ><button
              class="button secondary"
              (click)="select(n.id)"
              [disabled]="s.busy()"
            >
              Selecionar
            </button>
          </div>
        </article>
      } @empty {
        <div class="panel empty-state">
          <h2>
            {{
              s.busy()
                ? "Carregando redes…"
                : s.error()
                  ? "Não foi possível carregar as redes"
                  : "Nenhuma rede encontrada"
            }}
          </h2>
          <p>Crie uma rede, importe um JSON ou ajuste sua busca.</p>
        </div>
      }
    </div>
    <section class="panel padded selection-card">
      <div>
        <span class="eyebrow">REDE ATUAL</span>
        <h2>{{ s.graph().name }}</h2>
        <p class="muted">
          As ações de exportação e exclusão usam esta rede.
          {{ s.dirty() ? "Há alterações não salvas." : "" }}
        </p>
      </div>
      <div class="actions wrap">
        <a routerLink="/editor" class="button secondary">Editar rede</a
        ><button
          class="button danger"
          (click)="s.deleteGraph()"
          [disabled]="s.busy() || !s.graph().id"
        >
          Excluir rede atual
        </button>
      </div>
    </section>
  `,
})
export class NetworksPage {
  readonly s = inject(WorkspaceState);
  private router = inject(Router);
  search = signal("");
  filtered = computed(() =>
    this.s
      .networks()
      .filter((n) =>
        (n.name + " " + n.description)
          .toLocaleLowerCase()
          .includes(this.search().toLocaleLowerCase()),
      ),
  );
  async select(id: string) {
    await this.s.open(id);
  }
  async open(id: string) {
    if (await this.s.open(id)) await this.router.navigateByUrl("/editor");
  }
}
