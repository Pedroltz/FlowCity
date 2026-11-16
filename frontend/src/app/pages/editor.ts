import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { WorkspaceState } from "../workspace-state.service";
import { ResilienceState } from "../resilience-state.service";
import { GraphCanvas } from "../shared/graph-canvas";
import { EditorTools } from "../shared/editor-tools";
import { ExecutionControls } from "../shared/execution-controls";
@Component({
  standalone: true,
  imports: [FormsModule, GraphCanvas, EditorTools, ExecutionControls],
  template: ` <div class="page-heading">
      <div>
        <span class="eyebrow">MONTE SUA REDE</span>
        <h1>{{ s.graph().name }}</h1>
        <p class="muted">
          {{ s.graph().nodes.length }} pontos ·
          {{ s.graph().edges.length }} conexões
          <span class="unsaved" [hidden]="!s.dirty()"
            >· Alterações não salvas</span
          >
        </p>
      </div>
      <div class="actions wrap">
        <button
          class="button secondary"
          (click)="s.saveClick()"
          [disabled]="s.busy()"
        >
          Salvar rede</button
        ><button
          class="button"
          (click)="continue()"
          [disabled]="
            s.busy() || resilience.busy() || s.graph().nodes.length < 2
          "
        >
          Analisar esta rede ↗
        </button>
      </div>
    </div>
    <fieldset [disabled]="s.busy()">
      <section class="panel editor-identity">
        <label
          >Nome da rede<input
            [(ngModel)]="s.graph().name"
            (ngModelChange)="s.changed(false)"
            maxlength="200"
            placeholder="Ex.: Rede da empresa" /></label
        ><label
          >Descrição e unidade de capacidade<input
            [(ngModel)]="s.graph().description"
            (ngModelChange)="s.changed(false)"
            maxlength="5000"
            placeholder="Descreva a rede e a unidade usada nas conexões"
        /></label>
      </section>
      <div class="editor-help">
        <strong
          >Você não precisa conhecer o algoritmo para montar a rede.</strong
        ><span
          >Adicione os locais, conecte-os e informe os limites das conexões. A
          análise de capacidade vem depois.</span
        >
      </div>
      <div class="editor-layout">
        <div class="editor-map"><fc-graph-canvas [editing]="true" /></div>
        <fc-editor-tools />
      </div>
      <details class="panel padded editor-calculation">
        <summary>Calcular a capacidade da rede (opcional)</summary>
        <p class="muted">
          Escolha quais pontos precisam se comunicar. O cálculo mostra o máximo
          que a rede permite transportar entre eles.
        </p>
        <fc-execution-controls />
      </details>
    </fieldset>`,
})
export class EditorPage {
  readonly s = inject(WorkspaceState);
  readonly resilience = inject(ResilienceState);
  private router = inject(Router);
  constructor() {
    this.s.mode = "original";
    this.s.activePath.set(null);
    this.s.draw();
  }
  async continue() {
    if (this.s.busy() || this.resilience.busy()) return;
    await this.s.run(async () => {
      if (this.s.dirty() || !this.s.graph().id) await this.s.save();
    });
    if (!this.s.error()) {
      this.resilience.choose("");
      await this.router.navigateByUrl("/simulacoes#editable-network-analysis");
    }
  }
}
