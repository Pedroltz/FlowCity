import { Component, inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { WorkspaceState } from "../workspace-state.service";
import { AfterViewInit, OnDestroy, ViewChild, ElementRef } from "@angular/core";
@Component({
  selector: "fc-graph-canvas",
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: "./graph-canvas.html",
})
export class GraphCanvas implements AfterViewInit, OnDestroy {
  readonly s = inject(WorkspaceState);
  @ViewChild("canvas") canvas!: ElementRef<HTMLDivElement>;
  ngAfterViewInit() {
    this.s.attachCanvas(this.canvas.nativeElement);
  }
  ngOnDestroy() {
    this.s.detachCanvas();
  }
}
