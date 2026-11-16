import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { WorkspaceState } from "../workspace-state.service";
@Component({
  selector: "fc-execution-controls",
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: "./execution-controls.html",
})
export class ExecutionControls {
  readonly s = inject(WorkspaceState);
}
