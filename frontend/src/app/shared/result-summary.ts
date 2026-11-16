import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { WorkspaceState } from "../workspace-state.service";
@Component({
  selector: "fc-result-summary",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./result-summary.html",
})
export class ResultSummary {
  readonly s = inject(WorkspaceState);
}
