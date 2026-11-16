import { Component, inject } from "@angular/core";
import { MatExpansionModule } from "@angular/material/expansion";
import { WorkspaceState } from "../workspace-state.service";
@Component({
  selector: "fc-path-history",
  standalone: true,
  imports: [MatExpansionModule],
  templateUrl: "./path-history.html",
})
export class PathHistory {
  readonly s = inject(WorkspaceState);
}
