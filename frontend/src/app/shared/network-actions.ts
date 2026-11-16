import { Component, inject } from "@angular/core";
import { Router } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { WorkspaceState } from "../workspace-state.service";
@Component({
  selector: "fc-network-actions",
  standalone: true,
  imports: [MatButtonModule],
  template: ` <div class="actions wrap">
    <button mat-flat-button (click)="create()" [disabled]="s.busy()">
      + Nova rede
    </button>
    <button mat-stroked-button (click)="file.click()" [disabled]="s.busy()">
      Importar JSON
    </button>
    <button mat-button (click)="s.exportGraph()" [disabled]="s.busy()">
      Exportar JSON
    </button>
    <input
      #file
      type="file"
      accept=".json,application/json"
      hidden
      (change)="s.importGraph($event)"
    />
  </div>`,
})
export class NetworkActions {
  readonly s = inject(WorkspaceState);
  private router = inject(Router);
  create() {
    if (this.s.newGraph()) void this.router.navigateByUrl("/editor");
  }
}
