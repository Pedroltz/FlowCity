import { ThemeService } from "../theme.service";
import { applyGraphTheme } from "./graph-theme";
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
} from "@angular/core";
import cytoscape, { Core, ElementDefinition } from "cytoscape";
import { ResilienceState } from "../resilience-state.service";
@Component({
  selector: "fc-study-canvas",
  standalone: true,
  template: `<div
    #canvas
    class="graph-canvas study-canvas"
    role="img"
    aria-label="Rede de telecomunicações. Enlaces indisponíveis em vermelho tracejado; corte mínimo em azul; caminho selecionado em laranja. As tabelas abaixo apresentam os mesmos dados."
  ></div>`,
})
export class StudyCanvas implements AfterViewInit, OnDestroy {
  readonly state = inject(ResilienceState);
  private theme = inject(ThemeService);
  @ViewChild("canvas") canvas!: ElementRef<HTMLDivElement>;
  private previousStudy = "";
  private cy?: Core;
  private observer?: ResizeObserver;
  constructor() {
    effect(() => applyGraphTheme(this.cy, this.theme.dark()));
    effect(() => {
      this.state.study();
      this.state.result();
      this.state.view();
      this.state.mode();
      this.state.path();
      this.state.failed();
      this.state.endpointsVersion();
      this.draw();
    });
  }
  ngAfterViewInit() {
    this.cy = cytoscape({
      container: this.canvas.nativeElement,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "background-color": "#7561c9",
            "font-size": 11,
            "text-valign": "bottom",
            "text-margin-y": 7,
          },
        },
        {
          selector: "edge",
          style: {
            label: "data(label)",
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "line-color": "#aaa3bb",
            "target-arrow-color": "#aaa3bb",
            "font-size": 10,
            "text-background-color": "#fff",
            "text-background-opacity": 1,
          },
        },
        {
          selector: ".endpoint",
          style: { "border-width": 4, "border-color": "#c8bbf3" },
        },
        {
          selector: ".used",
          style: {
            "line-color": "#6550bf",
            "target-arrow-color": "#6550bf",
            width: 3,
          },
        },
        {
          selector: ".cut",
          style: {
            "line-color": "#326da9",
            "target-arrow-color": "#326da9",
            width: 5,
          },
        },
        { selector: ".reverse", style: { "line-style": "dashed" } },
        {
          selector: ".failed",
          style: {
            "line-color": "#b73348",
            "target-arrow-color": "#b73348",
            "line-style": "dashed",
            width: 3,
          },
        },
        {
          selector: ".highlight",
          style: {
            "line-color": "#bc7419",
            "target-arrow-color": "#bc7419",
            width: 6,
          },
        },
      ],
    });
    applyGraphTheme(this.cy, this.theme.dark());
    this.observer = new ResizeObserver(() => {
      this.cy?.resize();
      this.cy?.fit(undefined, 45);
    });
    this.observer.observe(this.canvas.nativeElement);
    this.draw();
  }
  private draw() {
    const s = this.state,
      study = s.study(),
      comparison = s.result(),
      view = s.view(),
      mode = s.mode(),
      iteration = s.path(),
      failed = s.failed();
    if (!this.cy || !study) return;
    const r = comparison?.[view],
      cut = comparison?.[view === "baseline" ? "baselineCut" : "scenarioCut"];
    const disabled = new Set(
      view === "scenario"
        ? study.links
            .filter((l) => failed.includes(l.id))
            .flatMap((l) => l.edgeIds)
        : [],
    );
    const cuts = new Set(cut?.edges.map((e) => e.id));
    const elements: ElementDefinition[] = study.graph.nodes.map((n) => ({
      data: { id: "n:" + n.id, label: n.name },
      position: { x: n.x, y: n.y },
      classes: n.id === s.source || n.id === s.sink ? "endpoint" : "",
    }));
    if (mode === "residual" && r) {
      elements.push(
        ...r.residualNetwork
          .filter((e) => e.residualCapacity > 0)
          .map((e) => ({
            data: {
              id: "r:" + e.id,
              source: "n:" + e.source,
              target: "n:" + e.target,
              label: String(e.residualCapacity),
            },
            classes: e.isReverse ? "reverse" : "",
          })),
      );
      elements.push(
        ...study.graph.edges
          .filter((e) => disabled.has(e.id))
          .map((e) => ({
            data: {
              id: "failed:" + e.id,
              source: "n:" + e.source,
              target: "n:" + e.target,
              label: "indisponível",
            },
            classes: "failed",
          })),
      );
    } else {
      const flows = new Map(r?.edges.map((e) => [e.id, e.flow]));
      elements.push(
        ...study.graph.edges.map((e) => ({
          data: {
            id: "e:" + e.id,
            source: "n:" + e.source,
            target: "n:" + e.target,
            label: disabled.has(e.id)
              ? "indisponível"
              : r
                ? `${flows.get(e.id) ?? 0} / ${e.capacity}`
                : String(e.capacity),
          },
          classes: [
            disabled.has(e.id) ? "failed" : "",
            (flows.get(e.id) ?? 0) > 0 ? "used" : "",
            cuts.has(e.id) ? "cut" : "",
          ].join(" "),
        })),
      );
    }
    const path = r?.augmentingPaths.find((p) => p.iteration === iteration);
    if (path)
      elements.push(
        ...path.edges.map((e, i) => ({
          data: {
            id: "path:" + i,
            source: "n:" + e.source,
            target: "n:" + e.target,
            label: e.isReverse ? "reversa" : "",
          },
          classes: e.isReverse ? "highlight reverse" : "highlight",
        })),
      );
    const first =
      this.cy.nodes().length === 0 || this.previousStudy !== study.id;
    this.previousStudy = study.id;
    this.cy.elements().remove();
    this.cy.add(elements);
    if (first) this.cy.fit(undefined, 45);
  }
  ngOnDestroy() {
    this.observer?.disconnect();
    this.cy?.destroy();
  }
}
